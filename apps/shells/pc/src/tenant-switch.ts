/**
 * 对齐旧仓 user-dropdown `checkEnterprise` + CubeMfRootGlobalState.refreshToken：
 * 以目标租户为 header，用 refresh_token 换新 access_token，再整页刷新。
 */

export interface RefreshTokenResult {
  token: string;
  refreshToken?: string;
  tenant: string;
}

export interface SwitchTenantDeps {
  postRefresh: (body: { grant_type: string; refresh_token: string }, tenant: string) => Promise<unknown>;
}

export class TenantSwitchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantSwitchError";
  }
}

/**
 * 纯切换逻辑：调用方负责 persist + syncLegacy + location.reload。
 * `external` / `same` / `disabled` 由 UI 层各自处理（外链 window.open 等）。
 */
export async function switchTenantWithRefreshToken(
  input: {
    nextTenantCode: string;
    currentTenantCode: string;
    refreshToken: string;
    enabled: boolean;
    webSiteUrl?: string;
  },
  deps: SwitchTenantDeps,
): Promise<RefreshTokenResult | "same" | "disabled" | "external"> {
  if (!input.enabled) {
    return "disabled";
  }
  if (input.currentTenantCode === input.nextTenantCode) {
    return "same";
  }
  if (input.webSiteUrl) {
    return "external";
  }
  if (!input.refreshToken) {
    throw new TenantSwitchError("缺少 refresh_token，请重新登录后再切换企业");
  }

  const body = await deps.postRefresh({ grant_type: "refresh_token", refresh_token: input.refreshToken }, input.nextTenantCode);
  const record = body !== null && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const token = typeof record?.access_token === "string" ? record.access_token : "";
  if (!token) {
    throw new TenantSwitchError("切换企业失败：未返回 access_token");
  }
  const refreshToken = typeof record?.refresh_token === "string" ? record.refresh_token : undefined;
  const result: RefreshTokenResult = {
    token,
    tenant: input.nextTenantCode,
  };
  if (refreshToken) {
    result.refreshToken = refreshToken;
  }
  return result;
}
