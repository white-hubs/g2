import { assertDomainModule, type DomainContext, type MenuContributionNode } from "@g2-composition/contract";
import type { AuthClient } from "@g2-contract/auth";
import type { FileClient } from "@g2-contract/file";
import type { MdataClient } from "@g2-contract/mdata";
import type { OuaaClient } from "@g2-contract/ouaa";
import { createPinia, setActivePinia } from "pinia";
import { createApp, h, markRaw, nextTick, reactive, shallowRef } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import { registerAiAssistantPlaceholder } from "./ai-assistant-lazy";
import App from "./App";
import { firstPathFromLegacyMenus, lookupGroupKeyForAppRef } from "./app-code-group-index";
import { createAuthGuard } from "./auth-guard";
import { buildAuthHeaders } from "./auth-headers";
import { AUTH_LOGOUT_REQUESTED_EVENT, installAuthLogoutHandler } from "./auth-logout-handler";
import {
  type AuthPersistenceLevel,
  DEFAULT_AUTH_PERSISTENCE_LEVEL,
  clearPersistedAuth,
  loadPersistedAuth,
  persistAuth,
} from "./auth-session";
import { AUTH_SESSION_ENDED_EVENT } from "./auth-session-ended";
import { setBootstrapStatus, traceAsync } from "./bootstrap-trace";
import { composeFromProfile } from "./compose-from-profile";
import { installCrashReporting } from "./crash-reporting";
import { installCssStyleIndexedGuard } from "./css-style-indexed-guard";
import { loadShellCubeIconfont } from "./cube-iconfont";
import { createEventBus } from "./event-bus";
import { filterLocallyOverriddenQiankunApps, filterMigratedQiankunApps } from "./filter-migrated-qiankun-apps";
import { loadAndApplyFrontendConfig } from "./frontend-config";
import { BIMOPS_PC_TERMINAL } from "./legacy-constants";
import { resolveLegacyMicroApps, resolveWorkbenchEntry } from "./legacy-micro-apps-source";
import { clearLegacyQiankunAuth, syncLegacyQiankunAuth, syncLegacyUserInfo } from "./legacy-qiankun-auth";
import { type Logger, bindLibraryPlatformApis, configureStaticResourceBase, createLogger } from "./library-platform-apis";
import { loadResolvedProfile } from "./load-resolved-profile";
import {
  buildMfDomainIntentIndex,
  buildMfDomainMenuOwningIndex,
  intentCodesFromRemoteConfig,
  navigateCodesFromRemoteConfig,
  resolveMfDomainNavigatePath,
} from "./mf-domain-navigate";
import { installMfRootToApplicationBridge } from "./mf-root-to-application-bridge";
import { installNavigateIntentHandler } from "./navigate-intent-handler";
import { childrenFromDomainMenuContribution } from "./ouaa-navigation";
import { loadOuaaDisplayGroups, loadOuaaGroupMenus } from "./ouaa-navigation-loader";
import { PERSON_MANAGE_DOMAIN, PERSON_MANAGE_FIRST_PATH, PERSON_MANAGE_MENU_CONTRIBUTION } from "./person-manage-menu";
import {
  AI_ASSISTANT_PLATFORM_NAME,
  DEFERRED_PRELOAD,
  platformsForAuthState,
  platformsForChromeShell,
  scheduleDeferredPreload,
} from "./platform-load-policy";
import { runQiankunAfterShellMount } from "./qiankun-after-mount";
import { type MicroAppRegistrar, QIANKUN_START_OPTIONS, registerLegacyMicroApps, registerWorkbenchMicroApp } from "./qiankun-bridge";
import { buildBaseRoutes } from "./routes";
import { SHELL_NAVIGATE_ERROR_EVENT } from "./shell-navigate-error";
import { useFunctionCodesStore } from "./stores/function-codes";
import { usePortalNavigationStore } from "./stores/portal-navigation";
import { useQiankunMountStatusStore } from "./stores/qiankun-mount-status";
import { logoIdFromTenantInfo, logoUrlFromFileInfo } from "./tenant-logo";
import {
  type OutsideTenantItem,
  type TenantMineItem,
  parseOutsideTenants,
  parseTenantMineList,
  shouldShowTenantSwitch,
} from "./tenant-mine";
import { TenantSwitchError, switchTenantWithRefreshToken } from "./tenant-switch";
import { extractUserFunctionCodes } from "./user-function-codes";
import {
  type UserProfileInfo,
  displayNameFromAccessToken,
  displayNameFromUserInfo,
  legacyUserInfoFromProfile,
  userIdFromAccessToken,
} from "./user-profile";
import { WORKBENCH_GROUP_KEY, WORKBENCH_PATH_GLOBAL_KEY, workbenchMenuContribution, isWorkbenchGroupKey } from "./workbench-group";

import "./app.css";
import "./styles/tailwind.css";

