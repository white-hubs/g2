import {
  type DomainContext,
  type DomainModule,
  type PlatformContext,
  type PlatformModule,
  assertDomainModule,
  assertPlatformModule,
} from "@g2-composition/contract";
import { type CompositionPlan, buildCompositionPlan, detectStaticSlotConflicts, formatSlotConflictError } from "@g2-composition/loader";
import type { ResolvedProfile } from "@g2-composition/registry";
import {
  createRuntimeCommonLoader,
  setRuntimeCommonDiagnosticsProvider,
  setRuntimeCommonLoader,
  type RuntimeCommonDiagnostic,
} from "@g2-runtime/common-loader";
import { type ModuleFederation, createInstance } from "@module-federation/enhanced/runtime";
import { type App, defineComponent, h } from "vue";
import type { LocationQuery, Router } from "vue-router";

import { startOverridePolling } from "./inline-override";
import { PageLibraryLoadError } from "./page-library-loader-error";

export interface RunPlatformInstallsOptions {
  /** 只装这些逻辑名；省略则装 Profile 中全部 platform。顺序始终按 Profile 书写序。 */
  only?: string[];
}

export interface ComposeResult {
  plan: CompositionPlan;
  /** Runtime version/source state for the diagnostics panel and crash reports. */
  runtimeCommonDiagnostics: () => RuntimeCommonDiagnostic[];
  loadPlatformLabel: () => Promise<string | null>;
  loadPlatformSlot: (platformName: string, slotKey: string) => Promise<unknown>;
  loadPlatformExposed: (platformName: string, exposedPath: string) => Promise<unknown>;
  /** 加载已预检的 runtime-common Remote expose；供域的异步组件适配器使用。 */
  loadRuntimeCommon: <T = unknown>(runtimeName: string, exposedPath: string) => Promise<T>;
  /** 加载 Profile pageLibrary 槽位中的任意 MF expose。 */
  loadPageLibraryExposed: <T = unknown>(pageLibraryName: string, exposedPath: string) => Promise<T>;
  attachToRouter: (router: Router, options?: AttachToRouterOptions) => void;
  /**
   * DEV：软重挂当前路径命中的已加载 Domain Remote（清 MF 缓存后重新 loadRemote）。
   * 用于动态 remote 的 Vite `update` 热更新；不整页 `location.reload`。
   */
  softReloadActiveRemoteDomains: () => Promise<void>;
  /** 幂等装载单个 Platform（ADR-0053）。 */
  ensurePlatform: (platformName: string, app: App, router: Router, ctx: PlatformContext) => Promise<void>;
  runPlatformInstalls: (app: App, router: Router, ctx: PlatformContext, options?: RunPlatformInstallsOptions) => Promise<void>;
  /** 幂等装载服务 Client：load `./client` + `create(ctx)`，缓存 API 单例（ADR-0057）。 */
  ensureClient: <T = unknown>(clientName: string, ctx: PlatformContext) => Promise<T>;
}

export type InlineDomainLoader = (packageName: string) => Promise<unknown>;
export type RemoteDomainLoader = (remoteName: string, exposed: string) => Promise<unknown>;

/** 域懒加载时取 Vue app 与 DomainContext（壳侧可用 getter，兼容 ctx 晚创建）。 */
export interface AttachToRouterOptions {
  getApp: () => App;
  getDomainContext: () => DomainContext;
}

export interface ComposeDeps {
  loadInlineDomain?: InlineDomainLoader;
  createMf?: () => ModuleFederation;
  loadRemoteDomain?: RemoteDomainLoader;
  /** Development-only workspace modules; production leaves this undefined. */
  loadLocalRuntimeModule?: (remoteName: string, exposed: string) => Promise<unknown | undefined>;
  /** inline override 轮询间隔（毫秒），默认 60s；测试注入更短的间隔以便断言，不影响生产默认行为。 */
  overridePollIntervalMs?: number;
  /**
   * 检测到 inline override 有新版本时如何通知用户（ADR-0042："发现新版本只弹提示引导用户手动刷新"）。
   * 默认实现在真实浏览器环境下用 `window.confirm` 弹一个原生确认框，用户确认则 `location.reload()`；
   * 非浏览器环境（如测试）下静默退化为 console.info，不抛错。测试可注入自定义实现以断言回调被触发。
   */
  notifyNewerVersion?: (inlineName: string) => void;
  /** 每个 Platform MF 模块加载完成时回调（便于定位 Vite 冷启动卡在哪个 remote）。 */
  onPlatformModuleLoaded?: (platformName: string, elapsedMs: number) => void;
}

