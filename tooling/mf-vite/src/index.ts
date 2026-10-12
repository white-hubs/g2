import { type ModuleFederationOptions, federation as mfFederation } from "@module-federation/vite";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { Plugin } from "vite";

import { mfRuntimePlugins } from "./mf-runtime-plugins.ts";
import type { MfRuntimeConfig } from "./mf-runtime.ts";
import { skipUnchangedHmrPlugin } from "./skip-unchanged-hmr.ts";
import { vueJsxHmrIdSyncPlugin } from "./vue-jsx-hmr-id-sync.ts";

export type { MfRuntimeConfig, MfRuntimeMode, MfRuntimeRole } from "./mf-runtime.ts";
export {
  DEFAULT_MF_RUNTIME_BASE,
  MF_RUNTIME_BASE_ENV,
  MF_RUNTIME_FILE,
  MF_RUNTIME_MODE_ENV,
  MF_RUNTIME_SLIM_ENV,
  bundleMfRuntimeToFile,
  isMfRuntimeModuleId,
  mfRuntimeObjectKey,
  mfRuntimePublicPath,
  mfRuntimePublicUrl,
  readMfRuntimeNpmVersion,
  resolveMfRuntimeBaseUrl,
  resolveMfRuntimeEsmEntry,
  resolveMfRuntimeMode,
  resolveMfRuntimePackageJson,
  stripTrailingSlash,
} from "./mf-runtime.ts";
export { materializeMfRuntimeArtifact, mfRuntimeHostPlugin, mfRuntimeRemoteExternalPlugin } from "./mf-runtime-plugins.ts";
export { skipUnchangedHmrPlugin } from "./skip-unchanged-hmr.ts";
export { syncVueJsxHmrRecordIds, vueJsxHmrIdSyncPlugin } from "./vue-jsx-hmr-id-sync.ts";

/** Vite allows async plugin entries: Promise<Plugin | Plugin[]>. */
type FederationPluginEntry = Plugin | Plugin[] | Promise<Plugin | Plugin[]>;

interface PluginWithError {
  error: (err: string | Error) => never;
}

type DtsGenerateTypesObject = Exclude<NonNullable<Exclude<ModuleFederationOptions["dts"], boolean | undefined>["generateTypes"]>, boolean>;

export interface G2FederationOptions extends ModuleFederationOptions {
  /**
   * CDN-shared Module Federation runtime (ADR-0054).
   * Host emits/serves `/_mf/runtime/{ver}/mf-runtime.js`; remotes external it by default.
   */
  mfRuntime?: MfRuntimeConfig;
}

/** Development-only: keep workspace @g2 packages as source modules instead of Vite prebundles. */
export function workspaceSharedDependencies(shared: ModuleFederationOptions["shared"]): string[] {
  if (!shared) return [];
  return (Array.isArray(shared) ? shared : Object.keys(shared)).filter((name) => name.startsWith("@g2-"));
}

interface WorkspaceOptimizeDeps {
  include?: string[];
  exclude?: string[];
  entries?: string | string[];
  holdUntilCrawlEnd?: boolean;
}

const DAYJS_PLUGINS = ["advancedFormat", "customParseFormat", "localeData", "quarterOfYear", "weekday", "weekOfYear", "weekYear"];

/** Keep remote manifests responsive while preserving CJS interop for antd's date components. */
export function applyRemoteDevOptimizeDeps(optimizeDeps: WorkspaceOptimizeDeps, dependencies: Readonly<Record<string, string>>): void {
  optimizeDeps.holdUntilCrawlEnd ??= false;
  const hasPcUi = "@g2-platform/pc-ui" in dependencies;
  const hasAntd = "ant-design-vue" in dependencies;
  if (!hasPcUi && !hasAntd) return;

  optimizeDeps.exclude = [...new Set([...(optimizeDeps.exclude ?? []), "@ant-design/icons-vue", "ant-design-vue"])];
  const dayjsFrom = "dayjs" in dependencies ? "" : hasPcUi ? "@g2-platform/pc-ui > " : "ant-design-vue > ";
  const includes = [`${dayjsFrom}dayjs`, ...DAYJS_PLUGINS.map((plugin) => `${dayjsFrom}dayjs/plugin/${plugin}`)];
  optimizeDeps.include = [...new Set([...(optimizeDeps.include ?? []), ...includes])];
}

function remoteDevOptimizeDepsPlugin(): Plugin {
  return {
    name: "g2-remote-dev-optimize-deps",
    enforce: "post",
    apply: "serve",
    config(config) {
      const root = resolve(config.root ?? process.cwd());
      const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
      };
      config.optimizeDeps ??= {};
      applyRemoteDevOptimizeDeps(config.optimizeDeps, packageJson.dependencies ?? {});
    },
  };
}

