import type { PlatformContext } from "@g2-composition/contract";
import type { MdataClient } from "@g2-contract/mdata";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export function createMdataClient(http: HttpClient): MdataClient {
  return {
    getTenantMine: () => http.get("/api/mdata/tenant/mine"),
    // 对齐旧仓 cube-mdata：区域树实际走 /area/list（树形列表），无独立 /area/tree。
    getAreaTree: (query) => http.get(withQuery("/api/mdata/area/list", query)),
    getAreaList: (query) => http.get(withQuery("/api/mdata/area/list", query)),
    pageOperationLogs: (query) => http.get(withQuery("/api/mdata/operation/log/record/page", query)),
  };
}

export async function create(ctx: PlatformContext): Promise<MdataClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createMdataClient(httpModule.createHttpClientForPlatform(ctx));
}

export type { MdataClient };
