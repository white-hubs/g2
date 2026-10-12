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

export type ProcessEngineClient = {
  getPermissionFormFlowGroupCount: (params?: unknown) => Promise<unknown>;
  getFormFlowGroupCount: (params?: unknown) => Promise<unknown>;
  updateFormFlowGroup: (params?: unknown) => Promise<unknown>;
  deleteFormFlowGroup: (id?: unknown) => Promise<unknown>;
  getFormFlowPageList: (params?: unknown) => Promise<unknown>;
  updateFormFlowEnable: (params?: unknown) => Promise<unknown>;
  deleteFormFlow: (id?: unknown) => Promise<unknown>;
  getFlowProcessPage: (params?: unknown) => Promise<unknown>;
  getWorkOrderList: (params?: unknown) => Promise<unknown>;
  exportWorkOrderList: (params?: unknown) => Promise<unknown>;
  getWorkOrderStatisticsList: (params?: unknown) => Promise<unknown>;
  exportWorkOrderStatisticsList: (params?: unknown) => Promise<unknown>;
  getFlowBusinessNodeNames: (params?: unknown) => Promise<unknown>;
  getFormFlowGroupList: (_params?: unknown) => Promise<unknown>;
  getWorkOrderBusinessTypeList: (_params?: unknown) => Promise<unknown>;
  getUserFlowNumber: (params?: unknown) => Promise<unknown>;
};

export function createProcessEngineClient(http: HttpClient): ProcessEngineClient {
  return {
    getPermissionFormFlowGroupCount: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/form-flow-groups/permission-count`, { ...params } as Record<string, unknown>)),
    getFormFlowGroupCount: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/form-flow-groups/count`, { ...params } as Record<string, unknown>)),
    updateFormFlowGroup: async (params?: unknown) => http.post(`/gw-bff/process-engine/form-flow-groups`, { ...params }),
    deleteFormFlowGroup: async (id?: unknown) => http.delete(`/gw-bff/process-engine/form-flow-groups/${id}`),
    getFormFlowPageList: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/form-flows`, { ...params } as Record<string, unknown>)),
    updateFormFlowEnable: async (params?: unknown) => http.put(`/gw-bff/process-engine/form-flows/enable`, { ...params }),
    deleteFormFlow: async (id?: unknown) => http.delete(`/gw-bff/process-engine/form-flows/${id}`),
    getFlowProcessPage: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/processes`, { ...params } as Record<string, unknown>)),
    getWorkOrderList: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/processes/all`, { ...params } as Record<string, unknown>)),
    exportWorkOrderList: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/processes/export`, { ...params } as Record<string, unknown>)),
    getWorkOrderStatisticsList: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/statistics/business-types`, { ...params } as Record<string, unknown>)),
    exportWorkOrderStatisticsList: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/statistics/business-types/export`, { ...params } as Record<string, unknown>)),
    getFlowBusinessNodeNames: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/business-node-names`, { ...params } as Record<string, unknown>)),
    getFormFlowGroupList: async (_params?: unknown) => http.get(`/gw-bff/process-engine/form-flow-groups`),
    getWorkOrderBusinessTypeList: async (_params?: unknown) => http.get(`/gw-bff/process-engine/business-types`),
    getUserFlowNumber: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/process-engine/user-number`, { ...params } as Record<string, unknown>)),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<ProcessEngineClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createProcessEngineClient(httpModule.createHttpClientForPlatform(ctx));
}
