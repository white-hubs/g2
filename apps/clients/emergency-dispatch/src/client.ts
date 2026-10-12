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

/** 旧仓 CubeEmergencyDispatchService / 后端 emergency 服务前缀 */
const EMERGENCY_API = "/api/emergency";

export type EmergencyDispatchClient = {
  pageResourceRefs: (query?: unknown) => Promise<unknown>;
  listResourceRefs: (query?: unknown) => Promise<unknown>;
  createResourceRef: (payload?: unknown) => Promise<unknown>;
  deleteResourceRef: (id?: unknown) => Promise<unknown>;
  getResourceRefStatistics: () => Promise<unknown>;
  getAreaTree: () => Promise<unknown>;
  pageResourceCandidates: (query?: unknown) => Promise<unknown>;
  createAreaPlaneMap: (payload?: unknown) => Promise<unknown>;
  updateAreaPlaneMap: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteAreaPlaneMap: (id?: unknown) => Promise<unknown>;
  listAreaPlaneMapsByAreaId: (areaId?: unknown) => Promise<unknown>;
  pageEvacuationRoutes: (query?: unknown) => Promise<unknown>;
  createEvacuationRoute: (payload?: unknown) => Promise<unknown>;
  updateEvacuationRoute: (id?: unknown, payload?: unknown) => Promise<unknown>;
  deleteEvacuationRoute: (id?: unknown) => Promise<unknown>;
  updateEvacuationRouteDevices: (id?: unknown, payload?: unknown) => Promise<unknown>;
};

export function createEmergencyDispatchClient(http: HttpClient): EmergencyDispatchClient {
  return {
    pageResourceRefs: async (query?: unknown) =>
      http.get(withQuery(`${EMERGENCY_API}/resource-refs/page`, { ...query } as Record<string, unknown>)),
    listResourceRefs: async (query?: unknown) => http.post(`${EMERGENCY_API}/resource-refs/resources`, { ...query }),
    createResourceRef: async (payload?: unknown) => http.post(`${EMERGENCY_API}/resource-refs`, payload),
    deleteResourceRef: async (id?: unknown) =>
      http.delete(withQuery(`${EMERGENCY_API}/resource-refs/${id}`, {} as Record<string, unknown>)),
    getResourceRefStatistics: async () => http.get(withQuery(`${EMERGENCY_API}/resource-refs/statistics`, {} as Record<string, unknown>)),
    // 区域树走 mdata 真实接口，对齐旧仓 cubeMdataService.getAreaTree
    getAreaTree: async () => http.get(withQuery(`/api/mdata/area/list`, {} as Record<string, unknown>)),
    // 候选资源需聚合 device/staff/property，本地仍走已部署的 BFF 聚合接口
    pageResourceCandidates: async (query?: unknown) =>
      http.get(withQuery(`/gw-bff/emergency-dispatch/resource-candidates/page`, { ...query } as Record<string, unknown>)),
    createAreaPlaneMap: async (payload?: unknown) => http.post(`${EMERGENCY_API}/area-plane-maps`, { ...payload }),
    updateAreaPlaneMap: async (id?: unknown, payload?: unknown) => http.put(`${EMERGENCY_API}/area-plane-maps/${id}`, { ...payload }),
    deleteAreaPlaneMap: async (id?: unknown) =>
      http.delete(withQuery(`${EMERGENCY_API}/area-plane-maps/${id}`, {} as Record<string, unknown>)),
    listAreaPlaneMapsByAreaId: async (areaId?: unknown) =>
      http.get(withQuery(`${EMERGENCY_API}/area-plane-maps/area/${areaId}`, {} as Record<string, unknown>)),
    pageEvacuationRoutes: async (query?: unknown) =>
      http.get(withQuery(`${EMERGENCY_API}/evacuation-routes/page`, { ...query } as Record<string, unknown>)),
    createEvacuationRoute: async (payload?: unknown) => http.post(`${EMERGENCY_API}/evacuation-routes`, { ...payload }),
    updateEvacuationRoute: async (id?: unknown, payload?: unknown) => http.put(`${EMERGENCY_API}/evacuation-routes/${id}`, { ...payload }),
    deleteEvacuationRoute: async (id?: unknown) =>
      http.delete(withQuery(`${EMERGENCY_API}/evacuation-routes/${id}`, {} as Record<string, unknown>)),
    updateEvacuationRouteDevices: async (id?: unknown, payload?: unknown) =>
      http.put(`${EMERGENCY_API}/evacuation-routes/${id}/devices`, { ...payload }),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<EmergencyDispatchClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createEmergencyDispatchClient(httpModule.createHttpClientForPlatform(ctx));
}
