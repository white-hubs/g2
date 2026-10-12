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

export type VideoMonitorClient = {
  createCameraAuth: (params?: unknown) => Promise<unknown>;
  updateCameraAuth: (id?: unknown, params?: unknown) => Promise<unknown>;
  deleteCameraAuth: (id?: unknown) => Promise<unknown>;
  getCameraAuth: (id?: unknown) => Promise<unknown>;
  listAuthGroup: (params?: unknown) => Promise<unknown>;
  listVideoMonitorGroup: (params?: unknown) => Promise<unknown>;
  listVideoMonitorDeviceOfRule: (params?: unknown) => Promise<unknown>;
  listVideoMonitorDevice: (params?: unknown) => Promise<unknown>;
  queryVideoMonitorDeviceByAreaOrGroupAndTag: (params?: unknown, _arg?: unknown) => Promise<unknown>;
  listAiInspectionCameraOptions: (params?: unknown) => Promise<unknown>;
  getAiInspectionCameraOptionsByIds: (params?: unknown) => Promise<unknown>;
  listAiInspectionAlgorithms: () => Promise<unknown>;
  listAiInspectionPlans: (params?: unknown) => Promise<unknown>;
  getAiInspectionPlan: (id?: unknown) => Promise<unknown>;
  pageAiInspectionPlanCameras: (id?: unknown, params?: unknown) => Promise<unknown>;
  listAiInspectionPlanActionRules: (id?: unknown, params?: unknown) => Promise<unknown>;
  createAiInspectionPlan: (params?: unknown) => Promise<unknown>;
  patchAiInspectionPlan: (id?: unknown, params?: unknown) => Promise<unknown>;
  updateAiInspectionPlanEnabled: (id?: unknown, enabled?: unknown) => Promise<unknown>;
  deleteAiInspectionPlan: (id?: unknown) => Promise<unknown>;
  runAiInspectionPlanOnce: (id?: unknown) => Promise<unknown>;
  listAiInspectionTasks: (params?: unknown) => Promise<unknown>;
  getAiInspectionTask: (id?: unknown) => Promise<unknown>;
  listAiInspectionEvents: (params?: unknown) => Promise<unknown>;
  getAiInspectionEvent: (id?: unknown) => Promise<unknown>;
  ignoreAiInspectionEvent: (id?: unknown, params?: unknown) => Promise<unknown>;
  generateAiInspectionEventAction: (id?: unknown, params?: unknown) => Promise<unknown>;
  listAiInspectionEmergencyRules: (params?: unknown) => Promise<unknown>;
  listAiInspectionWorkOrderTemplates: (params?: unknown) => Promise<unknown>;
  getAiInspectionWorkOrderTemplate: (id?: unknown) => Promise<unknown>;
};

export function createVideoMonitorClient(http: HttpClient): VideoMonitorClient {
  return {
    createCameraAuth: async (params?: unknown) => http.post("/gw-bff/video-monitor/camera-auths", { ...params }),
    updateCameraAuth: async (id?: unknown, params?: unknown) => http.put(`/gw-bff/video-monitor/camera-auths/${id}`, { ...params }),
    deleteCameraAuth: async (id?: unknown) => http.delete(`/gw-bff/video-monitor/camera-auths/${id}`),
    getCameraAuth: async (id?: unknown) => http.get(`/gw-bff/video-monitor/camera-auths/${id}`),
    listAuthGroup: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/camera-auths`, { ...params } as Record<string, unknown>)),
    listVideoMonitorGroup: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/device-groups`, { ...params } as Record<string, unknown>)),
    listVideoMonitorDeviceOfRule: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/devices-of-rule`, { ...params } as Record<string, unknown>)),
    listVideoMonitorDevice: async (params?: unknown) => http.post(`/gw-bff/video-monitor/devices`, { ...params }),
    queryVideoMonitorDeviceByAreaOrGroupAndTag: async (params?: unknown, _arg?: unknown) =>
      http.post(`/gw-bff/video-monitor/devices-by-area-or-group-and-tag`, { ...params }),
    listAiInspectionCameraOptions: async (params?: unknown) =>
      http.post(`/gw-bff/video-monitor/ai-inspection/camera-options`, { ...params }),
    getAiInspectionCameraOptionsByIds: async (params?: unknown) =>
      http.post(`/gw-bff/video-monitor/ai-inspection/camera-options/by-ids`, { ...params }),
    listAiInspectionAlgorithms: async () => http.get(`/gw-bff/video-monitor/camera-ai-inspection-algorithms`),
    listAiInspectionPlans: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/camera-ai-inspection-plans`, { ...params } as Record<string, unknown>)),
    getAiInspectionPlan: async (id?: unknown) => http.get(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}`),
    pageAiInspectionPlanCameras: async (id?: unknown, params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}/cameras`, { ...params } as Record<string, unknown>)),
    listAiInspectionPlanActionRules: async (id?: unknown, params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}/action-rules`, { ...params } as Record<string, unknown>)),
    createAiInspectionPlan: async (params?: unknown) => http.post(`/gw-bff/video-monitor/camera-ai-inspection-plan`, { ...params }),
    patchAiInspectionPlan: async (id?: unknown, params?: unknown) =>
      http.patch(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}`, { ...params }),
    updateAiInspectionPlanEnabled: async (id?: unknown, enabled?: unknown) =>
      http.put(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}/${enabled}`, {}),
    deleteAiInspectionPlan: async (id?: unknown) => http.delete(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}`),
    runAiInspectionPlanOnce: async (id?: unknown) => http.post(`/gw-bff/video-monitor/camera-ai-inspection-plan/${id}/run-once`, {}),
    listAiInspectionTasks: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/camera-ai-inspection-tasks`, { ...params } as Record<string, unknown>)),
    getAiInspectionTask: async (id?: unknown) => http.get(`/gw-bff/video-monitor/camera-ai-inspection-task/${id}`),
    listAiInspectionEvents: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/camera-ai-inspection-events`, { ...params } as Record<string, unknown>)),
    getAiInspectionEvent: async (id?: unknown) => http.get(`/gw-bff/video-monitor/camera-ai-inspection-event/${id}`),
    ignoreAiInspectionEvent: async (id?: unknown, params?: unknown) =>
      http.put(`/gw-bff/video-monitor/camera-ai-inspection-event/${id}/ignore`, { ...params }),
    generateAiInspectionEventAction: async (id?: unknown, params?: unknown) =>
      http.post(`/gw-bff/video-monitor/camera-ai-inspection-event/${id}/generate-action`, { ...params }),
    listAiInspectionEmergencyRules: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/ai-inspection/emergency-rules`, { ...params } as Record<string, unknown>)),
    listAiInspectionWorkOrderTemplates: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/video-monitor/ai-inspection/work-order-templates`, { ...params } as Record<string, unknown>)),
    getAiInspectionWorkOrderTemplate: async (id?: unknown) => http.get(`/gw-bff/video-monitor/ai-inspection/work-order-template/${id}`),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<VideoMonitorClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createVideoMonitorClient(httpModule.createHttpClientForPlatform(ctx));
}
