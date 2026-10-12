import type { PlatformContext } from "@g2-composition/contract";
import type { DepartmentNode, Organization, OuaaClient, OuaaJsonBody, Role, User } from "@g2-contract/ouaa";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

interface PageResult<T> {
  total: number;
  pages: number;
  records: T[];
}

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) {
    return url;
  }
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return url;
  }
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

export function createOuaaClient(http: HttpClient): OuaaClient {
  return {
    getDepartments: async (query = {}) => {
      const response = await http.get(withQuery("/gw-bff/ouaa/departments", { ...query }));
      const data = response !== null && typeof response === "object" && "data" in response ? response.data : response;
      if (!Array.isArray(data)) throw new Error("部门树响应格式错误");
      return data as DepartmentNode[];
    },
    // 这些认证与上下文接口仍由 shell 直连 /api/ouaa/*；其余已迁移接口统一走 /gw-bff。
    getUserPermissions: () => http.get("/api/ouaa/user-permissions"),
    getUserProfile: () => http.get("/api/ouaa/context/user"),
    getTenantUnderTenant: (tenantCode) => http.get(`/api/ouaa/tenant-under-tenant/${tenantCode}`),
    getTerminalApplicationGroups: () => http.get("/api/ouaa/context/terminal-application-groups"),
    getApplicationGroupMenus: (groupId) => http.get(`/api/ouaa/context/application/group/menus?id=${encodeURIComponent(groupId)}`),
    sendSmsCode: (body: OuaaJsonBody) => http.post("/api/ouaa/sms/code/send", body),
    bindLogin: (body: OuaaJsonBody) => http.post("/api/ouaa/public/user/auth/bind-login", body),
    getRetrievePasswordToken: (query) => http.get(`/api/ouaa/retrieve-password/token?${query}`),
    resetPassword: (body: OuaaJsonBody) => http.put("/api/ouaa/retrieve-password/reset", body),
    getCaptcha: (body: OuaaJsonBody) => http.post("/api/ouaa/captcha/get", body),
    checkCaptcha: (body: OuaaJsonBody) => http.post("/api/ouaa/captcha/check", body),

    // cube-services /gw-bff/ouaa (1:1)
    getUsersByIds: (ids) => http.get(withQuery("/gw-bff/ouaa/users/get-by-ids", { ids })) as Promise<User[]>,
    getOrganizations: (params) => http.get(withQuery("/gw-bff/ouaa/organizations", { ...params })) as Promise<Organization[]>,
    getOrganizationTree: (params) => http.get(withQuery("/gw-bff/ouaa/organizations/tree", { ...params })) as Promise<Organization[]>,
    getRoles: () => http.get("/gw-bff/ouaa/roles") as Promise<Role[]>,
    listUsers: (params) => http.get(withQuery("/gw-bff/ouaa/users", { ...params })) as Promise<PageResult<User>>,
    // 对齐 ghcloud 的报警指派人员接口，而非旧的 tenant/user/list 网关别名。
    listTenantUsers: (params) =>
      http.get(
        withQuery("/api/ouaa/authenticated/user-under-tenant/page", {
          enabled: true,
          keyword: "",
          cascaderIds: "",
          anyMatchedAreaId: "",
          ...(params as object),
        } as Record<string, unknown>),
      ),
    listFlowUsers: (params) => http.get(withQuery("/api/ouaa/user-under-tenant/page", params)),
    listFlowUsersByIds: (params) => http.post("/api/ouaa/authenticated/user-under-tenant/page", params),
    listFlowUsersByRoleIds: (params) => http.post("/api/ouaa/authenticated/role/user/page", params),
    listFlowDepartments: (params) => http.get(withQuery("/api/ouaa/organizations", params)),
    listFlowDepartmentOptions: (params) => http.get(withQuery("/api/ouaa/authenticated/organizations/list", params)),
    // 对齐 ghcloud `/api/ouaa/authenticated/position/list`；gw-bff/ouaa/positions 在本地网关未注册。
    listPositions: (params) =>
      http.get(withQuery("/api/ouaa/authenticated/position/list", { ...(params as object) } as Record<string, unknown>)),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057 H1/X1）。 */
export async function create(ctx: PlatformContext): Promise<OuaaClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createOuaaClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { OuaaClient, OuaaJsonBody };
