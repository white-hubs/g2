/** Shell 登录态快照 key；legacy-compat 模式另写 GH-Token / GH-NowEnterprise。 */
const SHELL_AUTH_KEY = "g2-shell-pc:auth-session";

function parse(raw: string | null): Record<string, unknown> | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/** 读取 access_token 与租户码，用于拼接 H5 审批链接（旧页从 sessionStorage 取同样两项）。 */
export function readAuthSession(): { token: string; tenant: string } {
  const shell =
    parse(globalThis.localStorage?.getItem(SHELL_AUTH_KEY) ?? null) ?? parse(globalThis.sessionStorage?.getItem(SHELL_AUTH_KEY) ?? null);
  if (shell) {
    return { token: String(shell.token ?? ""), tenant: String(shell.tenant ?? "") };
  }
  const legacyToken = parse(globalThis.sessionStorage?.getItem("GH-Token") ?? null);
  const legacyTenant = parse(globalThis.sessionStorage?.getItem("GH-NowEnterprise") ?? null);
  return { token: String(legacyToken?.access_token ?? ""), tenant: String(legacyTenant?.code ?? "") };
}
