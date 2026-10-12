import type { PlatformContext } from "@g2-composition/contract";
import type { LineLossManagementClient } from "@g2-contract/line-loss-management";

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

const API = "/api/securitymanagement";

function withQuery(url: string, payload?: object, preserveEmpty = false): string {
  if (!payload) {
    return url;
  }
  const query = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || (!preserveEmpty && value === "")) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, String(item)));
    } else {
      query.append(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `${url}?${serialized}` : url;
}

function unwrap<T>(value: unknown): T {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    if (current && typeof current === "object" && !Array.isArray(current) && "data" in current) {
      current = (current as { data: unknown }).data;
    } else {
      break;
    }
  }
  return current as T;
}

export function createLineLossManagementClient(http: HttpClient): LineLossManagementClient {
  return {
    getCollectionRecords: async (params) => unwrap(await http.get(withQuery(`${API}/lineLoss/read/page`, params))),
    // 旧接口把空的时间和线路名也作为必传查询字段，不能由通用序列化逻辑省略。
    getLossStatistics: async (params) => unwrap(await http.get(withQuery(`${API}/lineLoss/stat/page`, params, true))),
    saveCollectionCycle: async (params) => unwrap(await http.post(`${API}/lineloss/collectConfig/edit`, params)),
    getCollectionCycle: async () => unwrap(await http.get(`${API}/lineloss/collectConfig/detail`)),
    getLineConnections: async (params) => unwrap(await http.get(withQuery(`${API}/lineLoss/connection/page`, params))),
    getSupplyGraph: async () => unwrap(await http.get(`${API}/lineLoss/supply/detail`)),
    syncSupplyGraph: async () => unwrap(await http.post(`${API}/lineLoss/supply/sync`)),
    getLineLossTrend: async (params) => unwrap(await http.get(withQuery(`${API}/lineLoss/supply/trend`, params))),
    getLineLossDevices: async (params) => unwrap(await http.get(withQuery(`${API}/lineLoss/connection/devices`, params))),
    updateLineLossDevices: async (params) => unwrap(await http.post(`${API}/lineLoss/supply/edit`, params)),
  };
}

export async function create(ctx: PlatformContext): Promise<LineLossManagementClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createLineLossManagementClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { LineLossManagementClient } from "@g2-contract/line-loss-management";