/** MF 插件会把 shared 再塞回 include/entries；必须在其 config hook 之后清理。 */
export function excludeWorkspaceSharedFromOptimizeDeps(
  optimizeDeps: WorkspaceOptimizeDeps,
  dependencies: string[],
  resolvedEntries: string[],
): void {
  const isWorkspaceDependency = (dependency: string) =>
    dependencies.some((workspaceDependency) => dependency === workspaceDependency || dependency.startsWith(`${workspaceDependency}/`));
  optimizeDeps.include = (optimizeDeps.include ?? []).filter((dependency) => !isWorkspaceDependency(dependency));
  optimizeDeps.exclude = [...new Set([...(optimizeDeps.exclude ?? []), ...dependencies])];
  if (Array.isArray(optimizeDeps.entries)) {
    const workspaceEntries = new Set(resolvedEntries);
    optimizeDeps.entries = optimizeDeps.entries.filter((entry) => !workspaceEntries.has(entry));
  }
}

function workspaceSharedDevPlugin(shared: ModuleFederationOptions["shared"]): Plugin {
  return {
    name: "g2-workspace-shared-dev",
    enforce: "post",
    apply: "serve",
    config(config) {
      const dependencies = workspaceSharedDependencies(shared);
      if (dependencies.length === 0) return;
      const root = resolve(config.root ?? process.cwd());
      const requireFromRoot = createRequire(resolve(root, "package.json"));
      const resolvedEntries = dependencies.flatMap((dependency) => {
        try {
          return [requireFromRoot.resolve(dependency)];
        } catch {
          return [];
        }
      });
      config.optimizeDeps ??= {};
      excludeWorkspaceSharedFromOptimizeDeps(config.optimizeDeps, dependencies, resolvedEntries);
    },
  };
}

export function mergeStrictDts(dts: ModuleFederationOptions["dts"]): ModuleFederationOptions["dts"] {
  if (dts === false) {
    return false;
  }
  const base = typeof dts === "object" && dts ? dts : {};
  if (base.generateTypes === false) {
    return { ...base, generateTypes: false };
  }
  const generateTypes: DtsGenerateTypesObject = typeof base.generateTypes === "object" && base.generateTypes ? base.generateTypes : {};
  return {
    ...base,
    generateTypes: {
      compilerInstance: "tsc",
      // Child process keeps Vite's HTTP thread free (in-process tsc made /mf-manifest.json time out).
      compileInChildProcess: true,
      ...generateTypes,
      abortOnError: true,
    },
  };
}

/**
 * Domain/Client/Platform remote 默认开启 Vue 原生跨 federation HMR。
 * 显式 `remoteHmr`（含 `false` / `"full-reload"`）优先生效；禁止在业务侧逐个复制粘贴。
 */
export function mergeRemoteDevHmr(isRemote: boolean, dev: ModuleFederationOptions["dev"]): ModuleFederationOptions["dev"] {
  if (!isRemote) {
    return dev;
  }
  const base = typeof dev === "object" && dev ? { ...dev } : {};
  if (base.remoteHmr !== undefined) {
    return base;
  }
  return { ...base, remoteHmr: true };
}

export function isMfDtsErrorMessage(value: unknown): boolean {
  const text = value instanceof Error ? value.message : typeof value === "string" ? value : value == null ? "" : String(value);
  return (
    text.includes("Module Federation DTS") ||
    text.includes("TYPE-001") ||
    text.includes("Failed to generate type declaration") ||
    text.includes("[ Module Federation")
  );
}

function wrapDtsBuildPlugin(plugin: Plugin): Plugin {
  const original = plugin.generateBundle;
  if (typeof original !== "function") {
    return plugin;
  }

  return {
    ...plugin,
    async generateBundle(this: PluginWithError, ...args: unknown[]) {
      let captured: Error | undefined;
      const origError = console.error;
      // DtsWorker.controlledPromise only console.error's child failures when FEDERATION_DEBUG is set,
      // and never rethrows — temporarily enable it so we can promote the error to a build failure.
      const prevDebug = process.env.FEDERATION_DEBUG;
      process.env.FEDERATION_DEBUG = prevDebug || "1";
      console.error = (...msgs: unknown[]) => {
        origError(...msgs);
        for (const msg of msgs) {
          if (!isMfDtsErrorMessage(msg)) {
            continue;
          }
          captured = msg instanceof Error ? msg : new Error(String(msg));
        }
      };
      try {
        await (original as (...a: unknown[]) => unknown).apply(this, args);
      } finally {
        console.error = origError;
        if (prevDebug === undefined) {
          delete process.env.FEDERATION_DEBUG;
        } else {
          process.env.FEDERATION_DEBUG = prevDebug;
        }
      }
      if (captured) {
        this.error(captured);
      }
    },
  };
}

