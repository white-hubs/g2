import { BIMOPS_PC_TERMINAL } from "./legacy-constants";

/**
 * 旧仓 qiankun 子应用兼容上下文（ADR-0031 临时层）。
 *
 * - 工作台（cube-workbench-app）优先读 `window.__CUBE_AUTH_INFO__`
 * - 门户遗留微应用（如 problems-migrate / personal-migrate）仍直接读 sessionStorage，且无空值保护：
 *   `GH-Token` / `GH-NowEnterprise` / `GH-UserInfo` / `GH-currentApplication` / `GH-currentMenus`
 *
 * TODO(ADR-0031): 工作台与遗留 qiankun 微应用全部迁完后删除本模块，以及
 * `main.ts` / `qiankun-bridge.ts` / `vite-env.d.ts` 中所有接线。
 */

export const LEGACY_GH_TOKEN_KEY = "GH-Token";
export const LEGACY_GH_ENTERPRISE_KEY = "GH-NowEnterprise";
/** personal-migrate 等子应用 onMounted 读 `JSON.parse(...).id`，缺 key 会直接 TypeError。 */
export const LEGACY_GH_USER_INFO_KEY = "GH-UserInfo";
export const LEGACY_GH_CURRENT_APPLICATION_KEY = "GH-currentApplication";
export const LEGACY_GH_CURRENT_MENUS_KEY = "GH-currentMenus";

export interface LegacyQiankunAuth {
  token: string;
  tenant: string;
  terminal: string;
}

/** 对齐旧仓 `ApplicationPageVO` 的最小字段；子应用至少读 `.code`。 */
export interface LegacyCurrentApplication {
  code: string;
  name?: string;
  id?: string;
  [key: string]: unknown;
}

export type LegacySessionStorage = Pick<Storage, "setItem" | "removeItem">;

export function buildLegacyQiankunAuth(auth: { token?: string; tenant?: string; terminal?: string }): LegacyQiankunAuth | null {
  const token = auth.token?.trim() ?? "";
  if (!token) {
    return null;
  }
  return {
    token,
    tenant: auth.tenant ?? "",
    terminal: auth.terminal?.trim() || BIMOPS_PC_TERMINAL,
  };
}

/**
 * 同步鉴权：`__CUBE_AUTH_INFO__` + `GH-Token` + `GH-NowEnterprise`。
 * 门户子应用表格等仍读后两者（见 problems-migrate `58cc7857.js`）。
 * 不含 `GH-UserInfo`——用户资料由 `syncLegacyUserInfo` 单独写入（对齐旧仓 `initUserInfo`）。
 */
export function syncLegacyQiankunAuth(
  targetWindow: Window & { __CUBE_AUTH_INFO__?: LegacyQiankunAuth },
  auth: { token?: string; tenant?: string; terminal?: string },
  storage: LegacySessionStorage = targetWindow.sessionStorage,
): LegacyQiankunAuth | null {
  const snapshot = buildLegacyQiankunAuth(auth);
  if (!snapshot) {
    clearLegacyQiankunAuth(targetWindow, storage);
    return null;
  }
  targetWindow.__CUBE_AUTH_INFO__ = snapshot;
  storage.setItem(LEGACY_GH_TOKEN_KEY, JSON.stringify({ access_token: snapshot.token }));
  storage.setItem(LEGACY_GH_ENTERPRISE_KEY, JSON.stringify({ code: snapshot.tenant }));
  return snapshot;
}

/**
 * 写入 `GH-UserInfo`（对齐旧仓 mf-root `initUserInfo` / `setUserInfo`）。
 * 子应用如 personal-migrate 挂载时无空值保护地读 `.id`；无有效 id 时不覆盖已有值。
 * 写入成功后派发同页事件，供工作台欢迎条等刷新展示名。
 */
export const LEGACY_USER_INFO_UPDATED_EVENT = "g2:legacy-user-info-updated";

export function syncLegacyUserInfo(storage: LegacySessionStorage, userInfo: unknown): void {
  if (!userInfo || typeof userInfo !== "object" || Array.isArray(userInfo)) {
    return;
  }
  const record = userInfo as Record<string, unknown>;
  const id = record.id;
  const hasId = (typeof id === "string" && id.trim().length > 0) || (typeof id === "number" && Number.isFinite(id));
  if (!hasId) {
    return;
  }
  storage.setItem(LEGACY_GH_USER_INFO_KEY, JSON.stringify(record));
  if (typeof window !== "undefined" && storage === window.sessionStorage) {
    window.dispatchEvent(new CustomEvent(LEGACY_USER_INFO_UPDATED_EVENT));
  }
}

/** 进入门户微应用时写入当前应用上下文（对齐旧仓 `toChildApplication`）。 */
export function syncLegacyCurrentApplication(
  storage: LegacySessionStorage,
  application: LegacyCurrentApplication,
  menus: unknown[] = [],
): void {
  storage.setItem(LEGACY_GH_CURRENT_APPLICATION_KEY, JSON.stringify(application));
  storage.setItem(LEGACY_GH_CURRENT_MENUS_KEY, JSON.stringify(menus));
}

export function clearLegacyCurrentApplication(storage: LegacySessionStorage): void {
  storage.removeItem(LEGACY_GH_CURRENT_APPLICATION_KEY);
  storage.removeItem(LEGACY_GH_CURRENT_MENUS_KEY);
}

export function clearLegacyQiankunAuth(
  targetWindow: Window & { __CUBE_AUTH_INFO__?: LegacyQiankunAuth },
  storage: LegacySessionStorage = targetWindow.sessionStorage,
): void {
  delete targetWindow.__CUBE_AUTH_INFO__;
  storage.removeItem(LEGACY_GH_TOKEN_KEY);
  storage.removeItem(LEGACY_GH_ENTERPRISE_KEY);
  storage.removeItem(LEGACY_GH_USER_INFO_KEY);
  clearLegacyCurrentApplication(storage);
}

/**
 * 从门户路径解析 microApp name：`/portal/{name}/...` → `name`。
 * 非门户路径返回 null。
 */
export function parsePortalMicroAppName(pathname: string): string | null {
  const match = pathname.match(/^\/portal\/([^/]+)/u);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : null;
}

/** qiankun beforeLoad：按微应用 name 补齐 GH-currentApplication（至少含 code）。 */
export function syncLegacyApplicationForMicroApp(
  storage: LegacySessionStorage,
  microAppName: string,
  menus: unknown[] = [],
): LegacyCurrentApplication {
  const application: LegacyCurrentApplication = {
    code: microAppName,
    name: microAppName,
  };
  syncLegacyCurrentApplication(storage, application, menus);
  return application;
}
