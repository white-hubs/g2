import { BIMOPS_PC_TERMINAL } from "./legacy-constants";

/**
 * Shell `getAuthHeaders` 实现：对齐旧仓 axios 拦截器 + ADR-0046。
 * - `terminal` 始终带上（登录前 OUAA/BFF 也认这个头）
 * - 有 token 时再附 `Authorization` / `tenant`
 */
export function buildAuthHeaders(auth: { token?: string; tenant?: string; terminal?: string }): Record<string, string> {
  const terminal = auth.terminal?.trim() || BIMOPS_PC_TERMINAL;
  if (!auth.token) {
    return { terminal };
  }
  return {
    Authorization: `Bearer ${auth.token}`,
    tenant: auth.tenant ?? "",
    terminal,
  };
}
