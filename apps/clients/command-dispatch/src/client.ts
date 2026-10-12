import type { PlatformContext } from "@g2-composition/contract";
import type { CommandDispatchClient, PageResult } from "@g2-contract/command-dispatch";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const base = "/gw-bff/command-dispatch";

function withQuery(path: string, query: object): string {
  const search = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `${base}${path}${search ? `?${search}` : ""}`;
}

async function page<T>(response: Promise<unknown>): Promise<PageResult<T>> {
  const value = await response;
  if (
    !value ||
    typeof value !== "object" ||
    !("records" in value) ||
    !Array.isArray(value.records) ||
    !("total" in value) ||
    typeof value.total !== "number"
  ) {
    throw new Error("指挥调度分页响应格式错误");
  }
  return value as PageResult<T>;
}

export function createCommandDispatchClient(http: HttpClient): CommandDispatchClient {
  return {
    pageRecordings: (query) => page(http.get(withQuery("/recordings", query))),
    pageGroups: (query) => page(http.get(withQuery("/groups", query))),
    createGroup: async (payload) => {
      await http.post(`${base}/groups`, payload);
    },
    updateGroup: async (id, payload) => {
      await http.put(`${base}/groups/${encodeURIComponent(id)}`, payload);
    },
    deleteGroup: async (code) => {
      await http.delete(`${base}/groups/code/${encodeURIComponent(code)}`);
    },
    pageDevices: (query) => page(http.get(withQuery("/devices", query))),
    updateDevice: async (id, payload) => {
      await http.put(`${base}/devices/${encodeURIComponent(id)}`, payload);
    },
    setGroupMembers: async (code, deviceCodes) => {
      await http.post(`${base}/groups/${encodeURIComponent(code)}/members`, { deviceCodes });
    },
    pageAccounts: (query) => page(http.get(withQuery("/accounts", query))),
  };
}

export async function create(ctx: PlatformContext): Promise<CommandDispatchClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createCommandDispatchClient(module.createHttpClientForPlatform(ctx));
}

export type { CommandDispatchClient };
