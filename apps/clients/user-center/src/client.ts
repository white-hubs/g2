import type { PlatformContext } from "@g2-composition/contract";
import type { PageResult, Reader, MemberGroup, MemberUser, UserCenterClient } from "@g2-contract/user-center";

interface HttpClient {
  get(url: string): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

function query(url: string, params: object): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  return url + (entries.length ? "?" + entries.map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(String(value))).join("&") : "");
}

function unwrap<T>(value: unknown): T {
  return value && typeof value === "object" && "data" in value ? (value as { data: T }).data : value as T;
}

function page<T>(value: unknown): PageResult<T> {
  const body = unwrap<PageResult<T>>(value);
  if (!body || !Array.isArray(body.records) || typeof body.total !== "number") throw new Error("用户中心分页响应格式错误");
  return body;
}

export function createUserCenterClient(http: HttpClient): UserCenterClient {
  return {
    pageReaders: async (params) => page<Reader>(await http.get(query("/api/ouaa/user-under-tenant/register-user/list", params))),
    getReader: async (id) => unwrap<Reader>(await http.get(query("/api/ouaa/user-under-tenant/register-user/detail", { id }))),
    pageGroups: async (params) => page<MemberGroup>(await http.get(query("/api/disinfection/bus/member/group/page", params))),
    deleteGroup: async (id) => { await http.delete(query("/api/disinfection/bus/member/group/remove", { id })); },
    pageUsers: async (params) => page<MemberUser>(await http.get(query("/api/disinfection/bus/member/user/page", params))),
    deleteUser: async (id) => { await http.delete(query("/api/disinfection/bus/member/user/remove", { id })); },
  };
}

export async function create(ctx: PlatformContext): Promise<UserCenterClient> {
  const module = await ctx.loadPlatform("httpPlatform", "client") as HttpModule;
  return createUserCenterClient(module.createHttpClientForPlatform(ctx));
}

export type { UserCenterClient };
