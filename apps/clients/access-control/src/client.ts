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

export type AccessControlClient = {
  getEnterpriseDirectory: (params?: unknown) => Promise<unknown>;
  getDoorRanking: (params?: unknown) => Promise<unknown>;
  getDoorEvents: (params?: unknown) => Promise<unknown>;
  passedTodayNum: (params?: unknown) => Promise<unknown>;
  getDoorTend: (params?: unknown) => Promise<unknown>;
  generDeviceIsWord: (params?: unknown) => Promise<unknown>;
  controlDoorverify: (params?: unknown) => Promise<unknown>;
  generDevice: (params?: unknown) => Promise<unknown>;
  getDoorType: (params?: unknown) => Promise<unknown>;
  addDoorDevices: (params?: unknown) => Promise<unknown>;
  getDoorDevicePage: (params?: unknown) => Promise<unknown>;
  removeDoorDevice: (params?: unknown) => Promise<unknown>;
  removeDoorDeviceBatch: (params?: unknown) => Promise<unknown>;
  controlDoor: (params?: unknown) => Promise<unknown>;
  getDoorEventRecord: (params?: unknown) => Promise<unknown>;
  getToDayEventTrend: (params?: unknown) => Promise<unknown>;
  getAbnormalEvent: (params?: unknown) => Promise<unknown>;
  inspectgetStatus: (params?: unknown) => Promise<unknown>;
  getDeviceProduct: (params?: unknown) => Promise<unknown>;
  getDeviceList: (params?: unknown) => Promise<unknown>;
  getProductAll: (params?: unknown) => Promise<unknown>;
};

export function createAccessControlClient(http: HttpClient): AccessControlClient {
  return {
    getEnterpriseDirectory: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/enterprise-directory`, { ...params } as Record<string, unknown>)),
    getDoorRanking: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-ranking`, { ...params } as Record<string, unknown>)),
    getDoorEvents: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-events`, { ...params } as Record<string, unknown>)),
    passedTodayNum: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/passed-today-num`, { ...params } as Record<string, unknown>)),
    getDoorTend: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-tend`, { ...params } as Record<string, unknown>)),
    generDeviceIsWord: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/security-lock/is-need`, { ...params } as Record<string, unknown>)),
    controlDoorverify: async (params?: unknown) => http.post(`/gw-bff/access-control/security-lock/verify`, { ...params }),
    generDevice: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/devices`, { ...params } as Record<string, unknown>)),
    getDoorType: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-types`, { ...params } as Record<string, unknown>)),
    addDoorDevices: async (params?: unknown) => http.post(`/gw-bff/access-control/door-devices`, { ...params }),
    getDoorDevicePage: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-device-page`, { ...params } as Record<string, unknown>)),
    removeDoorDevice: async (params?: unknown) =>
      http.delete(withQuery(`/gw-bff/access-control/door-device`, { ...params } as Record<string, unknown>)),
    removeDoorDeviceBatch: async (params?: unknown) =>
      http.delete(withQuery(`/gw-bff/access-control/door-devices`, { ...params } as Record<string, unknown>)),
    controlDoor: async (params?: unknown) => http.post(`/gw-bff/access-control/control-door`, { ...params }),
    getDoorEventRecord: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-event-record`, { ...params } as Record<string, unknown>)),
    getToDayEventTrend: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/today-event-trend`, { ...params } as Record<string, unknown>)),
    getAbnormalEvent: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/abnormal-event`, { ...params } as Record<string, unknown>)),
    inspectgetStatus: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/door-status`, { ...params } as Record<string, unknown>)),
    getDeviceProduct: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/device-products`, { ...params } as Record<string, unknown>)),
    getDeviceList: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/device-list`, { ...params } as Record<string, unknown>)),
    getProductAll: async (params?: unknown) =>
      http.get(withQuery(`/gw-bff/access-control/products`, { ...params } as Record<string, unknown>)),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<AccessControlClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createAccessControlClient(httpModule.createHttpClientForPlatform(ctx));
}
