import type { Router } from "vue-router";

import { isBenignRuntimeNoise, normalizeErrorText } from "./benign-runtime-noise";
import { resolveQiankunAppNameFromEntry } from "./frontend-config";
import { BIMOPS_PC_TERMINAL } from "./legacy-constants";
import { type LegacyQiankunMenu, buildPermissionConfigFromMenus } from "./legacy-menu-permission";
import { type LegacyQiankunAuth, type LegacySessionStorage, syncLegacyApplicationForMicroApp } from "./legacy-qiankun-auth";

export interface LegacyMicroAppConfig {
  name: string;
  entry: string;
}

export interface MicroAppDescriptor {
  name: string;
  entry: string;
  container: string;
  activeRule: string | string[];
  props: {
    router: Router | undefined;
    base: string;
    permissionConfig: { menuConfig: unknown[]; functionCodes: string[] };
    routes: unknown[];
    auth: LegacyQiankunAuth;
  };
}

/** 工作台微应用：独立容器与精简 props（对齐旧仓 platform/index.vue）。 */
export interface WorkbenchMicroAppDescriptor {
  name: string;
  entry: string;
  container: string;
  activeRule: string[];
  props: {
    base: string;
    auth: LegacyQiankunAuth;
  };
}

export type RegisterableMicroApp = MicroAppDescriptor | WorkbenchMicroAppDescriptor;

export const WORKBENCH_CONTAINER_SELECTOR = "#workbench-container";
export const WORKBENCH_ACTIVE_RULES = ["/index", "/workbench"] as const;

export interface QiankunBridgeDeps {
  permissionConfig: { menuConfig: unknown[]; functionCodes: string[] };
  getAuth: () => { token?: string; tenant?: string; terminal?: string };
  getRoutes: () => unknown[];
  router?: Router;
  /** 可注入，便于单测；默认用浏览器 sessionStorage。 */
  getSessionStorage?: () => LegacySessionStorage | undefined;
  /** 按微应用 code 取旧仓菜单（含 alias），写入 GH-currentMenus / permissionConfig。 */
  getLegacyMenusForApp?: (appCode: string) => LegacyQiankunMenu[];
}

export function buildMicroAppDescriptors(microApps: LegacyMicroAppConfig[], deps: QiankunBridgeDeps): MicroAppDescriptor[] {
  return microApps.map((item) => {
    const base = `/portal/${item.name}/`;
    return {
      name: item.name,
      entry: item.entry,
      container: "#appContainer",
      activeRule: base,
      props: {
        router: deps.router,
        base,
        permissionConfig: deps.permissionConfig,
        routes: deps.getRoutes(),
        auth: resolveWorkbenchAuthProps(deps.getAuth()),
      },
    };
  });
}

/**
 * qiankun `registerMicroApps`/`addGlobalUncaughtErrorHandler` 的最小依赖形状，由调用方（`main.ts`）
 * 注入真实的 qiankun 实现；测试里注入假实现，直接验证「清单非空时真的会调用 registerMicroApps」这条路径，
 * 不依赖 `main.ts` 里那段永远走不到的分支。
 */
export interface MicroAppLifeCycles {
  // 返回 Promise 以兼容 qiankun FrameworkLifeCycles；beforeLoad 可收到 app 以便刷新 props.auth。
  beforeLoad?: (app?: RegisterableMicroApp) => Promise<void>;
  beforeMount?: (app?: RegisterableMicroApp) => Promise<void>;
  afterMount?: () => Promise<void>;
}

export interface MicroAppRegistrar {
  registerMicroApps: (apps: RegisterableMicroApp[], lifeCycles?: MicroAppLifeCycles) => void;
  addGlobalUncaughtErrorHandler: (handler: (...args: unknown[]) => unknown) => void;
}

/** 对齐旧仓 `start({ prefetch: false })`，避免注册清单时预拉全部 entry。 */
export const QIANKUN_START_OPTIONS = { prefetch: false as const };

/** qiankun global handler：忽略 ResizeObserver 等噪声，避免误报「微应用加载失败」。 */
export function handleQiankunUncaughtError(event: unknown, onLoadError: (() => void) | undefined, label: string): void {
  if (isBenignRuntimeNoise(event) || isBenignRuntimeNoise(normalizeErrorText(event))) {
    return;
  }
  console.error(`${label} failed to load`);
  onLoadError?.();
}

export interface LegacyMicroAppLifecycleHooks {
  onBeforeLoad?: () => void;
  onAfterMount?: () => void;
  onLoadError?: () => void;
}

/**
 * 把「清单是否非空」的判断和「注册 + 生命周期回调接线」封装到一个可测试的函数里。
 * 清单为空时如实什么都不做并返回 false——这不是死分支，而是诚实反映「当前没有真实旧仓微应用需要接入」
 * 这个运行时状态；一旦 `microApps` 非空（`legacy-micro-apps-source.ts` 解析出真实运行时清单），
 * 这条路径会被自然激活，不需要改动周围结构。
 */
