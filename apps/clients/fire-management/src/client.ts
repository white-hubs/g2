// @ts-nocheck — generated from cube fire-management.client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";
import type { FireManagementClient as ContractClient } from "@g2-contract/fire-management";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${k}=${encodeURIComponent(String(item))}`);
      continue;
    }
    parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  if (!parts.length) return url;
  const qs = parts.join("&");
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

function unwrapData(body: unknown): unknown {
  let current = body;
  for (let i = 0; i < 4; i += 1) {
    if (current != null && typeof current === "object" && !Array.isArray(current) && "data" in current) {
      current = (current as { data: unknown }).data;
      continue;
    }
    break;
  }
  return current;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  patch: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

const SECURITY_MANAGEMENT_API = "/api/securitymanagement";
const FIRE_MANAGEMENT_P2_API = `${SECURITY_MANAGEMENT_API}/fireManage/p2`;

export type FireManagementClient = ContractClient & Record<string, (...args: any[]) => Promise<any>>;

export function createFireManagementClient(http: HttpClient): FireManagementClient {
  const asArray = (data: unknown) => (Array.isArray(data) ? data : []);
  return {
    listFireDevices: async (params) => http.get(withQuery("/api/fire-device/list", { ...params })),
    getFireDeviceDetail: async (id) => http.get(`/api/fire-device/detail/${id}`),
    createFireDevice: async (params) => http.post("/api/fire-device", { ...params }),
    updateFireDevice: async (params) => http.put("/api/fire-device", { ...params }),
    deleteFireDevice: async (id) => {
      await http.delete(`/api/fire-device/${id}`);
    },

    listFireHosts: async (params) =>
      unwrapData(
        await http.get(
          withQuery(`${SECURITY_MANAGEMENT_API}/getFireManageDevicePage`, {
            pageNumber: params?.pageNumber,
            pageSize: params?.pageSize,
            deviceName: params?.deviceName ?? params?.keyword,
            productModel: params?.productModel,
            brandName: params?.brandName,
          }),
        ),
      ),
    getFireHostDetail: async (id) => http.get(`/api/fire-host/detail/${id}`),
    createFireHost: async (params) => http.post("/api/fire-host", { ...params }),
    updateFireHost: async (params) => http.put("/api/fire-host", { ...params }),
    deleteFireHost: async (id) => {
      await http.delete(`${SECURITY_MANAGEMENT_API}/deleteFireManageDevice/${id}`);
    },

    listFirePoints: async (params) =>
      unwrapData(
        await http.get(
          withQuery(`${SECURITY_MANAGEMENT_API}/getFirePointDevicePage`, {
            fireManageDeviceId: params?.hostId,
            pageNumber: params?.pageNumber,
            pageSize: params?.pageSize,
            pointName: params?.pointName ?? params?.keyword,
            productModel: params?.productModel ?? params?.type,
            brandName: params?.brandName,
            location: params?.location,
            circuit: params?.circuit,
            address: params?.address,
            pointCode: params?.pointCode,
            code: params?.deviceCode ?? params?.code,
            busType: params?.busType,
          }),
        ),
      ),
    getFirePointDetail: async (id) => http.get(`/api/fire-point/detail/${id}`),
    createFirePoint: async (params) => http.post(`${SECURITY_MANAGEMENT_API}/addFirePointDevice`, { ...params }),
    updateFirePoint: async (params) => http.post(`${SECURITY_MANAGEMENT_API}/updateFirePointDevice`, { ...params }),
    deleteFirePoint: async (id) => {
      await http.delete(`${SECURITY_MANAGEMENT_API}/deleteFirePointDevice/${id}`);
    },

    listFirePointEvents: async (params) => {
      const { eventCodes, ...payload } = params ?? {};
      return unwrapData(await http.get(withQuery(`${SECURITY_MANAGEMENT_API}/getFirePointDeviceEventPage`, { ...payload, eventCodes })));
    },
    getFirePointEventOptions: async () => unwrapData(await http.get(`${SECURITY_MANAGEMENT_API}/getFirePointDeviceEventOptions`)),
    listFirePointLocalEvents: async (params) => {
      const { eventCodes, ...payload } = params ?? {};
      return unwrapData(
        await http.get(withQuery(`${SECURITY_MANAGEMENT_API}/getFirePointDeviceLocalEventPage`, { ...payload, eventCodes })),
      );
    },
    batchFillFirePointEmptyFields: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return unwrapData(await http.post(`${SECURITY_MANAGEMENT_API}/batchFillEmptyFields`, formData));
    },
    configFirePointDevices: async (params) => {
      await http.post(`${SECURITY_MANAGEMENT_API}/configFirePointDevice`, params);
    },
    downloadFirePointImportTemplate: async () => http.get(`${SECURITY_MANAGEMENT_API}/downloadTemplate`),

    listFireHostMethods: async (hostId, params = {}) =>
      asArray(unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/methods`, { ...params })))),
    listFireHostButtons: async (hostId) => asArray(unwrapData(await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/buttons`))),
    saveFireHostButtons: async (hostId, params) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/buttons/save`, { ...params });
    },
    updateFireHostButtons: async (hostId, params) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/buttons/update`, { ...params });
    },
    removeFireHostButton: async (hostId, buttonId) => {
      await http.delete(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/buttons/${buttonId}`);
    },

    listFireHostMonitorDevices: async (hostId, params) =>
      unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/monitor-devices/page`, { ...params }))),
    listFireHostMonitorDeviceCandidates: async (hostId, params) =>
      unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/monitor-devices/candidates/page`, { ...params }))),
    saveFireHostMonitorDevices: async (hostId, params) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/monitor-devices/save`, { ...params });
    },
    removeFireHostMonitorDevice: async (hostId, monitorDeviceId) => {
      await http.delete(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/monitor-devices/${monitorDeviceId}`);
    },

    listFireHostOverviews: async (params) =>
      unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/hosts/overview/page`, { ...params }))),
    listFireHostAlarmRecords: async (params) =>
      unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/alarms/alarm-records`, { ...params }))),
    sendFireHostControlCommand: async (hostId, params) =>
      unwrapData(await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/commands`, { ...params })),
    getFireHostControlCommandStatus: async (hostId, commandHandle) =>
      unwrapData(await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/commands/${encodeURIComponent(commandHandle)}/status`)),
    listFireControlPoints: async (hostId, params) =>
      unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/control-points/page`, { ...params }))),
    sendFirePointControlCommand: async (hostId, pointId, params) =>
      unwrapData(await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/control-points/${pointId}/commands`, { ...params })),
    getFirePointControlCommandStatus: async (hostId, pointId, commandHandle) =>
      unwrapData(
        await http.get(
          `${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/control-points/${pointId}/commands/${encodeURIComponent(commandHandle)}/status`,
        ),
      ),
    listFirePointControlPropertyOptions: async (hostId, pointId) =>
      unwrapData(await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/control-points/${pointId}/property-options`)),
    saveFirePointControlConfig: async (hostId, pointId, params) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/control-points/${pointId}/control-config`, { ...params });
    },
    getFireHostIndicatorLightConfig: async (hostId) =>
      unwrapData(await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/indicator-lights`)),
    saveFireHostIndicatorLightConfig: async (hostId, params) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/indicator-lights/save`, { ...params });
    },

    listFireUtilityMonitorCards: async (hostId, monitorType) =>
      asArray(unwrapData(await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/cards`))),
    listFireUtilityDeviceCandidates: async (hostId, monitorType, params) =>
      unwrapData(
        await http.get(
          withQuery(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/devices/candidates/page`, { ...params }),
        ),
      ),
    saveFireUtilityDevices: async (hostId, monitorType, params) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/devices`, { ...params });
    },
    updateFireUtilityRange: async (hostId, monitorType, relationId, params) => {
      await http.patch(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/devices/${relationId}/range`, {
        ...params,
      });
    },
    removeFireUtilityDevice: async (hostId, monitorType, relationId) => {
      await http.delete(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/devices/${relationId}`);
    },
    listFireUtilityDeviceProperties: async (hostId, monitorType, relationId) =>
      asArray(
        unwrapData(
          await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/devices/${relationId}/properties`),
        ),
      ),
    getFireUtilityPanel: async (hostId, monitorType) =>
      unwrapData(await http.get(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/panel`)),
    saveFireUtilityPanel: async (hostId, monitorType, params) => {
      await http.put(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/panel`, { ...params });
    },
    resetFireUtilityPanel: async (hostId, monitorType) => {
      await http.post(`${FIRE_MANAGEMENT_P2_API}/hosts/${hostId}/utility-monitor/${monitorType}/panel/reset`);
    },

    listOperationLogs: async (params) =>
      unwrapData(await http.get(withQuery(`${FIRE_MANAGEMENT_P2_API}/operation-logs/page`, { ...params }))),
    listEvents: async (params) => {
      const { eventCodes, ...payload } = params ?? {};
      return unwrapData(await http.get(withQuery(`${SECURITY_MANAGEMENT_API}/getFirePointDeviceEventPage`, { ...payload, eventCodes })));
    },
    listFirePointEventStatistics: async (params) =>
      unwrapData(await http.get(withQuery(`${SECURITY_MANAGEMENT_API}/getFirePointEventStatisticsPage`, { ...params }))),
    addOperationLog: async (operator, type, content, result) => http.post("/api/fire-operation-log", { operator, type, content, result }),
    listWaterSensors: async () => http.get("/api/fire-water/sensors"),

    addFireManageDevice: async (params) => http.post(`${SECURITY_MANAGEMENT_API}/addFireManageDevice`, { ...params }),
    listFireManageDevicePage: async (params) =>
      unwrapData(
        await http.get(
          withQuery(`${SECURITY_MANAGEMENT_API}/getFireManageDevicePage`, {
            pageNumber: params?.pageNumber,
            pageSize: params?.pageSize,
            deviceName: params?.deviceName ?? params?.keyword,
            productModel: params?.productModel,
            brandName: params?.brandName,
          }),
        ),
      ),
    sendCommand: async (params) => {
      await http.post(`${SECURITY_MANAGEMENT_API}/sendCommand`, { ...params });
    },
    getFireManageStats: async () => {
      const unwrapped = (unwrapData(await http.get(`${SECURITY_MANAGEMENT_API}/getFireManageStats`)) as any) || {};
      return {
        hostCount: unwrapped.hostCount ?? 0,
        pointCount: unwrapped.pointCount ?? 0,
        todayAlarmCount: unwrapped.todayAlarmCount ?? 0,
        todayFaultCount: unwrapped.todayFaultCount ?? 0,
      };
    },
    getProductModelList: async (type) => {
      const unwrapped = unwrapData(
        await http.get(
          type ? withQuery(`${SECURITY_MANAGEMENT_API}/getProductModelList`, { type }) : `${SECURITY_MANAGEMENT_API}/getProductModelList`,
        ),
      );
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
    getDeviceNameList: async () => {
      const unwrapped = unwrapData(await http.get(`${SECURITY_MANAGEMENT_API}/getDeviceNameList`));
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
    getRefMonitorDeviceIds: async (deviceId) => {
      const unwrapped = unwrapData(await http.get(withQuery(`${SECURITY_MANAGEMENT_API}/getRefMonitorDeviceIds`, { deviceId })));
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
    getDeviceCenterInfo: async (deviceId) => unwrapData(await http.get(`/api/device-center/device/${deviceId}`)),
    getAreaList: async () => {
      const unwrapped = unwrapData(await http.get("/api/mdata/area/list"));
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
    getAreaPlaneMap: async (areaId) => {
      const unwrapped = unwrapData(await http.get(`/api/emergency/area-plane-maps/area/${areaId}`));
      return Array.isArray(unwrapped) ? unwrapped : [];
    },
    setControlPassword: async (params) => {
      await http.post(`${SECURITY_MANAGEMENT_API}/setControlPassword`, params);
    },
    batchFillEmptyFields: async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      return unwrapData(await http.post(`${SECURITY_MANAGEMENT_API}/batchFillEmptyFields`, formData));
    },
  } as FireManagementClient;
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<FireManagementClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createFireManagementClient(httpModule.createHttpClientForPlatform(ctx));
}
