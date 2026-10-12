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

export type IntelligentGrainClient = {
  getIntelligentGrainDashboard: (params?: unknown) => Promise<unknown>;
  listIntelligentGrainWarehouseOptions: (params?: unknown) => Promise<unknown>;
  pageIntelligentGrainWarehouses: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainWarehouse: (warehouseId?: unknown) => Promise<unknown>;
  createIntelligentGrainWarehouse: (payload?: unknown) => Promise<unknown>;
  updateIntelligentGrainWarehouse: (warehouseId?: unknown, payload?: unknown) => Promise<unknown>;
  deleteIntelligentGrainWarehouse: (warehouseId?: unknown) => Promise<unknown>;
  listIntelligentGrainVarietyOptions: (warehouseId?: unknown) => Promise<unknown>;
  listIntelligentGrainGlobalVarietyOptions: (params?: unknown, _arg?: unknown) => Promise<unknown>;
  pageIntelligentGrainVarieties: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainVariety: (varietyId?: unknown) => Promise<unknown>;
  createIntelligentGrainVariety: (payload?: unknown) => Promise<unknown>;
  updateIntelligentGrainVariety: (varietyId?: unknown, payload?: unknown) => Promise<unknown>;
  deleteIntelligentGrainVariety: (varietyId?: unknown) => Promise<unknown>;
  exportIntelligentGrainVarieties: (params?: unknown) => Promise<unknown>;
  pageIntelligentGrainQualityRecords: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainQualityRecord: (recordId?: unknown) => Promise<unknown>;
  createIntelligentGrainQualityRecord: (payload?: unknown) => Promise<unknown>;
  updateIntelligentGrainQualityRecord: (recordId?: unknown, payload?: unknown, _arg?: unknown) => Promise<unknown>;
  deleteIntelligentGrainQualityRecord: (recordId?: unknown) => Promise<unknown>;
  exportIntelligentGrainQualityRecords: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainArchive: (warehouseId?: unknown) => Promise<unknown>;
  getIntelligentGrainArchiveTrend: (warehouseId?: unknown, params?: unknown) => Promise<unknown>;
  pageIntelligentGrainArchiveRecords: (warehouseId?: unknown, params?: unknown, _arg?: unknown) => Promise<unknown>;
  exportIntelligentGrainArchiveRecords: (warehouseId?: unknown, params?: unknown, _arg?: unknown) => Promise<unknown>;
  batchWriteIntelligentGrainMetricSamples: (payload?: unknown, _arg?: unknown) => Promise<unknown>;
  getIntelligentGrainGlobalRules: () => Promise<unknown>;
  saveIntelligentGrainGlobalRules: (payload?: unknown) => Promise<unknown>;
  restoreIntelligentGrainFactoryDefaults: () => Promise<unknown>;
  pageIntelligentGrainWarehouseRules: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainWarehouseRules: (warehouseId?: unknown) => Promise<unknown>;
  saveIntelligentGrainWarehouseRules: (warehouseId?: unknown, payload?: unknown, _arg?: unknown) => Promise<unknown>;
  deleteIntelligentGrainWarehouseRules: (warehouseId?: unknown, _arg?: unknown) => Promise<unknown>;
  getIntelligentGrainRuleEngineConstants: () => Promise<unknown>;
  pageIntelligentGrainAlerts: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainAlert: (id?: unknown) => Promise<unknown>;
  getIntelligentGrainAlertTracking: (id?: unknown) => Promise<unknown>;
  judgeIntelligentGrainAlertReal: (id?: unknown, payload?: unknown) => Promise<unknown>;
  markIntelligentGrainAlertMistake: (id?: unknown, payload?: unknown) => Promise<unknown>;
  saveIntelligentGrainDisposalDraft: (id?: unknown, payload?: unknown) => Promise<unknown>;
  submitIntelligentGrainDisposal: (id?: unknown, payload?: unknown) => Promise<unknown>;
  acceptIntelligentGrainAlert: (id?: unknown, payload?: unknown) => Promise<unknown>;
  rejectIntelligentGrainAlert: (id?: unknown, payload?: unknown) => Promise<unknown>;
  exportIntelligentGrainAlerts: (params?: unknown) => Promise<unknown>;
  getIntelligentGrainMobileSummary: (params?: unknown) => Promise<unknown>;
  pageMyIntelligentGrainAlerts: (params?: unknown) => Promise<unknown>;
};