/** 库型 Platform 绑定前用 console 兜底；绑定后换成 loggerPlatform 实现（ADR-0056）。 */
const bootConsoleLogger: Logger = {
  debug: (message, context) => (context === undefined ? console.debug(message) : console.debug(message, context)),
  info: (message, context) => (context === undefined ? console.info(message) : console.info(message, context)),
  warn: (message, context) => (context === undefined ? console.warn(message) : console.warn(message, context)),
  error: (message, context) => (context === undefined ? console.error(message) : console.error(message, context)),
};
let shellLogger: Logger = bootConsoleLogger;

/** 启动关键 await：3s 未完成打 warn，20s 超时抛错；状态同步到 #app 避免纯白屏。 */
function bootStep<T>(label: string, work: () => Promise<T>, overrides?: { warnAfterMs?: number; timeoutMs?: number }): Promise<T> {
  return traceAsync(label, work, {
    logger: shellLogger,
    onStatus: setBootstrapStatus,
    ...overrides,
  });
}

/** Vite 联调冷启动要串行预打包多个 remote；lockfile 变更后首轮依赖优化常超过 60s，DEV 再放宽。 */
const PLATFORM_INSTALL_TIMEOUT_MS = import.meta.env.DEV ? 180_000 : 20_000;

async function bootstrap() {
  setBootstrapStatus({ title: "正在启动…", kind: "loading" });

  // Pinia 提前创建并激活（早于 createApp/app.use(pinia)），这样 qiankun 生命周期回调（早于 app 挂载触发）
  // 就能直接写入 useQiankunMountStatusStore()，不用等到 app.use(pinia) 之后才有可用的 store 实例。
  const pinia = createPinia();
  setActivePinia(pinia);

  const profile = await bootStep("loadResolvedProfile", () => loadResolvedProfile());
  const hasMfWorkbench = profile.remotes.some((remote) => remote.name === "workbench");
  (globalThis as Record<string, unknown>)[WORKBENCH_PATH_GLOBAL_KEY] = hasMfWorkbench ? "/d/workbench" : "/index";

  // 对齐旧仓 main.js#getProjectInfo：字典 FRONTEND_CONFIG → window.config（homeEntry / microApps）。
  // 不挡未登录 Platform 安装：与 compose / 登录壳并行，qiankun 注册前再 await。
  const frontendConfigPromise = bootStep("loadFrontendConfig", () => loadAndApplyFrontendConfig(window)).catch((error) => {
    // 字典接口挂起 / DEV 下壳被 domain 预构建饿死时，bootStep 会超时；旧仓同路径是 catch 空操作。
    shellLogger.warn("loadFrontendConfig failed; keeping window.config defaults", { error: String(error) });
    return null;
  });

  async function localDevRuntimeState(): Promise<{ mode: "legacy-compat" | "g2-profile"; localRemoteNames: string[] } | undefined> {
    if (!import.meta.env.DEV) {
      return undefined;
    }
    try {
      const state = (await fetch("/__g2_dev/remotes").then((response) => response.json())) as {
        mode?: "legacy-compat" | "g2-profile";
        remotes?: Array<{ logicalName?: string }>;
      };
      if (state.mode !== "legacy-compat" && state.mode !== "g2-profile") {
        return undefined;
      }
      return {
        mode: state.mode,
        localRemoteNames: (state.remotes ?? []).flatMap((remote) => (remote.logicalName ? [remote.logicalName] : [])),
      };
    } catch {
      // Dev coordination is optional for production-like explicit Profiles.
      return undefined;
    }
  }

  const composition = await bootStep("composeFromProfile", () =>
    composeFromProfile(profile, {
      loadLocalRuntimeModule: import.meta.env.DEV
        ? async (remoteName, exposed) => {
            try {
              const state = await localDevRuntimeState();
              if (!state) return undefined;
              const loader = (await import("./local-dev-runtime")).loadLocalDevRuntimeModule;
              return loader(remoteName, exposed, state);
            } catch (error) {
              console.error(`[g2-dev] failed to load local runtime module ${remoteName}/${exposed}`, error);
              throw error;
            }
          }
        : undefined,
      onPlatformModuleLoaded: (platformName, elapsedMs) => {
        shellLogger.info(`loaded platform module: ${platformName}`, { elapsedMs });
      },
    }),
  );
  if (import.meta.env.DEV) {
    window.addEventListener("__g2_dev_remote_update", () => {
      void composition.softReloadActiveRemoteDomains().catch((error) => {
        shellLogger.error("failed to soft reload active local Remote", { error: String(error) });
      });
    });
  }

  // 库型 Platform：compose 已 registerRemotes，经 URL 动态 load 绑定 API（非 workspace 静态依赖）。
  await bootStep("bindLibraryPlatformApis", () => bindLibraryPlatformApis(composition.loadPlatformExposed));
  shellLogger = createLogger("shell-pc");
  installCssStyleIndexedGuard(window);
  installCrashReporting(window, shellLogger);
  // 静态资源 CDN 前缀：来自注册表逻辑名 staticResourceBase（已解析进 Profile），经 globalThis 供各 Platform 同读。
  configureStaticResourceBase(profile.staticResourceBaseUrl);
  // Cube SVG Symbol：壳 public 托管，启动注入一次（勿走 CDN /resource 改写）。
  // It is visual enhancement only: a delayed script load must not block login.
  void bootStep("loadCubeIconfont", () => loadShellCubeIconfont()).catch((error) => {
    shellLogger.warn("loadCubeIconfont failed; CubeIcon may render blank", { error: String(error) });
  });

  const authStorages = { local: window.localStorage, session: window.sessionStorage };
  const authState = reactive({
    token: undefined as string | undefined,
    tenant: "",
    refreshToken: undefined as string | undefined,
    userName: "",
    logoUrl: "",
    persistence: DEFAULT_AUTH_PERSISTENCE_LEVEL as AuthPersistenceLevel,
  });
  const tenantState = reactive({
    tenants: [] as TenantMineItem[],
    outsideTenants: [] as OutsideTenantItem[],
  });

  // 刷新后从 local（默认）或 session 恢复鉴权；须在路由守卫注册前写入，否则会误跳登录页。
  const restoredAuth = loadPersistedAuth(authStorages);
  if (restoredAuth) {
    authState.token = restoredAuth.auth.token;
    authState.tenant = restoredAuth.auth.tenant;
    authState.refreshToken = restoredAuth.auth.refreshToken;
    authState.persistence = restoredAuth.level;
    authState.userName = displayNameFromAccessToken(restoredAuth.auth.token);
    syncLegacyQiankunAuth(window, {
      token: restoredAuth.auth.token,
      tenant: restoredAuth.auth.tenant,
      terminal: BIMOPS_PC_TERMINAL,
    });
    // 资料接口异步返回前，先用 JWT id + 展示名写入 GH-UserInfo（工作台欢迎条与个人资料深链共用）。
    const restoredUserId = userIdFromAccessToken(restoredAuth.auth.token);
    if (restoredUserId) {
      const restoredDisplayName = displayNameFromAccessToken(restoredAuth.auth.token);
      syncLegacyUserInfo(window.sessionStorage, {
        id: restoredUserId,
        ...(restoredDisplayName ? { name: restoredDisplayName } : {}),
      });
    }
  }

  let ctx: DomainContext;

  async function loadFunctionCodes(): Promise<void> {
    try {
      const ouaa = await ctx.ensureClient<OuaaClient>("ouaaClient");
      const permissions = await ouaa.getUserPermissions();
      useFunctionCodesStore().setCodes(extractUserFunctionCodes(permissions));
    } catch (error) {
      shellLogger.error("failed to load function codes", { error: String(error) });
    }
  }

  /**
   * 顶栏展示名兜底：资料接口（旧仓多为 GET；响应可能仍带 `{ code:200, data }`）。
   * 登录/恢复会话时已优先从 JWT `name` 取值；接口成功时再覆盖为资料 name。
   */
  async function loadUserDisplayName(): Promise<void> {
    try {
      const ouaa = await ctx.ensureClient<OuaaClient>("ouaaClient");
      const userProfile = (await ouaa.getUserProfile()) as UserProfileInfo;
      const displayName = displayNameFromUserInfo(userProfile);
      if (displayName) {
        authState.userName = displayName;
      }
      // 对齐旧仓 mf-root initUserInfo：完整用户对象写入 GH-UserInfo（personal-migrate / 工作台欢迎条等依赖）。
      const legacyUser = legacyUserInfoFromProfile(userProfile);
      if (legacyUser) {
        syncLegacyUserInfo(window.sessionStorage, legacyUser);
        return;
      }
      // 资料无 id 时仍把展示名合并进已有 GH-UserInfo，避免顶栏已更新、工作台仍显示「用户」。
      if (!displayName) {
        return;
      }
      const token = authState.token;
      if (!token) {
        return;
      }
      const existingId = userIdFromAccessToken(token);
      if (!existingId) {
        return;
      }
      let existing: Record<string, unknown> = {};
      try {
        const raw = window.sessionStorage.getItem("GH-UserInfo");
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            existing = parsed as Record<string, unknown>;
          }
        }
      } catch {
        existing = {};
      }
      syncLegacyUserInfo(window.sessionStorage, { ...existing, id: existingId, name: displayName });
    } catch (error) {
      shellLogger.error("failed to load user profile display name", { error: String(error) });
    }
  }

  /** 顶栏租户 Logo：对齐旧仓 getTenantInfo + getImage；失败则保留默认 cube-icon。 */
  async function loadTenantLogo(): Promise<void> {
    if (!authState.tenant) {
      return;
    }
    try {
      const ouaa = await ctx.ensureClient<OuaaClient>("ouaaClient");
      const tenantInfo = await ouaa.getTenantUnderTenant(authState.tenant);
      const logoId = logoIdFromTenantInfo(tenantInfo as Parameters<typeof logoIdFromTenantInfo>[0]);
      if (!logoId) {
        return;
      }
      const file = await ctx.ensureClient<FileClient>("fileClient");
      const fileInfo = await file.getFile(logoId);
      const logoUrl = logoUrlFromFileInfo(fileInfo as Parameters<typeof logoUrlFromFileInfo>[0]);
      if (logoUrl) {
        authState.logoUrl = logoUrl;
      }
    } catch (error) {
      shellLogger.error("failed to load tenant logo", { error: String(error) });
    }
  }

  /**
   * 进入主应用即拉企业列表（对齐旧仓 user-dropdown onMounted getData），非按需。
   * 经 `mdataClient.getTenantMine` + feature.outsideTenants。
   */
  async function loadTenantMineList(): Promise<void> {
    try {
      const mdata = await ctx.ensureClient<MdataClient>("mdataClient");
      const body = await mdata.getTenantMine();
      tenantState.tenants = parseTenantMineList(body);
      const feature =
        window.config && typeof window.config === "object" && "feature" in window.config
          ? (window.config as { feature?: unknown }).feature
          : undefined;
      tenantState.outsideTenants = parseOutsideTenants(feature);
    } catch (error) {
      shellLogger.error("failed to load tenant mine list", { error: String(error) });
      tenantState.tenants = [];
    }
  }

  /**
   * 对齐旧仓 checkEnterprise：外链 webSiteUrl 新开页；否则 refresh_token 换票后整页刷新。
   * createHttpClient 的 getAuthHeaders 会覆盖 init.headers，故临时改 authState.tenant。
   */
  async function handleSelectTenant(tenant: TenantMineItem): Promise<void> {
    if (tenant.webSiteUrl) {
      const token = authState.token ?? "";
      const refresh = authState.refreshToken ?? "";
      const url = `${tenant.webSiteUrl}?access_token=${encodeURIComponent(token)}&nowEnterprise=${encodeURIComponent(
        JSON.stringify({ code: authState.tenant }),
      )}&refresh_token=${encodeURIComponent(refresh)}`;
      window.open(url);
      return;
    }

    const previousTenant = authState.tenant;
    authState.tenant = tenant.code;
    try {
      const result = await switchTenantWithRefreshToken(
        {
          nextTenantCode: tenant.code,
          currentTenantCode: previousTenant,
          refreshToken: authState.refreshToken ?? "",
          enabled: tenant.enabled,
        },
        {
          postRefresh: async (body) => {
            const auth = await ctx.ensureClient<AuthClient>("authClient");
            return auth.exchangeToken(body);
          },
        },
      );
      if (result === "same" || result === "disabled" || result === "external") {
        authState.tenant = previousTenant;
        return;
      }
      authState.token = result.token;
      authState.tenant = result.tenant;
      if (result.refreshToken) {
        authState.refreshToken = result.refreshToken;
      }
      persistAuth(
        authStorages,
        {
          token: result.token,
          tenant: result.tenant,
          refreshToken: authState.refreshToken,
        },
        authState.persistence,
      );
      syncLegacyQiankunAuth(window, {
        token: result.token,
        tenant: result.tenant,
        terminal: BIMOPS_PC_TERMINAL,
      });
      window.location.reload();
    } catch (error) {
      authState.tenant = previousTenant;
      if (error instanceof TenantSwitchError) {
        throw error;
      }
      throw new TenantSwitchError(error instanceof Error ? error.message : "切换企业失败");
    }
  }

  /** 同分组 menus 并发去重：多次切到同一组只打一次接口，调用方都 await 同一 Promise。 */
  const menusInflight = new Map<string, Promise<void>>();

  const mfDomainRemotes = profile.remotes.map((remote) => ({
    name: remote.name,
    basePath: remote.basePath,
    navigateCodes: navigateCodesFromRemoteConfig(remote.config),
    intentCodes: intentCodesFromRemoteConfig(remote.config),
  }));
  /** 侧栏剥 OUAA 叶子：仅菜单归属码。 */
  const mfDomainMenuOwningIndex = buildMfDomainMenuOwningIndex(mfDomainRemotes);
  /** navigate-intent：Intent 可跳码（可与菜单归属码不同集）。 */
  const mfDomainIntentIndex = buildMfDomainIntentIndex(mfDomainRemotes);

  /** basePath + appCode → Domain menuContribution 子树（已迁应用侧栏叶子，ADR-0059）。 */
  const domainMenuChildrenByBasePath = new Map<string, MenuContributionNode[]>();

  async function loadDomainMenuChildren(basePath: string, appCode = ""): Promise<MenuContributionNode[]> {
    const cacheKey = `${basePath}:${appCode}`;
    const cached = domainMenuChildrenByBasePath.get(cacheKey);
    if (cached) {
      return cached;
    }
    const remote = profile.remotes.find((item) => item.basePath === basePath);
    if (!remote) {
      return [];
    }
    try {
      const loaded = await composition.loadPlatformExposed(remote.name, "domain");
      const asserted = assertDomainModule(
        (loaded as { domainModule?: unknown; default?: unknown }).domainModule ?? (loaded as { default?: unknown }).default ?? loaded,
      );
      if (!asserted.ok) {
        shellLogger.error("domain menuContribution assert failed", { remote: remote.name, errors: asserted.errors });
        return [];
      }
      const roots = asserted.module.menuContribution;
      const rootMap = remote.config?.menuContributionRoots;
      const rootLabel =
        rootMap && typeof rootMap === "object" && !Array.isArray(rootMap)
          ? String((rootMap as Record<string, unknown>)[appCode] ?? "")
          : "";
      const selectedRoot = rootLabel ? roots?.find((item) => item.label === rootLabel) : undefined;
      const children = childrenFromDomainMenuContribution(selectedRoot ? [selectedRoot] : roots);
      domainMenuChildrenByBasePath.set(cacheKey, children);
      return children;
    } catch (error) {
      shellLogger.error("failed to load domain menuContribution", { remote: remote.name, error: String(error) });
      return [];
    }
  }

  /**
   * 按需拉某一顶栏分组的 menus（进入该分组时）。已 ready 则立刻返回。
   */
  async function ensureGroupMenus(groupKey: string): Promise<void> {
    if (!groupKey) {
      return;
    }
    const nav = usePortalNavigationStore();
    if (nav.getMenuStatus(groupKey) === "ready") {
      return;
    }
    // 工作台不走 OUAA menus：壳层自持，点 Tab 进 /index（对齐旧仓 loadWorkBench）。
    if (isWorkbenchGroupKey(groupKey)) {
      nav.registerMenuContribution(WORKBENCH_GROUP_KEY, workbenchMenuContribution(hasMfWorkbench));
      nav.setMenuStatus(WORKBENCH_GROUP_KEY, "ready");
      return;
    }
    const inflight = menusInflight.get(groupKey);
    if (inflight) {
      return inflight;
    }
    const task = (async () => {
      nav.setMenuStatus(groupKey, "loading");
      try {
        const ouaa = await ctx.ensureClient<OuaaClient>("ouaaClient");
        const mapped = await loadOuaaGroupMenus(ouaa, groupKey, {
          resolveAppPath: (code) => resolveMfDomainNavigatePath(code, undefined, mfDomainMenuOwningIndex),
          resolveAppLabel: (code, currentLabel) => {
            const basePath = resolveMfDomainNavigatePath(code, undefined, mfDomainMenuOwningIndex);
            const remote = profile.remotes.find((item) => item.basePath === basePath);
            const labels = remote?.config?.menuLabels;
            return labels && typeof labels === "object" && !Array.isArray(labels)
              ? String((labels as Record<string, unknown>)[code] ?? currentLabel)
              : currentLabel;
          },
        });
        // 已迁应用节点被去掉 OUAA portal 叶子后，按 MF basePath 挂回 Domain menuContribution。
        const nodes: MenuContributionNode[] = [];
        for (const [index, node] of mapped.nodes.entries()) {
          if (node.children?.length || !node.path?.startsWith("/d/")) {
            nodes.push(node);
            continue;
          }
          const children = await loadDomainMenuChildren(node.path, mapped.appCodes[index] ?? "");
          nodes.push(children.length ? { ...node, children } : node);
        }
        nav.registerMenuContribution(groupKey, nodes);
        nav.registerLegacyMenusByAppCode(mapped.legacyMenusByAppCode);
        nav.setMenuStatus(groupKey, "ready");
      } catch (error) {
        nav.setMenuStatus(groupKey, "error");
        shellLogger.error("failed to load OUAA group menus", { groupKey, error: String(error) });
      } finally {
        menusInflight.delete(groupKey);
      }
    })();
    menusInflight.set(groupKey, task);
    return task;
  }

  /**
   * 顶栏分组只来自 `terminal-application-groups`；默认首个分组再按需拉 menus。
   * 无 stub 骨架。
   */
  /** 工作台应用中心按 code 跳转时用；随 terminal-application-groups 刷新。 */
  let appCodeToGroupKey = new Map<string, string>();
  /** navigate-intent 在分组索引就绪前应等待（登录成功 / 刷新恢复都会刷新）。 */
  let portalNavReady: Promise<void> = Promise.resolve();

  async function loadPortalNavigationFromOuaa(): Promise<void> {
    const nav = usePortalNavigationStore();
    nav.setGroupsStatus("loading");
    try {
      const ouaa = await ctx.ensureClient<OuaaClient>("ouaaClient");
      const loaded = await loadOuaaDisplayGroups(ouaa);
      nav.setDisplayGroups(loaded.groups);
      appCodeToGroupKey = loaded.codeToGroupKey;
      nav.setGroupsStatus("ready");
      // 按当前 URL 校正分组（避免刷新停在门户页时侧栏仍挂默认「工作台」）。
      // 登录成功时尚在 /login：syncNavFromPath 对鉴权全页早退，不会顺序扫 menus；真正校正在 push("/index") 后由 App watch 触发。
      const { syncNavFromPath } = await import("./sync-nav-from-path");
      await syncNavFromPath(router.currentRoute.value.fullPath, {
        nav,
        ensureGroupMenus,
        resolveGroupKeyForAppRef: (appRef) => lookupGroupKeyForAppRef(appCodeToGroupKey, appRef),
      });
      // 预拉全部顶栏分组 menus：顶栏搜索用全局 menuTree，仅「当前分组按需」时
      // 工作台下搜不到其它组应用（如空 menuVOS 的门禁 DOORMANAGE）。
      await Promise.all(loaded.groups.map((group) => ensureGroupMenus(group.key)));
    } catch (error) {
      nav.setGroupsStatus("error");
      shellLogger.error("failed to load OUAA display groups", { error: String(error) });
    }
  }

  async function resolvePathForAppCode(code: string, params?: { appCode?: string; entry?: string }): Promise<string | undefined> {
    const mfPath = resolveMfDomainNavigatePath(code, params, mfDomainIntentIndex);
    if (mfPath) {
      return mfPath;
    }
    const groupKey = lookupGroupKeyForAppRef(appCodeToGroupKey, code);
    if (!groupKey) {
      return undefined;
    }
    await ensureGroupMenus(groupKey);
    const menus = usePortalNavigationStore().getLegacyMenusForApp(code);
    return firstPathFromLegacyMenus(menus);
  }

  /** 登录成功后再装已登录必装集 / chrome slots（冷启动有 token 时也会赋值调用）。 */
  let ensureAuthenticatedShell: () => Promise<void> = async () => {
    throw new Error("ensureAuthenticatedShell called before shell bootstrap completed");
  };

  async function onLoginSuccess(result: {
    token: string;
    tenant: string;
    refreshToken?: string;
    persistence?: AuthPersistenceLevel;
  }): Promise<void> {
    authState.token = result.token;
    authState.tenant = result.tenant;
    authState.refreshToken = result.refreshToken;
    authState.persistence = result.persistence ?? DEFAULT_AUTH_PERSISTENCE_LEVEL;
    authState.userName = displayNameFromAccessToken(result.token);
    authState.logoUrl = "";
    persistAuth(authStorages, { token: result.token, tenant: result.tenant, refreshToken: result.refreshToken }, authState.persistence);
    syncLegacyQiankunAuth(window, {
      token: result.token,
      tenant: result.tenant,
      terminal: BIMOPS_PC_TERMINAL,
    });
    const loginUserId = userIdFromAccessToken(result.token);
    if (loginUserId) {
      const loginDisplayName = displayNameFromAccessToken(result.token);
      syncLegacyUserInfo(window.sessionStorage, {
        id: loginUserId,
        ...(loginDisplayName ? { name: loginDisplayName } : {}),
      });
    }
    setBootstrapStatus({ title: "正在进入系统…", detail: "onLoginSuccess", kind: "loading" });
    await ensureAuthenticatedShell();
    portalNavReady = loadPortalNavigationFromOuaa();
    // 跳转临界区：权限 + 导航。显示名/Logo/租户列表后置，不挡进 /index。
    await Promise.all([loadFunctionCodes(), portalNavReady]);
    void loadUserDisplayName();
    void loadTenantLogo();
    void loadTenantMineList();
    // qiankun 在 history 变更时同步查 #workbench-container；等 Vue 刷完登录→主壳布局再跳。
    await nextTick();
    if (!document.querySelector("#workbench-container")) {
      shellLogger.error("workbench container missing before post-login navigation");
    }
    await router.push("/index");
  }

  const router = createRouter({
    history: createWebHistory(),
    routes: buildBaseRoutes(
      (slot) => composition.loadPlatformSlot("pcAuth", slot),
      () => ({ ctx, onLoginSuccess }),
      { useMfWorkbench: hasMfWorkbench },
    ),
  });
  router.beforeEach(createAuthGuard({ getToken: () => authState.token, whiteList: ["login", "verifyAuth"] }));

  // 个人中心菜单（旧仓 routes/person-manage-menus.ts）是 Shell 自持的贡献，不是某个 Platform/Domain 的
  // 菜单——用和域一样的 registerMenuContribution 机制注册，不需要单独的"静态应用注册表"概念（ADR-0036）。
  // 顶栏分组 / 侧栏业务菜单默认不 stub，一律等 OUAA：`terminal-application-groups` + 按需 `group/menus`。
  usePortalNavigationStore().registerMenuContribution(PERSON_MANAGE_DOMAIN, PERSON_MANAGE_MENU_CONTRIBUTION);

  // 工作台 + 门户 microApps：register/start 必须在 app.mount 之后；start 必须 prefetch:false。
  // entry/清单在 await FRONTEND_CONFIG 之后解析（见下方），避免静态兜底被过早冻结。
  const qiankunMountStatus = useQiankunMountStatusStore();

  function currentQiankunAuth() {
    return {
      token: authState.token ?? "",
      tenant: authState.tenant,
      terminal: BIMOPS_PC_TERMINAL,
    };
  }

  ctx = {
    bus: createEventBus(),
    // ADR-0046：Authorization / tenant / terminal 三件套；terminal 对齐旧仓 bimops-manage-web。
    getAuthHeaders: (): Record<string, string> => buildAuthHeaders({ token: authState.token, tenant: authState.tenant }),
    loadPlatform: composition.loadPlatformExposed,
    loadRuntimeCommon: composition.loadRuntimeCommon,
    loadPageLibrary: composition.loadPageLibraryExposed,
    getFunctionCodes: () => useFunctionCodesStore().snapshot(),
    ensureClient: (clientName) => composition.ensureClient(clientName, ctx),
  };
  // 与旧仓 `__CUBE_EVENT_BUS_INSTANCE__` 区分：Platform 共享总线（消息/报警弹窗等）。验收与桥接可经此注入。
  (window as Window & { __G2_PLATFORM_BUS__?: typeof ctx.bus }).__G2_PLATFORM_BUS__ = ctx.bus;

  let app!: ReturnType<typeof createApp>;
  composition.attachToRouter(router, {
    getApp: () => app,
    getDomainContext: () => ctx,
  });

  installAuthLogoutHandler(ctx.bus, () => {
    authState.token = undefined;
    authState.tenant = "";
    authState.refreshToken = undefined;
    authState.userName = "";
    authState.logoUrl = "";
    tenantState.tenants = [];
    tenantState.outsideTenants = [];
    clearPersistedAuth(authStorages);
    clearLegacyQiankunAuth(window);
    // ADR-0053：不复用已装 Platform；best-effort 信号后整页进入登录态清堆。
    ctx.bus.publish(AUTH_SESSION_ENDED_EVENT, { reason: "logout" });
    window.location.assign("/login");
  });

  // 刷新恢复会话后补拉功能码、显示名、租户 Logo 与 OUAA 导航（登录成功路径已在 onLoginSuccess 内拉取）。
  // 导航必须在 qiankun start 前就绪：子应用 usePageName 挂载时只读一次 GH-currentMenus。
  if (authState.token) {
    void loadFunctionCodes();
    void loadUserDisplayName();
    void loadTenantLogo();
    void loadTenantMineList();
    portalNavReady = loadPortalNavigationFromOuaa();
  }

  installNavigateIntentHandler(ctx.bus, {
    navigate: (path) => {
      void router.push(path);
    },
    waitNavReady: () => portalNavReady,
    resolvePathForCode: resolvePathForAppCode,
    personManageFirstPath: PERSON_MANAGE_FIRST_PATH,
    onError: (message) => {
      ctx.bus.publish(SHELL_NAVIGATE_ERROR_EVENT, { message });
    },
  });
  installMfRootToApplicationBridge(window, ctx.bus);

  const topBarSlot = shallowRef(null as unknown);
  const sideMenuSlot = shallowRef(null as unknown);

  app = createApp({
    setup() {
      return () =>
        h(App, {
          topBarSlot: topBarSlot.value,
          sideMenuSlot: sideMenuSlot.value,
          tenantName: authState.tenant,
          userName: authState.userName,
          logoUrl: authState.logoUrl,
          appLoadStatus: qiankunMountStatus.status,
          // TopBar「退出登录」二次确认后走的是同一条 401 自动登出路径（同一个事件名、同一个
          // installAuthLogoutHandler 监听者）：用户主动登出和会话过期登出在效果上没有区别
          // （清 token + 跳登录页），没必要维护两套独立的登出逻辑。
          onUserLogout: () => ctx.bus.publish(AUTH_LOGOUT_REQUESTED_EVENT, { reason: "user-initiated" }),
          // 跳转到个人中心首条子菜单；syncNavFromPath 会把侧栏切到 person-manage（「个人管理」树）。
          onNavigatePersonManage: () => void router.push(PERSON_MANAGE_FIRST_PATH),
          ensureGroupMenus,
          resolveGroupKeyForAppRef: (appRef: string) => lookupGroupKeyForAppRef(appCodeToGroupKey, appRef),
          waitNavReady: () => portalNavReady,
          tenants: tenantState.tenants,
          outsideTenants: tenantState.outsideTenants,
          currentTenantCode: authState.tenant,
          showTenantSwitch: shouldShowTenantSwitch(tenantState.tenants, tenantState.outsideTenants),
          runtimeCommonDiagnostics: composition.runtimeCommonDiagnostics(),
          onSelectTenant: (tenant: TenantMineItem) => handleSelectTenant(tenant),
        });
    },
  });
  app.use(pinia);
  app.use(router);

  let aiPlaceholderRegistered = false;

  async function loadChromeSlots(): Promise<void> {
    // MF remote / Vite 预打包卡住时最常见：await slot 永不 resolve、控制台零报错。
    const [topBar, sideMenu] = await bootStep("load pcChrome slots (topBar + sideMenu)", () =>
      Promise.all([composition.loadPlatformSlot("pcChrome", "chrome.topBar"), composition.loadPlatformSlot("pcChrome", "chrome.sideMenu")]),
    );
    // slot 组件必须 markRaw，避免被 props 做成深层响应式（Vue warn + 多余开销）
    topBarSlot.value = topBar ? markRaw(topBar) : null;
    sideMenuSlot.value = sideMenu ? markRaw(sideMenu) : null;
  }

  function registerAiPlaceholderOnce(): void {
    if (aiPlaceholderRegistered) {
      return;
    }
    aiPlaceholderRegistered = true;
    registerAiAssistantPlaceholder(ctx.bus, () => composition.ensurePlatform(AI_ASSISTANT_PLATFORM_NAME, app, router, ctx));
  }

  ensureAuthenticatedShell = async () => {
    await bootStep(
      "runPlatformInstalls(authenticated chrome)",
      () => composition.runPlatformInstalls(app, router, ctx, { only: [...platformsForChromeShell(window.location.pathname)] }),
      { warnAfterMs: 5_000, timeoutMs: PLATFORM_INSTALL_TIMEOUT_MS },
    );
    await loadChromeSlots();
    registerAiPlaceholderOnce();
    scheduleDeferredPreload(DEFERRED_PRELOAD, (name) => composition.ensurePlatform(name, app, router, ctx), {
      onError: (platformName, error) => {
        shellLogger.error("deferred platform preload failed", { platformName, error: String(error) });
      },
    });
  };

  if (authState.token) {
    // 已登录冷启动：字典与 chrome 壳都要，再挂主应用。
    await frontendConfigPromise;
    // Remote 加载超时是启动故障，不代表会话失效；由 bootstrap 错误页提示，保留登录态供刷新重试。
    await ensureAuthenticatedShell();
  } else {
    // 登录页：只等未登录 Platform；FRONTEND_CONFIG 继续并行，挂载后 / qiankun 注册前再 await。
    await bootStep(
      "runPlatformInstalls(unauthenticated)",
      () => composition.runPlatformInstalls(app, router, ctx, { only: [...platformsForAuthState(false)] }),
      { warnAfterMs: 5_000, timeoutMs: PLATFORM_INSTALL_TIMEOUT_MS },
    );
  }

  setBootstrapStatus({ title: "正在挂载应用…", kind: "loading" });
  const qiankunLifecycleHooks = {
    onBeforeLoad: () => qiankunMountStatus.toLoading(),
    onAfterMount: () => qiankunMountStatus.toMounted(),
    onLoadError: () => qiankunMountStatus.toError(),
  };
  await runQiankunAfterShellMount(
    async () => {
      app.mount("#app");
      await router.isReady();
      await nextTick();
    },
    async () => {
      await frontendConfigPromise;
      const workbenchEntry = resolveWorkbenchEntry(window.config);
      const legacyMicroApps = resolveLegacyMicroApps(window.config);
      if (!workbenchEntry && legacyMicroApps.length === 0) {
        return;
      }
      // 深链刷新时先等 OUAA menus 入库，再 start；否则 beforeLoad 会把空 GH-currentMenus 写给子应用。
      await portalNavReady;
      // 兼容 legacy-qiankun-auth：继续写入 __CUBE_AUTH_INFO__、GH-Token、GH-NowEnterprise 与 GH-UserInfo。
      syncLegacyQiankunAuth(window, currentQiankunAuth());
      const { addGlobalUncaughtErrorHandler, registerMicroApps, start } = await import("qiankun");
      const registrar: MicroAppRegistrar = {
        registerMicroApps: (apps, lifeCycles) => registerMicroApps(apps as never, lifeCycles as never),
        addGlobalUncaughtErrorHandler: (handler) => addGlobalUncaughtErrorHandler(handler),
      };
      let registered = false;
      if (workbenchEntry && !hasMfWorkbench) {
        registered = registerWorkbenchMicroApp(workbenchEntry, currentQiankunAuth, registrar, qiankunLifecycleHooks) || registered;
      }
      const localDevState = await localDevRuntimeState();
      const qiankunMicroApps =
        localDevState?.mode === "legacy-compat"
          ? filterLocallyOverriddenQiankunApps(legacyMicroApps, localDevState.localRemoteNames)
          : filterMigratedQiankunApps(legacyMicroApps);
      if (qiankunMicroApps.length > 0) {
        registered =
          registerLegacyMicroApps(
            qiankunMicroApps,
            {
              permissionConfig: { menuConfig: [], functionCodes: [] },
              getAuth: currentQiankunAuth,
              getRoutes: () => [],
              getLegacyMenusForApp: (appCode) => usePortalNavigationStore().getLegacyMenusForApp(appCode),
              router,
            },
            registrar,
            qiankunLifecycleHooks,
          ) || registered;
      }
      if (registered) {
        // 对齐旧仓：禁止 prefetch，注册清单 ≠ 立刻拉取全部 entry。
        start(QIANKUN_START_OPTIONS);
      }
    },
  );
}

bootstrap().catch((error) => {
  shellLogger.error("bootstrap failed", { error: String(error) });
  const message = error instanceof Error ? error.message : String(error);
  setBootstrapStatus({ title: "启动失败", detail: message, kind: "error" });
});
