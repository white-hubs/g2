import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { existsSync, readFileSync as readSessionFile } from "node:fs";
import { createConnection, createServer } from "node:net";
import { join } from "node:path";

import { findRepoRoot, shellSessionPath, terminateProcessGroup } from "./session";

export function parseRemoteMetadata(source: string): { logicalName: string; preferredPort: number } {
  const logicalName = source.match(/federation\(\s*\{[\s\S]*?\bname:\s*["']([^"']+)["']/u)?.[1];
  const port = source.match(/\bport:\s*(\d+)/u)?.[1];
  if (!logicalName || !port) throw new Error("vite.config.ts must declare federation name and preferred server port");
  return { logicalName, preferredPort: Number(port) };
}

export async function findAvailablePort(preferredPort: number): Promise<number> {
  for (let port = preferredPort; port < preferredPort + 100; port += 1) {
    let available = true;
    for (const host of ["127.0.0.1", "::1", "0.0.0.0", "::"]) {
      const result = await new Promise<"available" | "occupied" | "unsupported">((resolve) => {
        const server = createServer();
        server.once("error", (error: NodeJS.ErrnoException) => {
          resolve(host.includes(":") && (error.code === "EAFNOSUPPORT" || error.code === "EADDRNOTAVAIL") ? "unsupported" : "occupied");
        });
        server.listen(port, host, () => server.close(() => resolve("available")));
      });
      if (result === "occupied") {
        available = false;
        break;
      }
    }
    if (available) return port;
  }
  throw new Error(`no available port between ${preferredPort} and ${preferredPort + 99}`);
}

type ManifestRequest = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export async function isRemoteManifestReachable(manifestUrl: string, request: ManifestRequest = fetch): Promise<boolean> {
  try {
    return (await request(manifestUrl, { signal: AbortSignal.timeout(3_000) })).ok;
  } catch {
    return false;
  }
}

/** Vite 进程仍在：`kill(pid, 0)` 探测，不发送真实信号。 */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** 开发端口仍在监听：optimizeDeps 可能饿死 HTTP，但 TCP accept 通常仍可用。 */
export async function isPortListening(port: number, host = "127.0.0.1", timeoutMs = 500): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const finish = (value: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export type LocalRemoteHeartbeatAction = "register" | "keep-heartbeat" | "unregister";

/**
 * Vite optimizeDeps / 锁文件重扫期间，`mf-manifest.json` 常会短暂超时，但进程与端口仍在。
 * 此时必须继续向 Shell 心跳，禁止 DELETE：否则 legacy-compat 会立刻回退测试环境 qiankun。
 */
export function decideLocalRemoteHeartbeat(input: {
  manifestReachable: boolean;
  registered: boolean;
  processAlive: boolean;
  portListening: boolean;
}): LocalRemoteHeartbeatAction {
  if (input.manifestReachable) return "register";
  if (input.registered && input.processAlive && input.portListening) return "keep-heartbeat";
  return "unregister";
}

async function waitForManifest(url: string, child: ReturnType<typeof Bun.spawn>): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Vite exited before its manifest became available (exit ${child.exitCode})`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await Bun.sleep(500);
  }
  throw new Error(`timed out waiting for ${url}`);
}

/**
 * 按需启动新 Domain 时，已运行 Shell 仍可能持有迁移前生成的 legacy-compat Profile。
 * 先刷新本地 resolved Profile，Shell 的 mtime 监听才能识别该 Domain 并接受后续注册。
 */
function syncLegacyCompatProfile(repoRoot: string): void {
  const result = Bun.spawnSync(
    [
      "bun",
      "run",
      "--filter",
      "@g2-composition/schema",
      "resolve",
      "--",
      "--profile",
      "deploy/compositions/prod.pc.yaml",
      "--registry",
      "deploy/compositions/registry/dev.registry.yaml",
      "--out",
      "deploy/compositions/.resolved/dev.pc.resolved.json",
    ],
    { cwd: repoRoot, stdout: "inherit", stderr: "inherit" },
  );
  if (result.exitCode !== 0) throw new Error(`failed to refresh local composition profile (exit ${result.exitCode})`);
}

if (import.meta.main) {
  const cwd = process.cwd();
  const packageJson = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  const viteConfig = readFileSync(join(cwd, "vite.config.ts"), "utf8");
  if (!packageJson.name || !packageJson.scripts?.["dev:serve"]) {
    throw new Error("package.json must define name and dev:serve before using @g2-tooling/dev-link");
  }
  if (packageJson.name.startsWith("@g2-domain/")) {
    syncLegacyCompatProfile(findRepoRoot(cwd));
  }
  const { logicalName, preferredPort } = parseRemoteMetadata(viteConfig);
  const port = await findAvailablePort(preferredPort);
  const manifestUrl = `http://localhost:${port}/mf-manifest.json`;
  const instanceId = randomUUID();
  const sessionPath = shellSessionPath(findRepoRoot(cwd));
  function shellEndpoint(): string {
    if (process.env.G2_DEV_SHELL_URL) return process.env.G2_DEV_SHELL_URL;
    if (existsSync(sessionPath)) {
      try {
        return (JSON.parse(readSessionFile(sessionPath, "utf8")) as { shellUrl: string }).shellUrl;
      } catch {
        // Shell is replacing its session file; retry on the next heartbeat.
      }
    }
    return "http://localhost:5100";
  }
  const child = Bun.spawn(["bun", "run", "dev:serve", "--host", "0.0.0.0", "--port", String(port), "--strictPort"], {
    cwd,
    env: { ...process.env, G2_DEV_PORT: String(port), G2_DEV_ORIGIN: `http://localhost:${port}` },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    detached: true,
  });
  const registration = { logicalName, packageName: packageJson.name, manifestUrl, instanceId, pid: child.pid };
  let stopping = false;
  let registered = false;
  let keepingThroughOutage = false;
  let missedManifestChecks = 0;

  async function postRegistration(): Promise<Response> {
    return await fetch(`${shellEndpoint()}/__g2_dev/remotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(registration),
    });
  }

  async function unregisterRemote(): Promise<void> {
    await fetch(`${shellEndpoint()}/__g2_dev/remotes/${encodeURIComponent(logicalName)}?instanceId=${instanceId}`, {
      method: "DELETE",
    });
  }

  async function register(): Promise<void> {
    try {
      const manifestReachable = await isRemoteManifestReachable(manifestUrl);
      const action = decideLocalRemoteHeartbeat({
        manifestReachable,
        registered,
        processAlive: child.exitCode === null && isProcessAlive(child.pid),
        portListening: await isPortListening(port),
      });

      if (action === "unregister") {
        if (registered) console.warn(`[g2-dev] remote gone; unregistering ${logicalName}`);
        registered = false;
        keepingThroughOutage = false;
        missedManifestChecks = 0;
        await unregisterRemote();
        return;
      }

      const response = await postRegistration();
      if (response.status === 409) throw new Error(((await response.json()) as { error?: string }).error || "duplicate registration");
      if (!response.ok) return;

      if (action === "keep-heartbeat") {
        missedManifestChecks += 1;
        if (missedManifestChecks >= 3 && !keepingThroughOutage) {
          console.warn(`[g2-dev] manifest temporarily unreachable; keeping ${logicalName} (Vite still listening on ${port})`);
          keepingThroughOutage = true;
        }
        return;
      }

      missedManifestChecks = 0;
      if (keepingThroughOutage) {
        console.log(`[g2-dev] manifest recovered for ${logicalName}`);
        keepingThroughOutage = false;
      }
      if (!registered) console.log(`[g2-dev] registered ${logicalName} -> ${manifestUrl}`);
      registered = true;
    } catch (error) {
      if (error instanceof Error && error.message.includes("already registered")) throw error;
      if (registered) console.warn(`[g2-dev] shell unavailable; retrying ${shellEndpoint()}`);
      registered = false;
      keepingThroughOutage = false;
      missedManifestChecks = 0;
    }
  }

  async function stop(signal: NodeJS.Signals): Promise<void> {
    if (stopping) return;
    stopping = true;
    try {
      await unregisterRemote();
    } catch {
      // Shell may already be stopped.
    }
    terminateProcessGroup(child, signal);
  }

  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));

  try {
    await waitForManifest(manifestUrl, child);
    console.log(`[g2-dev] ${packageJson.name} ready at ${manifestUrl}`);
    await register();
  } catch (error) {
    await stop("SIGTERM");
    throw error;
  }
  const heartbeat = setInterval(() => {
    void register().catch(async (error) => {
      console.error(`[g2-dev] registration failed: ${error instanceof Error ? error.message : String(error)}`);
      await stop("SIGTERM");
    });
  }, 5_000);
  const exitCode = await child.exited;
  clearInterval(heartbeat);
  if (!stopping) await stop("SIGTERM");
  process.exit(exitCode);
}
