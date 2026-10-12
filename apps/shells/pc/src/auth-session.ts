/**
 * Shell 鉴权会话缓存（ADR-0028：token 生命周期留在门面）。
 *
 * - `local`：localStorage，刷新 / 关浏览器后再开仍有效（默认）
 * - `session`：sessionStorage，仅当前标签页会话有效，关标签即失效
 *
 * 写入某一级时会清除另一级，避免两处并存导致「刷新后读到过期副本」。
 */

/** 与 `Storage`（localStorage / sessionStorage）结构一致的最小接口，方便单测传入内存实现。 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type AuthPersistenceLevel = "local" | "session";

export const DEFAULT_AUTH_PERSISTENCE_LEVEL: AuthPersistenceLevel = "local";

/** 与旧仓 GH-Token 语义对齐：存 access_token + tenant；key 带 shell 命名空间避免冲突。 */
export const AUTH_SESSION_STORAGE_KEY = "g2-shell-pc:auth-session";

export interface PersistedAuth {
  token: string;
  tenant: string;
  /** 组织切换 refresh_token；旧会话可能没有。 */
  refreshToken?: string;
}

export interface AuthStoragePair {
  local: KeyValueStorage;
  session: KeyValueStorage;
}

export interface LoadedAuthSession {
  auth: PersistedAuth;
  level: AuthPersistenceLevel;
}

function parsePersistedAuth(raw: string | null): PersistedAuth | null {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { token?: unknown }).token !== "string" ||
      typeof (parsed as { tenant?: unknown }).tenant !== "string"
    ) {
      return null;
    }
    const { token, tenant, refreshToken } = parsed as {
      token: string;
      tenant: string;
      refreshToken?: unknown;
    };
    if (!token) {
      return null;
    }
    const auth: PersistedAuth = { token, tenant };
    if (typeof refreshToken === "string" && refreshToken) {
      auth.refreshToken = refreshToken;
    }
    return auth;
  } catch {
    return null;
  }
}

function storageFor(level: AuthPersistenceLevel, storages: AuthStoragePair): KeyValueStorage {
  return level === "local" ? storages.local : storages.session;
}

function otherLevel(level: AuthPersistenceLevel): AuthPersistenceLevel {
  return level === "local" ? "session" : "local";
}

/** 登录成功后调用：写入指定级别（默认 local），并清除另一级。 */
export function persistAuth(
  storages: AuthStoragePair,
  auth: PersistedAuth,
  level: AuthPersistenceLevel = DEFAULT_AUTH_PERSISTENCE_LEVEL,
): void {
  const payload: PersistedAuth = { token: auth.token, tenant: auth.tenant };
  if (auth.refreshToken) {
    payload.refreshToken = auth.refreshToken;
  }
  storageFor(level, storages).setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(payload));
  storageFor(otherLevel(level), storages).removeItem(AUTH_SESSION_STORAGE_KEY);
}

/**
 * 启动时调用：优先读 local（默认级），再读 session。
 * 两级同时有值时以 local 为准（并清掉 session，收敛到单一真相源）。
 */
export function loadPersistedAuth(storages: AuthStoragePair): LoadedAuthSession | null {
  const fromLocal = parsePersistedAuth(storages.local.getItem(AUTH_SESSION_STORAGE_KEY));
  if (fromLocal) {
    storages.session.removeItem(AUTH_SESSION_STORAGE_KEY);
    return { auth: fromLocal, level: "local" };
  }
  const fromSession = parsePersistedAuth(storages.session.getItem(AUTH_SESSION_STORAGE_KEY));
  if (fromSession) {
    return { auth: fromSession, level: "session" };
  }
  return null;
}

/** 登出时调用：两级一并清除。 */
export function clearPersistedAuth(storages: AuthStoragePair): void {
  storages.local.removeItem(AUTH_SESSION_STORAGE_KEY);
  storages.session.removeItem(AUTH_SESSION_STORAGE_KEY);
}