function wrapPluginEntry(entry: FederationPluginEntry): FederationPluginEntry {
  if (entry instanceof Promise) {
    return entry.then((resolved) => wrapPluginEntry(resolved) as Plugin | Plugin[]);
  }
  if (Array.isArray(entry)) {
    return entry.map((plugin) => (plugin?.name === "module-federation-dts-build" ? wrapDtsBuildPlugin(plugin) : plugin));
  }
  if (entry?.name === "module-federation-dts-build") {
    return wrapDtsBuildPlugin(entry);
  }
  return entry;
}

/**
 * Thin wrapper over `@module-federation/vite` that:
 * 1. defaults `dts.generateTypes.abortOnError` + `compilerInstance: "tsc"`
 * 2. keeps DTS in a child process so Vite dev HTTP stays responsive
 * 3. on `vite build`, promotes swallowed DTS child-process errors to `this.error`
 * 4. optional `mfRuntime` host emit / remote external (ADR-0054)
 * 5. DEV：对齐 vue-jsx `__hmrId` 与 `createRecord`/`reload` id（否则跨 federation HMR 不更新实例）
 * 6. DEV：内容未变的保存跳过 HMR（避免 vue-jsx reload remount 造成「假刷新」）
 * 7. DEV：remote 默认 `remoteHmr: true`（Vue 原生跨 federation HMR；可用显式配置覆盖）
 */
export function federation(options: G2FederationOptions): Plugin[] {
  const { mfRuntime, ...mfOptions } = options;
  const isRemote = Boolean(mfOptions.exposes && Object.keys(mfOptions.exposes).length > 0);
  const dts = mergeStrictDts(mfOptions.dts);
  const mergedDev = mergeRemoteDevHmr(isRemote, mfOptions.dev);
  const dev =
    mergedDev === false
      ? false
      : {
          ...(mergedDev === true || mergedDev === undefined ? {} : mergedDev),
          // Local development does not run the DTS WebSocket type-hints server.
          // Leaving the runtime plugin enabled produces repeated [object Event]
          // errors in the browser and obscures real remote-loading failures.
          disableDynamicRemoteTypeHints:
            typeof mergedDev === "object" && mergedDev?.disableDynamicRemoteTypeHints !== undefined
              ? mergedDev.disableDynamicRemoteTypeHints
              : true,
        };
  const plugins = mfFederation({ ...mfOptions, dts, dev }) as FederationPluginEntry[];
  // HMR id sync MUST run after MF's vue adapter (both `enforce: "post"`).
  // Adapter only rewrites `.__hmrId`; sync then aligns createRecord/reload.
  const wrapped = [
    g2DevWatchPlugin(),
    ...(isRemote ? [remoteDevCorsPlugin(), remoteDevOptimizeDepsPlugin()] : []),
    workspaceSharedDevPlugin(mfOptions.shared),
    ...(isRemote ? [skipUnchangedHmrPlugin()] : []),
    ...(dts === false ? plugins : plugins.map(wrapPluginEntry)),
    ...(isRemote ? [vueJsxHmrIdSyncPlugin()] : []),
  ] as Plugin[];
  if (!mfRuntime) {
    return wrapped;
  }
  return [...mfRuntimePlugins(mfRuntime), ...wrapped];
}

/** Cursor/低 inotify 环境可通过 G2_VITE_USE_POLLING=1 避免 fs.watch 资源耗尽。 */
function g2DevWatchPlugin(): Plugin {
  return {
    name: "g2-dev-watch-polling",
    config() {
      if (process.env.G2_VITE_USE_POLLING !== "1") {
        return;
      }
      return {
        server: {
          watch: {
            usePolling: true,
            interval: Number(process.env.G2_VITE_POLL_INTERVAL ?? 1000),
          },
        },
      };
    },
  };
}

/**
 * 局域网用 IP:ShellPort 打开宿主、再拉 IP:RemotePort 的 remoteEntry 时属于跨源。
 * Vite 默认 CORS 在部分 MF/中间件组合下不会写出 ACAO，导致「Failed to fetch dynamically imported module」。
 */
function remoteDevCorsPlugin(): Plugin {
  return {
    name: "g2-remote-dev-cors",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
        if (origin) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Vary", "Origin");
        } else {
          res.setHeader("Access-Control-Allow-Origin", "*");
        }
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
          const requestHeaders = req.headers["access-control-request-headers"];
          if (typeof requestHeaders === "string" && requestHeaders.length > 0) {
            res.setHeader("Access-Control-Allow-Headers", requestHeaders);
          }
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export type { ModuleFederationOptions };
