// @ts-nocheck — generated client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export type WorkPermitClient = {
  listWorkPermitTypes: (params?: unknown) => Promise<unknown>;
  getWorkPermitTypeDetail: (id?: unknown) => Promise<unknown>;
  createWorkPermitType: (payload?: unknown) => Promise<unknown>;
  updateWorkPermitType: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteWorkPermitType: (id?: unknown) => Promise<unknown>;
  listWorkPermitLevels: (params?: unknown) => Promise<unknown>;
  exportWorkPermitTypes: (params?: unknown) => Promise<unknown>;
  recognizeWorkPermitAssociatedItemByAi: (payload?: unknown) => Promise<unknown>;
};

export function createWorkPermitClient(http: HttpClient): WorkPermitClient {
  return {
    listWorkPermitTypes: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/work-permit/work-permit-types`, { ...params } as Record<string, unknown>)),
    getWorkPermitTypeDetail: async (id?: unknown) => http.get(`/gw-bff/work-permit/work-permit-types/${id}`),
    createWorkPermitType: async (payload?: unknown) => http.post(`/gw-bff/work-permit/work-permit-types`, { ...payload }),
    updateWorkPermitType: async (id?: unknown, payload?: unknown) =>
      http.put(`/gw-bff/work-permit/work-permit-types/${id}`, { ...payload }),
    deleteWorkPermitType: async (id?: unknown) => http.delete(`/gw-bff/work-permit/work-permit-types/${id}`),
    listWorkPermitLevels: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/work-permit/work-permit-types/levels`, { ...params } as Record<string, unknown>)),
    exportWorkPermitTypes: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/work-permit/work-permit-types/export`, { ...params } as Record<string, unknown>)),
    recognizeWorkPermitAssociatedItemByAi: async (payload?: unknown) =>
      http.post(`/gw-bff/work-permit/associated-items/ai-recognition`, { ...payload }),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<WorkPermitClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createWorkPermitClient(httpModule.createHttpClientForPlatform(ctx));
}