function defaultNotifyNewerVersion(inlineName: string): void {
  if (globalThis.window !== undefined && typeof globalThis.window.confirm === "function") {
    const shouldRefresh = globalThis.window.confirm(`"${inlineName}" 有新版本可用，是否刷新页面以应用更新？`);
    if (shouldRefresh) {
      globalThis.window.location.reload();
    }
    return;
  }
  console.info(`[inline-override] newer version detected for "${inlineName}", refresh to apply`);
}

const PendingView = defineComponent({
  name: "DomainPendingView",
  setup() {
    return () => h("main", { "data-pending": "domain" }, "Loading domain…");
  },
});

const defaultInlineLoader: InlineDomainLoader = async (packageName) => {
  if (packageName === "@g2-domain/poc-inline-pc") {
    return import("@g2-domain/poc-inline-pc");
  }
  throw new Error(`no inline loader for ${packageName}`);
};

function createDefaultMf(): ModuleFederation {
  return createInstance({
    name: "shellPc",
    remotes: [],
  });
}

function asDomainModule(loaded: unknown): DomainModule {
  const mod =
    (loaded as { domainModule?: DomainModule; default?: DomainModule }).domainModule ??
    (loaded as { default?: DomainModule }).default ??
    loaded;
  const asserted = assertDomainModule(mod);
  if (!asserted.ok) {
    throw new Error(asserted.errors.join("; "));
  }
  return asserted.module;
}

function matchesBasePath(path: string, basePath: string): boolean {
  return path === basePath || path.startsWith(`${basePath}/`);
}

function pendingRouteNames(kind: "inline" | "remote", name: string): [string, string] {
  return [`__pending_${kind}_${name}`, `__pending_${kind}_${name}_rest`];
}

const DEV_REMOTE_HMR_QUERY = "_g2hmr";

/**
 * Baseline-migrated package imports supplied by a runtime common Remote.
 * Keep this narrow until each consumer has passed the no-fallback artifact
 * check; domains must never manufacture a local replacement for these IDs.
 */
const RUNTIME_SHARED_EXPOSES = {
  pcUi: { packageName: "@g2-platform/pc-ui", exposed: "index" },
} as const;

function stripDevRemoteHmrQuery(query: LocationQuery): LocationQuery {
  if (!(DEV_REMOTE_HMR_QUERY in query)) {
    return query;
  }
  const next = { ...query };
  delete next[DEV_REMOTE_HMR_QUERY];
  return next;
}

/** 清 MF / Vite remote 模块缓存，迫使下一次 loadRemote 拉到新代码。 */
function clearFederationDevModuleCaches(): void {
  type FederationInstance = { moduleCache?: { clear?: () => void } };
  type FederationRuntime = { ["__INSTANCES__"]?: FederationInstance[] };
  const runtime = globalThis as unknown as Record<string, FederationRuntime | { remote?: Record<string, unknown> } | undefined>;
  const federation = (runtime["__FEDERATION__"] ?? runtime["__VMOK__"]) as FederationRuntime | undefined;
  for (const instance of federation?.["__INSTANCES__"] ?? []) {
    instance.moduleCache?.clear?.();
  }
  const legacy = runtime["__mf_module_cache__"] as { remote?: Record<string, unknown> } | undefined;
  if (legacy?.remote) {
    legacy.remote = {};
  }
}

