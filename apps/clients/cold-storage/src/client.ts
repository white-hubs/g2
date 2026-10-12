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

export type ColdStorageClient = {
  getColdStorePage: (query?: unknown) => Promise<unknown>;
  getColdStoreDetail: (id?: unknown) => Promise<unknown>;
  saveColdStore: (payload?: unknown, _id?: unknown) => Promise<unknown>;
  deleteColdStore: (id?: unknown) => Promise<unknown>;
  getColdStoreMonitorExceptionStatistics: () => Promise<unknown>;
  getColdStoreMonitorCards: (query?: unknown) => Promise<unknown>;
  getColdStoreMonitorCardDetail: (id?: unknown) => Promise<unknown>;
  getColdStoreInsideDoorStatuses: () => Promise<unknown>;
  getColdStoreInsideDoorDetail: (storeId?: unknown) => Promise<unknown>;
  getColdStoreInsideTemperatureOverview: () => Promise<unknown>;
  getColdStoreRefrigerationHealthOverview: () => Promise<unknown>;
  getColdStoreRefrigerationUnitDetail: (unitCode?: unknown) => Promise<unknown>;
  getColdStoreRefrigerationEnergy: () => Promise<unknown>;
  getColdStoreLeakResponses: () => Promise<unknown>;
  getColdStoreLeakResponseDetail: (alarmId?: unknown) => Promise<unknown>;
  getColdStoreStatisticsPreview: () => Promise<unknown>;
};

export function createColdStorageClient(http: HttpClient): ColdStorageClient {
  return {
    getColdStorePage: async (query?: unknown) => http.get(withQuery(`/api/cold-storage/stores`, { ...query } as Record<string, unknown>)),
    getColdStoreDetail: async (id?: unknown) => http.get(`/api/cold-storage/stores/${id}`),
    saveColdStore: async (payload?: unknown, _id?: unknown) => http.post(`/api/cold-storage/stores`, { ...payload }),
    deleteColdStore: async (id?: unknown) => http.delete(`/api/cold-storage/stores/${id}`),
    getColdStoreMonitorExceptionStatistics: async () => http.get(`/api/cold-storage/stores/monitor/exception-statistics`),
    getColdStoreMonitorCards: async (query?: unknown) =>
      http.get(withQuery(`/api/cold-storage/stores/monitor/cards`, { ...query } as Record<string, unknown>)),
    getColdStoreMonitorCardDetail: async (id?: unknown) => http.get(`/api/cold-storage/stores/monitor/cards/${id}`),
    getColdStoreInsideDoorStatuses: async () => http.get(`/api/cold-storage/stores/inside/door-statuses`),
    getColdStoreInsideDoorDetail: async (storeId?: unknown) => http.get(`/api/cold-storage/stores/inside/door-statuses/${storeId}`),
    getColdStoreInsideTemperatureOverview: async () => http.get(`/api/cold-storage/stores/inside/temperature-overview`),
    getColdStoreRefrigerationHealthOverview: async () => http.get(`/api/cold-storage/stores/refrigeration/health-overview`),
    getColdStoreRefrigerationUnitDetail: async (unitCode?: unknown) => http.get(`/api/cold-storage/stores/refrigeration/units/${unitCode}`),
    getColdStoreRefrigerationEnergy: async () => http.get(`/api/cold-storage/stores/refrigeration/energy`),
    getColdStoreLeakResponses: async () => http.get(`/api/cold-storage/stores/leak-responses`),
    getColdStoreLeakResponseDetail: async (alarmId?: unknown) => http.get(`/api/cold-storage/stores/leak-responses/${alarmId}`),
    getColdStoreStatisticsPreview: async () => http.get(`/api/cold-storage/stores/statistics/preview`),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<ColdStorageClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createColdStorageClient(httpModule.createHttpClientForPlatform(ctx));
}