export function createIntelligentGrainClient(http: HttpClient): IntelligentGrainClient {
  return {
    getIntelligentGrainDashboard: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/dashboard/overview`, { ...params } as Record<string, unknown>)),
    listIntelligentGrainWarehouseOptions: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/warehouses/options`, { ...params } as Record<string, unknown>)),
    pageIntelligentGrainWarehouses: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/warehouses/page`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainWarehouse: async (warehouseId?: unknown) => http.get(`/api/intelligent-grain/warehouses/${warehouseId}`),
    createIntelligentGrainWarehouse: async (payload?: unknown) => http.post(`/api/intelligent-grain/warehouses`, { ...payload }),
    updateIntelligentGrainWarehouse: async (warehouseId?: unknown, payload?: unknown) =>
      http.put(`/api/intelligent-grain/warehouses/${warehouseId}`, { ...payload }),
    deleteIntelligentGrainWarehouse: async (warehouseId?: unknown) => http.delete(`/api/intelligent-grain/warehouses/${warehouseId}`),
    listIntelligentGrainVarietyOptions: async (warehouseId?: unknown) =>
      http.get(`/api/intelligent-grain/warehouses/${warehouseId}/grain-varieties/options`),
    listIntelligentGrainGlobalVarietyOptions: async (params?: unknown, _arg?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/grain-varieties/options`, { ...params } as Record<string, unknown>)),
    pageIntelligentGrainVarieties: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/grain-varieties/page`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainVariety: async (varietyId?: unknown) => http.get(`/api/intelligent-grain/grain-varieties/${varietyId}`),
    createIntelligentGrainVariety: async (payload?: unknown) => http.post(`/api/intelligent-grain/grain-varieties`, { ...payload }),
    updateIntelligentGrainVariety: async (varietyId?: unknown, payload?: unknown) =>
      http.put(`/api/intelligent-grain/grain-varieties/${varietyId}`, { ...payload }),
    deleteIntelligentGrainVariety: async (varietyId?: unknown) => http.delete(`/api/intelligent-grain/grain-varieties/${varietyId}`),
    exportIntelligentGrainVarieties: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/grain-varieties/export`, { ...params } as Record<string, unknown>)),
    pageIntelligentGrainQualityRecords: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/quality-records/page`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainQualityRecord: async (recordId?: unknown) => http.get(`/api/intelligent-grain/quality-records/${recordId}`),
    createIntelligentGrainQualityRecord: async (payload?: unknown) => http.post(`/api/intelligent-grain/quality-records`, { ...payload }),
    updateIntelligentGrainQualityRecord: async (recordId?: unknown, payload?: unknown, _arg?: unknown) =>
      http.put(`/api/intelligent-grain/quality-records/${recordId}`, { ...payload }),
    deleteIntelligentGrainQualityRecord: async (recordId?: unknown) => http.delete(`/api/intelligent-grain/quality-records/${recordId}`),
    exportIntelligentGrainQualityRecords: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/quality-records/export`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainArchive: async (warehouseId?: unknown) => http.get(`/api/intelligent-grain/grain/archives/${warehouseId}`),
    getIntelligentGrainArchiveTrend: async (warehouseId?: unknown, params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/archives/${warehouseId}/trend`, { ...params } as Record<string, unknown>)),
    pageIntelligentGrainArchiveRecords: async (warehouseId?: unknown, params?: unknown, _arg?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/archives/${warehouseId}/records/page`, { ...params } as Record<string, unknown>)),
    exportIntelligentGrainArchiveRecords: async (warehouseId?: unknown, params?: unknown, _arg?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/archives/${warehouseId}/records/export`, { ...params } as Record<string, unknown>)),
    batchWriteIntelligentGrainMetricSamples: async (payload?: unknown, _arg?: unknown) =>
      http.post(`/api/intelligent-grain/metric-samples/batch`, { ...payload }),
    getIntelligentGrainGlobalRules: async () => http.get(`/api/intelligent-grain/rules/global`),
    saveIntelligentGrainGlobalRules: async (payload?: unknown) => http.put(`/api/intelligent-grain/rules/global`, { ...payload }),
    restoreIntelligentGrainFactoryDefaults: async () => http.post(`/api/intelligent-grain/rules/factory-defaults/restore`, {}),
    pageIntelligentGrainWarehouseRules: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/rules/warehouses/page`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainWarehouseRules: async (warehouseId?: unknown) => http.get(`/api/intelligent-grain/rules/warehouses/${warehouseId}`),
    saveIntelligentGrainWarehouseRules: async (warehouseId?: unknown, payload?: unknown, _arg?: unknown) =>
      http.put(`/api/intelligent-grain/rules/warehouses/${warehouseId}`, { ...payload }),
    deleteIntelligentGrainWarehouseRules: async (warehouseId?: unknown, _arg?: unknown) =>
      http.delete(`/api/intelligent-grain/rules/warehouses/${warehouseId}`),
    getIntelligentGrainRuleEngineConstants: async () => http.get(`/api/intelligent-grain/rules/engine-constants`),
    pageIntelligentGrainAlerts: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/alerts/page`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainAlert: async (id?: unknown) => http.get(`/api/intelligent-grain/alerts/${id}`),
    getIntelligentGrainAlertTracking: async (id?: unknown) => http.get(`/api/intelligent-grain/alerts/${id}/tracking`),
    judgeIntelligentGrainAlertReal: async (id?: unknown, payload?: unknown) =>
      http.post(`/api/intelligent-grain/alerts/${id}/judgement/real`, { ...payload }),
    markIntelligentGrainAlertMistake: async (id?: unknown, payload?: unknown) =>
      http.post(`/api/intelligent-grain/alerts/${id}/judgement/mistake`, { ...payload }),
    saveIntelligentGrainDisposalDraft: async (id?: unknown, payload?: unknown) =>
      http.post(`/api/intelligent-grain/alerts/${id}/disposal/draft`, { ...payload }),
    submitIntelligentGrainDisposal: async (id?: unknown, payload?: unknown) =>
      http.post(`/api/intelligent-grain/alerts/${id}/disposal/submit`, { ...payload }),
    acceptIntelligentGrainAlert: async (id?: unknown, payload?: unknown) =>
      http.post(`/api/intelligent-grain/alerts/${id}/acceptance/pass`, { ...payload }),
    rejectIntelligentGrainAlert: async (id?: unknown, payload?: unknown) =>
      http.post(`/api/intelligent-grain/alerts/${id}/acceptance/reject`, { ...payload }),
    exportIntelligentGrainAlerts: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/alerts/export`, { ...params } as Record<string, unknown>)),
    getIntelligentGrainMobileSummary: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/mobile/summary`, { ...params } as Record<string, unknown>)),
    pageMyIntelligentGrainAlerts: async (params?: unknown) =>
      http.get(withQuery(`/api/intelligent-grain/mobile/my-alerts`, { ...params } as Record<string, unknown>)),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<IntelligentGrainClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createIntelligentGrainClient(httpModule.createHttpClientForPlatform(ctx));
}