export async function composeFromProfile(profile: ResolvedProfile, deps: ComposeDeps = {}): Promise<ComposeResult> {
  const plan = buildCompositionPlan(profile);
  const loadInline = deps.loadInlineDomain ?? defaultInlineLoader;
  const mf = deps.createMf?.() ?? createDefaultMf();
  const loadMfRemote = deps.loadRemoteDomain ?? (async (remoteName: string, exposed: string) => mf.loadRemote(`${remoteName}/${exposed}`));
  const loadRemote = async (remoteName: string, exposed: string): Promise<unknown> => {
    const local = await deps.loadLocalRuntimeModule?.(remoteName, exposed);
    return local ?? loadMfRemote(remoteName, exposed);
  };
  const runtimeCommon = createRuntimeCommonLoader(loadRemote);
  setRuntimeCommonLoader(runtimeCommon.load);
  setRuntimeCommonDiagnosticsProvider(runtimeCommon.diagnostics);

  const remoteOwners = new Map<string, string[]>();
  for (const [slot, items] of [
    ["coreRuntime", plan.coreRuntime],
    ["platform", plan.platforms],
    ["client", plan.clients],
    ["pageLibrary", plan.pageLibraries],
    ["remote", plan.remotes],
  ] as const) {
    for (const item of items) {
      if (item.kind !== "entry") {
        continue;
      }
      remoteOwners.set(item.name, [...(remoteOwners.get(item.name) ?? []), slot]);
    }
  }
  // During the baseline transition a core remote may remain in `platform` for
  // its install lifecycle. That is the one intentional duplicate; all others
  // still indicate an unsafe conflicting MF registration.
  const duplicate = [...remoteOwners].find(
    ([, slots]) => !(slots.length === 2 && slots.includes("coreRuntime") && slots.includes("platform")) && slots.length > 1,
  );
  if (duplicate) {
    throw new Error(`module federation remote name "${duplicate[0]}" is duplicated across slots: ${duplicate[1].join(", ")}`);
  }

  for (const runtime of plan.coreRuntime) {
    mf.registerRemotes([
      {
        name: runtime.name,
        entry: runtime.entry,
        type: "module",
      },
    ]);
  }

  // A failed/incompatible common remote is terminal. Do this before registering
  // domain remotes so a page cannot start with a locally bundled fallback.
  await runtimeCommon.preload((profile.coreRuntime ?? []).map((runtime) => ({ name: runtime.name, apiVersion: runtime.apiVersion })));

  for (const runtime of profile.coreRuntime ?? []) {
    const shared = RUNTIME_SHARED_EXPOSES[runtime.name as keyof typeof RUNTIME_SHARED_EXPOSES];
    if (!shared) {
      continue;
    }
    const module = (await runtimeCommon.load(runtime.name, shared.exposed)) as Record<string, unknown>;
    mf.registerShared({
      [shared.packageName]: {
        // apiVersion in the composition is an accepted range (for example
        // "1.x"), not a concrete SemVer provider version. Use the validated
        // runtime's concrete API version for Federation negotiation.
        version: runtimeCommon.diagnostics().find((item) => item.name === runtime.name)?.apiVersion ?? "1.0.0",
        shareConfig: { singleton: true, requiredVersion: false },
        get: async () => () => module,
      },
    });
  }

  const coreRuntimeNames = new Set(plan.coreRuntime.map((runtime) => runtime.name));
  for (const platform of plan.platforms) {
    if (platform.kind === "entry") {
      // The transition profile intentionally lists pcUi in both slots: it is
      // preloaded as a runtime common and still has a Platform lifecycle. MF
      // must only receive one registration for that remote.
      if (coreRuntimeNames.has(platform.name)) {
        continue;
      }
      mf.registerRemotes([
        {
          name: platform.name,
          entry: platform.entry,
          type: "module",
        },
      ]);
    }
  }

  for (const client of plan.clients) {
    if (client.kind === "entry") {
      mf.registerRemotes([
        {
          name: client.name,
          entry: client.entry,
          type: "module",
        },
      ]);
    }
  }

  for (const pageLibrary of plan.pageLibraries) {
    if (pageLibrary.kind === "entry") {
      mf.registerRemotes([
        {
          name: pageLibrary.name,
          entry: pageLibrary.entry,
          type: "module",
        },
      ]);
    }
  }

  for (const remote of plan.remotes) {
    mf.registerRemotes([
      {
        name: remote.name,
        entry: remote.entry,
        type: "module",
      },
    ]);
  }
  let platformLabelPromise: Promise<string | null> | null = null;
  const loadPlatformLabel = async (): Promise<string | null> => {
    if (!platformLabelPromise) {
      platformLabelPromise = (async () => {
        for (const platform of plan.platforms) {
          if (platform.kind === "entry") {
            const mod = (await loadRemote(platform.name, "info")) as {
              getPlatformLabel?: () => string;
              platformInfo?: { label: string };
            };
            return mod.getPlatformLabel?.() ?? mod.platformInfo?.label ?? platform.name;
          }
        }
        return null;
      })();
    }
    return platformLabelPromise;
  };

  const loadedPlatformModules = new Map<string, Promise<unknown>>();
  async function loadPlatformModule(platformName: string): Promise<PlatformModule> {
    if (!loadedPlatformModules.has(platformName)) {
      const pending = (async () => {
        try {
          return await loadRemote(platformName, "platform");
        } catch (error) {
          // CDN / nginx reload 瞬时失败时再试一次（与 ensureClient 同属「不得永久占坑」）。
          const message = error instanceof Error ? error.message : String(error);
          if (/Failed to fetch dynamically imported module/i.test(message)) {
            return await loadRemote(platformName, "platform");
          }
          throw error;
        }
      })().catch((error) => {
        loadedPlatformModules.delete(platformName);
        throw error;
      });
      loadedPlatformModules.set(platformName, pending);
    }
    const loaded = (await loadedPlatformModules.get(platformName)) as { platformModule?: PlatformModule; default?: PlatformModule };
    const asserted = assertPlatformModule(loaded.platformModule ?? loaded.default ?? loaded);
    if (!asserted.ok) {
      throw new Error(asserted.errors.join("; "));
    }
    return asserted.module;
  }

  async function loadPlatformSlot(platformName: string, slotKey: string): Promise<unknown> {
    const mod = await loadPlatformModule(platformName);
    const slot = mod.slots?.[slotKey];
    if (!slot) {
      throw new Error(`platform "${platformName}" does not expose slot "${slotKey}"`);
    }
    return slot;
  }

  /** 通用版："加载某个 Platform 暴露的任意 MF 路径"——不限定必须是 "./platform"，供 ctx.loadPlatform（Platform 互相消费彼此库能力，如 http client）使用。 */
  async function loadPlatformExposed(platformName: string, exposedPath: string): Promise<unknown> {
    return loadRemote(platformName, exposedPath);
  }

  async function loadPageLibraryExposed<T = unknown>(pageLibraryName: string, exposedPath: string): Promise<T> {
    const pageLibrary = plan.pageLibraries.find((item) => item.name === pageLibraryName);
    if (!pageLibrary) {
      throw new Error(`page library "${pageLibraryName}" is not in the resolved profile`);
    }
    try {
      return (await loadRemote(pageLibraryName, exposedPath)) as T;
    } catch (cause) {
      const entry = pageLibrary.kind === "entry" ? pageLibrary.entry : pageLibrary.package;
      throw new PageLibraryLoadError(pageLibraryName, exposedPath, entry, { cause });
    }
  }

  /**
   * 用 `profile.platform`（而非 `plan.platforms`）取顺序+config：`buildCompositionPlan` 把
   * platform 条目映射成 `CompositionRef`（entry/package 判别联合）时没有携带 `config` 字段
   * （composition-loader 包 Phase 1-6 已完成/已提交，其 `CompositionRef` 类型本就不含 config），
   * 这里直接复用 `composeFromProfile` 的 `profile` 参数（`ResolvedPlatformItem` 自带 `config?`），
   * 顺序与 `plan.platforms` 完全一致（两者都来自同一份 `profile.platform` 数组的书写顺序）。
   *
   * ADR-0053：支持 `only` 子集；已装集合上做冲突检测；`ensurePlatform` 幂等。
   */
  const installedPlatformNames = new Set<string>();
  const installedPlatformModules = new Map<string, PlatformModule>();

  async function runPlatformInstalls(app: App, router: Router, ctx: PlatformContext, options?: RunPlatformInstallsOptions): Promise<void> {
    const requested = options?.only ?? profile.platform.map((platform) => platform.name);
    const known = new Set(profile.platform.map((platform) => platform.name));
    for (const name of requested) {
      if (!known.has(name)) {
        throw new Error(`platform "${name}" is not in the resolved profile`);
      }
    }
    const requestedSet = new Set(requested);
    const ordered = profile.platform.filter((platform) => requestedSet.has(platform.name));
    const pending = ordered.filter((platform) => !installedPlatformNames.has(platform.name));
    if (pending.length === 0) {
      return;
    }

    // 串行 loadRemote：dev:full 下并行拉多个 Vite remote 易把预打包 / shared(vue) 解析打到死锁或超过 bootstrap 超时；
    // 发版 / Docker 预构建产物并行也快，串行只多几十毫秒级，可接受。
    const modules: { platform: (typeof pending)[number]; mod: PlatformModule }[] = [];
    for (const platform of pending) {
      const startedAt = Date.now();
      const mod = await loadPlatformModule(platform.name);
      deps.onPlatformModuleLoaded?.(platform.name, Date.now() - startedAt);
      modules.push({ platform, mod });
    }

    const claimants = [
      ...[...installedPlatformModules.entries()].map(([name, mod]) => ({
        name,
        slots: Object.keys(mod.slots ?? {}),
      })),
      ...modules.map(({ platform, mod }) => ({ name: platform.name, slots: Object.keys(mod.slots ?? {}) })),
    ];
    const conflicts = detectStaticSlotConflicts(claimants);
    if (conflicts.length > 0) {
      throw new Error(conflicts.map(formatSlotConflictError).join("; "));
    }

    for (const { platform, mod } of modules) {
      if (mod.install) {
        await mod.install(app, router, ctx, platform.config);
      }
      installedPlatformNames.add(platform.name);
      installedPlatformModules.set(platform.name, mod);
    }
  }

  async function ensurePlatform(platformName: string, app: App, router: Router, ctx: PlatformContext): Promise<void> {
    await runPlatformInstalls(app, router, ctx, { only: [platformName] });
  }

  const clientApiCache = new Map<string, Promise<unknown>>();

  async function ensureClient<T = unknown>(clientName: string, ctx: PlatformContext): Promise<T> {
    const known = new Set((profile.client ?? []).map((item) => item.name));
    if (!known.has(clientName)) {
      throw new Error(`client "${clientName}" is not in the resolved profile`);
    }
    if (!clientApiCache.has(clientName)) {
      const pending = (async () => {
        const loaded = (await loadRemote(clientName, "client")) as {
          create?: (platformCtx: PlatformContext) => unknown | Promise<unknown>;
          default?: { create?: (platformCtx: PlatformContext) => unknown | Promise<unknown> };
        };
        const create = loaded.create ?? loaded.default?.create;
        if (typeof create !== "function") {
          throw new Error(`client "${clientName}" does not export create(ctx)`);
        }
        return create(ctx);
      })().catch((error) => {
        // 首次加载失败（CDN 未就绪 / 瞬时网络错误）不得永久占坑，否则后续点击会一直复用同一 rejected Promise。
        clientApiCache.delete(clientName);
        throw error;
      });
      clientApiCache.set(clientName, pending);
    }
    return clientApiCache.get(clientName)! as Promise<T>;
  }

  const loadedDomains = new Set<string>();
  const domainRouteNamesByKey = new Map<string, string[]>();
  let attachedRouter: Router | undefined;

  const attachToRouter = (router: Router, options?: AttachToRouterOptions): void => {
    attachedRouter = router;
    for (const inline of plan.inline) {
      const [exact, rest] = pendingRouteNames("inline", inline.name);
      router.addRoute({ path: inline.basePath, name: exact, component: PendingView });
      router.addRoute({
        path: `${inline.basePath}/:pathMatch(.*)*`,
        name: rest,
        component: PendingView,
      });
    }
    for (const remote of plan.remotes) {
      const [exact, rest] = pendingRouteNames("remote", remote.name);
      router.addRoute({ path: remote.basePath, name: exact, component: PendingView });
      router.addRoute({
        path: `${remote.basePath}/:pathMatch(.*)*`,
        name: rest,
        component: PendingView,
      });
    }

    router.beforeEach(async (to) => {
      for (const inline of plan.inline) {
        const key = `inline:${inline.name}`;
        if (loadedDomains.has(key) || !matchesBasePath(to.path, inline.basePath)) {
          continue;
        }
        const domain = asDomainModule(await loadInline(inline.package));
        const [exact, rest] = pendingRouteNames("inline", inline.name);
        router.removeRoute(exact);
        router.removeRoute(rest);
        const routeNames: string[] = [];
        for (const route of domain.routes) {
          router.addRoute(route);
          if (typeof route.name === "string") {
            routeNames.push(route.name);
          }
        }
        domainRouteNamesByKey.set(key, routeNames);
        if (domain.install) {
          if (!options) {
            throw new Error(`domain "${inline.name}" defines install but attachToRouter was called without options`);
          }
          const inlineConfig = profile.inline.find((item) => item.name === inline.name) as { config?: Record<string, unknown> } | undefined;
          await domain.install(options.getApp(), options.getDomainContext(), inlineConfig?.config);
        }
        loadedDomains.add(key);
        // path 不能带 query；用 fullPath 会丢掉 ?id= 等参数（Vue Router 只认 path/query/hash）
        return { path: to.path, query: stripDevRemoteHmrQuery(to.query), hash: to.hash, replace: true };
      }

      for (const remote of plan.remotes) {
        const key = `remote:${remote.name}`;
        if (loadedDomains.has(key) || !matchesBasePath(to.path, remote.basePath)) {
          continue;
        }
        const loaded = await loadRemote(remote.name, "domain");
        const domain = asDomainModule(loaded);
        const [exact, rest] = pendingRouteNames("remote", remote.name);
        router.removeRoute(exact);
        router.removeRoute(rest);
        const routeNames: string[] = [];
        for (const route of domain.routes) {
          router.addRoute(route);
          if (typeof route.name === "string") {
            routeNames.push(route.name);
          }
        }
        domainRouteNamesByKey.set(key, routeNames);
        if (domain.install) {
          if (!options) {
            throw new Error(`domain "${remote.name}" defines install but attachToRouter was called without options`);
          }
          const remoteConfig = profile.remotes.find((item) => item.name === remote.name)?.config;
          await domain.install(options.getApp(), options.getDomainContext(), remoteConfig);
        }
        loadedDomains.add(key);
        return { path: to.path, query: stripDevRemoteHmrQuery(to.query), hash: to.hash, replace: true };
      }

      return true;
    });

    // ADR-0042：inline domain 声明 allowOverride 时，轮询同 basePath 的 remote 是否发布了新版本，
    // 提示用户有热更新可用（机制本身在 inline-override.ts；这里只做“是否要启动轮询”的接线判断）。
    // 用 `profile.inline`（而非 `plan.inline`）取 `allowOverride`：`buildCompositionPlan` 把 inline
    // 条目映射成 `DomainPackageRef` 时没有携带 `allowOverride` 字段（composition-loader 包 Phase 1-6
    // 已完成/已提交，其类型本就不含这个字段）。
    for (const inline of profile.inline) {
      if (!inline.allowOverride) {
        continue;
      }
      const matchingRemote = plan.remotes.find((remote) => remote.basePath === inline.basePath);
      if (!matchingRemote) {
        continue;
      }
      startOverridePolling({
        renderedVersion: "inline", // 内置版本没有 buildVersion 概念，用固定字符串占位，只要 override remote 的版本号一出现就会判定为"有新版本"
        intervalMs: deps.overridePollIntervalMs,
        fetchManifest: async () => {
          const res = await fetch(matchingRemote.entry);
          return (await res.json()) as { metaData: { buildInfo: { buildVersion: string } } };
        },
        onNewerVersion: () => {
          (deps.notifyNewerVersion ?? defaultNotifyNewerVersion)(inline.name);
        },
      });
    }
  };

  const softReloadActiveRemoteDomains = async (): Promise<void> => {
    const router = attachedRouter;
    if (!router) {
      return;
    }
    const current = router.currentRoute.value;
    let invalidated = false;
    for (const remote of plan.remotes) {
      const key = `remote:${remote.name}`;
      if (!loadedDomains.has(key) || !matchesBasePath(current.path, remote.basePath)) {
        continue;
      }
      for (const routeName of domainRouteNamesByKey.get(key) ?? []) {
        router.removeRoute(routeName);
      }
      domainRouteNamesByKey.delete(key);
      loadedDomains.delete(key);
      const [exact, rest] = pendingRouteNames("remote", remote.name);
      if (!router.hasRoute(exact)) {
        router.addRoute({ path: remote.basePath, name: exact, component: PendingView });
        router.addRoute({
          path: `${remote.basePath}/:pathMatch(.*)*`,
          name: rest,
          component: PendingView,
        });
      }
      invalidated = true;
    }
    if (!invalidated) {
      return;
    }
    clearFederationDevModuleCaches();
    // 同 path 不会重跑 beforeEach；用一次性 query 触发重新 loadRemote。
    await router.replace({
      path: current.path,
      query: { ...current.query, [DEV_REMOTE_HMR_QUERY]: String(Date.now()) },
      hash: current.hash,
    });
  };

  return {
    plan,
    runtimeCommonDiagnostics: runtimeCommon.diagnostics,
    loadPlatformLabel,
    loadPlatformSlot,
    loadPlatformExposed,
    loadRuntimeCommon: runtimeCommon.load,
    loadPageLibraryExposed,
    attachToRouter,
    softReloadActiveRemoteDomains,
    ensurePlatform,
    runPlatformInstalls,
    ensureClient,
  };
}
