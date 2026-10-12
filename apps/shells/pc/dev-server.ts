import { readFile, stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";

import { workspacePageLibrarySourcePath } from "./src/local-dev-runtime";

export interface LocalRemoteRegistration {
  logicalName: string;
  packageName: string;
  manifestUrl: string;
  instanceId: string;
  pid: number;
  lastSeenAt: number;
}

export type LocalDevMode = "legacy-compat" | "g2-profile";

type ResolvedProfile = Record<string, unknown> & {
  platform?: Array<Record<string, unknown>>;
  client?: Array<Record<string, unknown>>;
  pageLibrary?: Array<Record<string, unknown>>;
  remotes?: Array<Record<string, unknown>>;
};

const PROFILE_GROUPS = ["platform", "client", "pageLibrary", "remotes"] as const;
const HEARTBEAT_TTL_MS = 15_000;

export interface LocalDevSource {
  logicalName: string;
  kind: (typeof PROFILE_GROUPS)[number];
  source: "workspace" | "local-remote" | "target-environment";
  entry?: string;
}
function assertResolvedProfile(value: unknown): asserts value is ResolvedProfile {
  if (!value || typeof value !== "object") throw new Error("target profile is not a JSON object");
  const profile = value as ResolvedProfile;
  for (const key of PROFILE_GROUPS) {
    if (profile[key] !== undefined && !Array.isArray(profile[key])) throw new Error(`target profile field "${key}" must be an array`);
  }
  if (!Array.isArray(profile.platform) || !Array.isArray(profile.remotes)) {
    throw new Error("target profile must contain platform and remotes arrays");
  }
}

export function overlayLocalRemotes(profile: ResolvedProfile, registrations: Iterable<LocalRemoteRegistration>): ResolvedProfile {
  const entries = new Map(Array.from(registrations, (item) => [item.logicalName, item.manifestUrl]));
  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => {
      if (!PROFILE_GROUPS.includes(key as (typeof PROFILE_GROUPS)[number]) || !Array.isArray(value)) return [key, value];
      return [
        key,
        value.map((item: Record<string, unknown>) => {
          const logicalName =
            typeof item.logicalName === "string" ? item.logicalName : typeof item.name === "string" ? item.name : undefined;
          const entry = logicalName ? entries.get(logicalName) : undefined;
          return entry ? { ...item, entry } : item;
        }),
      ];
    }),
  ) as ResolvedProfile;
}

export function selectRegisteredApplicationRemotes(
  profile: ResolvedProfile,
  registrations: Iterable<LocalRemoteRegistration>,
): ResolvedProfile {
  const items = Array.from(registrations);
  const names = new Set(items.map((item) => item.logicalName));
  const overlaid = overlayLocalRemotes(profile, items);
  const active = (item: Record<string, unknown>): boolean => {
    const name = typeof item.logicalName === "string" ? item.logicalName : item.name;
    return typeof name === "string" && names.has(name);
  };
  return {
    ...overlaid,
    // Legacy compatibility keeps the complete local inventory. Workspace loading is
    // decided lazily by local-dev-runtime, so no localhost manifest is fetched merely
    // because a Platform/Client occurs in this list.
    platform: overlaid.platform,
    client: overlaid.client,
    pageLibrary: (overlaid.pageLibrary ?? []).filter((item) => {
      const name = logicalNameOf(item);
      return (
        active(item) ||
        Boolean(name && workspacePageLibrarySourcePath(name, "pages", { mode: "legacy-compat", localRemoteNames: [...names] }))
      );
    }),
    remotes: (overlaid.remotes ?? []).filter(active),
  };
}

function logicalNameOf(item: Record<string, unknown>): string | undefined {
  return typeof item.logicalName === "string" ? item.logicalName : typeof item.name === "string" ? item.name : undefined;
}

export function resolveLocalDevSources(
  profile: ResolvedProfile,
  registrations: Iterable<LocalRemoteRegistration>,
  mode: LocalDevMode,
): LocalDevSource[] {
  const localNames = new Set(Array.from(registrations, (registration) => registration.logicalName));
  return PROFILE_GROUPS.flatMap((kind) =>
    (profile[kind] ?? []).flatMap((item) => {
      const logicalName = logicalNameOf(item);
      if (!logicalName) return [];
      const source = localNames.has(logicalName)
        ? "local-remote"
        : mode === "legacy-compat" && (kind === "platform" || kind === "client" || kind === "pageLibrary")
          ? "workspace"
          : "target-environment";
      return [{ logicalName, kind, source, ...(typeof item.entry === "string" ? { entry: item.entry } : {}) }];
    }),
  );
}

function isLoopback(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress;
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

/** 从 Host 头取出主机名；本机访问时返回 undefined，不做改写。 */
export function lanHostnameFromHostHeader(hostHeader: string | undefined): string | undefined {
  if (!hostHeader) {
    return undefined;
  }
  const hostname = hostHeader.trim().split(":")[0]?.toLowerCase();
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
    return undefined;
  }
  return hostname;
}