export function registerLegacyMicroApps(
  microApps: LegacyMicroAppConfig[],
  deps: QiankunBridgeDeps,
  registrar: MicroAppRegistrar,
  hooks: LegacyMicroAppLifecycleHooks = {},
): boolean {
  if (microApps.length === 0) {
    return false;
  }
  function syncApplicationContext(app: RegisterableMicroApp | undefined): void {
    // TODO(ADR-0031): 迁完后删除——门户子应用仍读 GH-currentApplication / GH-currentMenus
    const appName = app && typeof app.name === "string" ? app.name : "";
    const storage = deps.getSessionStorage?.() ?? (typeof sessionStorage !== "undefined" ? sessionStorage : undefined);
    const menus = appName && deps.getLegacyMenusForApp ? deps.getLegacyMenusForApp(appName) : [];
    if (appName && storage) {
      syncLegacyApplicationForMicroApp(storage, appName, menus);
    }
    // 对齐旧仓 handlePermissionConfig：刷新 props，子应用 usePageName 依赖 GH-currentMenus.alias
    if (app && "props" in app && app.props && typeof app.props === "object") {
      const permission = buildPermissionConfigFromMenus(menus);
      deps.permissionConfig.menuConfig = permission.menuConfig;
      deps.permissionConfig.functionCodes = permission.functionCodes;
      const props = app.props as MicroAppDescriptor["props"];
      props.permissionConfig = deps.permissionConfig;
      props.routes = permission.routes;
    }
  }

  registrar.registerMicroApps(buildMicroAppDescriptors(microApps, deps), {
    beforeLoad: async (app) => {
      refreshWorkbenchAuthProps(app, deps.getAuth);
      syncApplicationContext(app);
      hooks.onBeforeLoad?.();
    },
    beforeMount: async (app) => {
      refreshWorkbenchAuthProps(app, deps.getAuth);
      syncApplicationContext(app);
    },
    afterMount: async () => {
      hooks.onAfterMount?.();
    },
  });
  registrar.addGlobalUncaughtErrorHandler((event) => {
    handleQiankunUncaughtError(event, hooks.onLoadError, "qiankun micro app");
  });
  return true;
}

export function resolveWorkbenchAuthProps(auth: { token?: string; tenant?: string; terminal?: string }): LegacyQiankunAuth {
  return {
    token: auth.token ?? "",
    tenant: auth.tenant ?? "",
    terminal: auth.terminal?.trim() || BIMOPS_PC_TERMINAL,
  };
}

export function buildWorkbenchDescriptor(
  entry: string,
  getAuth: () => { token?: string; tenant?: string; terminal?: string },
): WorkbenchMicroAppDescriptor {
  return {
    // vite-plugin-qiankun 导出名须与 register name 一致（cube-workbench-app，非旧 workbench-migrate）
    name: resolveQiankunAppNameFromEntry(entry),
    entry,
    container: WORKBENCH_CONTAINER_SELECTOR,
    activeRule: [...WORKBENCH_ACTIVE_RULES],
    props: {
      base: "/",
      auth: resolveWorkbenchAuthProps(getAuth()),
    },
  };
}

function refreshWorkbenchAuthProps(
  app: RegisterableMicroApp | undefined,
  getAuth: () => { token?: string; tenant?: string; terminal?: string },
): void {
  if (!app || !("props" in app) || !app.props || typeof app.props !== "object") {
    return;
  }
  const props = app.props as { auth?: LegacyQiankunAuth };
  props.auth = resolveWorkbenchAuthProps(getAuth());
}

/**
 * 注册工作台 qiankun 应用（`#workbench-container`，与门户 `#appContainer` 分离）。
 * `entry` 为空时不注册并返回 false。
 * beforeLoad/beforeMount 刷新 props.auth（对齐门户 handlePermissionConfig 写 auth）。
 */
export function registerWorkbenchMicroApp(
  entry: string,
  getAuth: () => { token?: string; tenant?: string; terminal?: string },
  registrar: MicroAppRegistrar,
  hooks: LegacyMicroAppLifecycleHooks = {},
): boolean {
  if (!entry) {
    return false;
  }
  registrar.registerMicroApps([buildWorkbenchDescriptor(entry, getAuth)], {
    beforeLoad: async (app) => {
      refreshWorkbenchAuthProps(app, getAuth);
      hooks.onBeforeLoad?.();
    },
    beforeMount: async (app) => {
      refreshWorkbenchAuthProps(app, getAuth);
    },
    afterMount: async () => {
      hooks.onAfterMount?.();
    },
  });
  registrar.addGlobalUncaughtErrorHandler((event) => {
    handleQiankunUncaughtError(event, hooks.onLoadError, "qiankun workbench micro app");
  });
  return true;
}
