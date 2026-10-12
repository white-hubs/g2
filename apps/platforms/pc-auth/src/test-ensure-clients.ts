import type { ServiceClientEnsurer } from "@g2-composition/contract";

/**
 * vitest 用：把 mock http 接到 ensureClient，保留既有 URL 断言。
 * 生产代码只走 `ctx.ensureClient`，不 value-import `@g2-client/*`。
 */
/** vitest `vi.fn()` 与精确函数签名不兼容，这里故意放宽。 */
export function ensureClientsFromHttp(http: { get: any; post: any; put: any }): ServiceClientEnsurer {
  const get = http.get as (url: string) => Promise<unknown>;
  const post = http.post as (url: string, body?: unknown) => Promise<unknown>;
  const put = http.put as (url: string, body?: unknown) => Promise<unknown>;
  return async <T = unknown>(name: string): Promise<T> => {
    if (name === "authClient") {
      return {
        exchangeToken: (body: unknown) => post("/gw-bff/auth/token", body),
      } as T;
    }
    if (name === "ouaaClient") {
      return {
        getUserPermissions: () => get("/api/ouaa/user-permissions"),
        getUserProfile: () => get("/api/ouaa/context/user"),
        getTenantUnderTenant: (tenantCode: string) => get(`/api/ouaa/tenant-under-tenant/${tenantCode}`),
        getTerminalApplicationGroups: () => get("/api/ouaa/context/terminal-application-groups"),
        getApplicationGroupMenus: (groupId: string) => get(`/api/ouaa/context/application/group/menus?id=${encodeURIComponent(groupId)}`),
        sendSmsCode: (body: unknown) => post("/api/ouaa/sms/code/send", body),
        bindLogin: (body: unknown) => post("/api/ouaa/public/user/auth/bind-login", body),
        getRetrievePasswordToken: (query: string) => get(`/api/ouaa/retrieve-password/token?${query}`),
        resetPassword: (body: unknown) => put("/api/ouaa/retrieve-password/reset", body),
        getCaptcha: (body: unknown) => post("/api/ouaa/captcha/get", body),
        checkCaptcha: (body: unknown) => post("/api/ouaa/captcha/check", body),
      } as T;
    }
    throw new Error(`test-ensure-clients: unexpected client ${name}`);
  };
}