/**
 * 局域网访问时，把本机注册的 `localhost` / `127.0.0.1` Remote 地址改写成当前访问主机名，
 * 否则对端浏览器会把 localhost 解析成「那台电脑自己」。
 */
export function rewriteLoopbackUrlForLan(url: string, lanHostname: string | undefined): string {
  if (!lanHostname) {
    return url;
  }
  return url.replace(/^http:\/\/(localhost|127\.0\.0\.1)(?=:\d+)/u, `http://${lanHostname}`);
}

export function rewriteProfileEntriesForLan(
  profile: ResolvedProfile,
  lanHostname: string | undefined,
  registeredNames: ReadonlySet<string>,
): ResolvedProfile {
  if (!lanHostname) {
    return profile;
  }
  return Object.fromEntries(
    Object.entries(profile).map(([key, value]) => {
      if (!PROFILE_GROUPS.includes(key as (typeof PROFILE_GROUPS)[number]) || !Array.isArray(value)) {
        return [key, value];
      }
      return [
        key,
        value.map((item: Record<string, unknown>) => {
          const name = logicalNameOf(item);
          // 只改写本机已注册 Remote。Platform/Client 的 localhost 占位仍走 Shell workspace（/@fs），
          // 若改成局域网端口会指向未启动的 Vite，登录后 ensureClient 会误报成账号密码错误。
          if (!name || !registeredNames.has(name) || typeof item.entry !== "string") {
            return item;
          }
          return { ...item, entry: rewriteLoopbackUrlForLan(item.entry, lanHostname) };
        }),
      ];
    }),
  ) as ResolvedProfile;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(value));
}

export function createLocalDevState(options: {
  profileUrl: string;
  environmentName: string;
  apiTarget: string;
  mode: LocalDevMode;
  /** 显式允许局域网只读访问 `/__g2_dev`；写入（注册/注销 Remote）仍仅限本机。 */
  allowLan?: boolean;
}) {
  const allowLan = options.allowLan === true;
  const registrations = new Map<string, LocalRemoteRegistration>();
  const eventClients = new Set<ServerResponse>();
  let profilePromise: Promise<ResolvedProfile> | undefined;
  let localProfileMtimeMs: number | undefined;
  let profileRevision = 0;
  let announcedProfileRevision: number | undefined;

  function emitChanged(): void {
    for (const client of eventClients) client.write("event: changed\ndata: reload\n\n");
  }

  function prune(): void {
    const now = Date.now();
    let changed = false;
    for (const [name, registration] of registrations) {
      if (now - registration.lastSeenAt > HEARTBEAT_TTL_MS) {
        registrations.delete(name);
        changed = true;
      }
    }
    if (changed) emitChanged();
  }

  async function loadProfile(): Promise<ResolvedProfile> {
    let value: unknown;
    if (options.profileUrl.startsWith("/")) {
      value = JSON.parse(await readFile(options.profileUrl, "utf8"));
    } else {
      const response = await fetch(options.profileUrl, { signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`target profile returned HTTP ${response.status}: ${options.profileUrl}`);
      const body = await response.text();
      try {
        value = JSON.parse(body);
      } catch {
        throw new Error(
          `target profile did not return JSON (${response.headers.get("content-type") ?? "unknown content type"}): ${options.profileUrl}`,
        );
      }
    }
    assertResolvedProfile(value);
    return value;
  }

  async function fetchProfile(): Promise<ResolvedProfile> {
    if (!options.profileUrl.startsWith("/")) {
      profilePromise ??= loadProfile().catch((error) => {
        profilePromise = undefined;
        throw error;
      });
      return profilePromise;
    }

    // legacy-compat 的 Profile 是 shell.ts 在本地生成的文件。开发期间新增
    // Domain 后该文件会更新，不能让已启动的 Shell 永久持有旧快照。
    const mtimeMs = (await stat(options.profileUrl)).mtimeMs;
    if (!profilePromise || localProfileMtimeMs !== mtimeMs) {
      localProfileMtimeMs = mtimeMs;
      profilePromise = loadProfile().catch((error) => {
        profilePromise = undefined;
        throw error;
      });
      profileRevision += 1;
      // 首次读取是 Shell 引导的一部分，不应在五秒后额外刷新一次页面。
      announcedProfileRevision ??= profileRevision;
    }
    return profilePromise;
  }

  const pruneTimer = setInterval(() => {
    prune();
    // Profile 变化时让浏览器重新建立 composition，菜单、搜索和路由索引才会
    // 同步接纳刚生成的 Domain，而不是要求开发者按固定顺序重启服务。
    void fetchProfile()
      .then(() => {
        if (announcedProfileRevision !== profileRevision) {
          announcedProfileRevision = profileRevision;
          emitChanged();
        }
      })
      .catch(() => {
        // 写文件的瞬间可能暂时不是完整 JSON；下一次轮询重试即可。
      });
  }, 5_000);
  pruneTimer.unref();

  async function middleware(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const loopback = isLoopback(req);
    const lanHostname = allowLan && !loopback ? lanHostnameFromHostHeader(req.headers.host) : undefined;
    const registeredNames = new Set(Array.from(registrations.keys()));
    if (url.pathname === "/compositions/dev.resolved.json" && req.method === "GET") {
      try {
        const profile = await fetchProfile();
        const composed =
          options.mode === "legacy-compat"
            ? selectRegisteredApplicationRemotes(profile, registrations.values())
            : overlayLocalRemotes(profile, registrations.values());
        sendJson(res, 200, rewriteProfileEntriesForLan(composed, lanHostname, registeredNames));
      } catch (error) {
        sendJson(res, 502, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }
    if (!url.pathname.startsWith("/__g2_dev/")) {
      next();
      return;
    }
    // 读：本机始终可；局域网需显式 G2_DEV_ALLOW_LAN=1。写：永远只接受本机，避免局域网误注册 Remote。
    const isWrite =
      (url.pathname === "/__g2_dev/remotes" && req.method === "POST") ||
      (url.pathname.startsWith("/__g2_dev/remotes/") && req.method === "DELETE");
    if (isWrite ? !loopback : !loopback && !allowLan) {
      sendJson(res, 403, {
        error:
          allowLan && isWrite
            ? "local development write API only accepts loopback clients"
            : "local development API only accepts loopback clients; set G2_DEV_ALLOW_LAN=1 for LAN read access",
      });
      return;
    }
    if (url.pathname === "/__g2_dev/remotes" && req.method === "GET") {
      prune();
      try {
        const profile = await fetchProfile();
        sendJson(res, 200, {
          mode: options.mode,
          environmentName: options.environmentName,
          profileUrl: options.profileUrl,
          apiTarget: options.apiTarget,
          allowLan,
          remotes: Array.from(registrations.values()).map((item) => ({
            ...item,
            manifestUrl: rewriteLoopbackUrlForLan(item.manifestUrl, lanHostname),
          })),
          sources: resolveLocalDevSources(profile, registrations.values(), options.mode).map((item) => ({
            ...item,
            ...(typeof item.entry === "string" ? { entry: rewriteLoopbackUrlForLan(item.entry, lanHostname) } : {}),
          })),
        });
      } catch (error) {
        sendJson(res, 502, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }
    if (url.pathname === "/__g2_dev/remotes" && req.method === "POST") {
      try {
        const input = (await readJson(req)) as Partial<LocalRemoteRegistration>;
        if (!input.logicalName || !input.packageName || !input.manifestUrl || !input.instanceId || !input.pid) {
          sendJson(res, 400, { error: "invalid remote registration" });
          return;
        }
        const profile = await fetchProfile();
        const allowed = PROFILE_GROUPS.flatMap((key) => profile[key] ?? []).some((item) => {
          const candidate = typeof item.logicalName === "string" ? item.logicalName : item.name;
          return candidate === input.logicalName;
        });
        if (!allowed) {
          sendJson(res, 400, { error: `logicalName is not present in target profile: ${input.logicalName}` });
          return;
        }
        const current = registrations.get(input.logicalName);
        if (current && current.instanceId !== input.instanceId) {
          sendJson(res, 409, { error: `logicalName already registered: ${input.logicalName}` });
          return;
        }
        const isNew = !current;
        registrations.set(input.logicalName, {
          logicalName: input.logicalName,
          packageName: input.packageName,
          manifestUrl: input.manifestUrl,
          instanceId: input.instanceId,
          pid: input.pid,
          lastSeenAt: Date.now(),
        });
        sendJson(res, 200, { ok: true });
        if (isNew) emitChanged();
      } catch (error) {
        sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }
    if (url.pathname.startsWith("/__g2_dev/remotes/") && req.method === "DELETE") {
      const logicalName = decodeURIComponent(url.pathname.slice("/__g2_dev/remotes/".length));
      const instanceId = url.searchParams.get("instanceId");
      const current = registrations.get(logicalName);
      if (current && (!instanceId || current.instanceId === instanceId)) {
        registrations.delete(logicalName);
        emitChanged();
      }
      sendJson(res, 200, { ok: true });
      return;
    }
    if (url.pathname === "/__g2_dev/events" && req.method === "GET") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write("event: ready\ndata: connected\n\n");
      eventClients.add(res);
      req.on("close", () => eventClients.delete(res));
      return;
    }
    sendJson(res, 404, { error: "not found" });
  }

  return { middleware, fetchProfile, registrations };
}
