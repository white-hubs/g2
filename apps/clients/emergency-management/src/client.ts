import type { PlatformContext } from "@g2-composition/contract";
import type { EmergencyManagementClient } from "@g2-contract/emergency-management";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient;
}

const API = "/api/emergency";

function query(url: string, params: Record<string, unknown> = {}): string {
  const value = new URLSearchParams();
  Object.entries(params).forEach(([key, item]) => {
    if (item !== undefined && item !== null && item !== "") value.append(key, String(item));
  });
  const suffix = value.toString();
  return suffix ? `${url}?${suffix}` : url;
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

export function createEmergencyManagementClient(http: HttpClient): EmergencyManagementClient {
  return {
    listPlanDocuments: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-files`, params))),
    getPlanDocument: async (id) => unwrapData(await http.get(`${API}/emergency-file/${id}`)),
    createPlanDocument: async (data) => unwrapData(await http.post(`${API}/emergency-file`, data)),
    updatePlanDocument: async (data) => unwrapData(await http.put(`${API}/emergency-file/${data.id}`, data)),
    deletePlanDocument: async (id) => unwrapData(await http.delete(`${API}/emergency-file/${id}`)),
    uploadFile: async (data) => unwrapData(await http.post("/api/file/file", data)),
    deleteFile: async (id) => unwrapData(await http.delete(`/api/file/file/${id}`)),
    listRules: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-rule/list-page`, params))),
    getRuleDetail: async (id) => unwrapData(await http.get(`${API}/emergency-rule/${id}`)),
    createRule: async (data) => unwrapData(await http.post(`${API}/emergency-rule`, data)),
    updateRule: async (data) => unwrapData(await http.put(`${API}/emergency-rule`, data)),
    setRuleEnabled: async (data) => unwrapData(await http.put(`${API}/emergency-rule/enabled`, data)),
    deleteRule: async (id) => unwrapData(await http.delete(`${API}/emergency-rule/delete/${id}`)),
    listEmergencyTypes: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-types`, params))),
    listEmergencyTypeDevices: async (params = {}) =>
      unwrapData(await http.get(query(`${API}/emergency-type-devices`, { applicationCode: "SECURITY_MONITORING", ...params }))),
    listDeviceGenres: async (params = {}) => unwrapData(await http.get(query("/api/device/device/genre/search", params))),
    listDeviceModels: async (params = {}) => unwrapData(await http.get(query("/api/device/device/model/list", params))),
    listDeviceAttributes: async (params = {}) =>
      unwrapData(await http.get(query(`/api/device/device/instance/${params.id ?? ""}/running/attr`, params))),
    listDeviceInstances: async (params = {}) => unwrapData(await http.get(query("/api/device/device/instance/list-page", params))),
    listSecurityDevices: async (applicationCode = "SECURITY_MONITORING", params = {}) =>
      unwrapData(await http.get(query(`/api/securitymanagement/getSecurityDevicePage/${applicationCode}`, params))),
    listAreas: async (params = {}) => unwrapData(await http.get(query("/api/mdata/area/list", params))),
    listEventTypes: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-event-type/page`, params))),
    getEventTypes: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-event-types`, params))),
    createEventType: async (data) => unwrapData(await http.post(`${API}/emergency-event-type`, data)),
    updateEventType: async (data) => unwrapData(await http.put(`${API}/emergency-event-type/${data.id}`, data)),
    deleteEventType: async (id) => unwrapData(await http.delete(`${API}/emergency-event-type/${id}`)),
    listFileTypes: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-file-type-page`, params))),
    getFileTypes: async (params = {}) => unwrapData(await http.get(query(`${API}/emergency-file-types`, params))),
    createFileType: async (data) => unwrapData(await http.post(`${API}/emergency-file-type`, data)),
    updateFileType: async (data) => unwrapData(await http.put(`${API}/emergency-file-type/${data.id}`, data)),
    deleteFileType: async (id) => unwrapData(await http.delete(`${API}/emergency-file-type/${id}`)),
    getFlowDictionary: async (params) => unwrapData(await http.get(query("/api/dictionary/getDataDictionaryByItemAndCode", params))),
    runWorkflow: async (flowId, data) => unwrapData(await http.post(`/api/ai-center/flow/console/studio/${flowId}/run`, data)),
    getAlarmNoticeConfig: async (businessType) => unwrapData(await http.get(query("/api/bracing/message/getConfigInfo", { businessType }))),
    saveAlarmNoticeConfig: async (data) => unwrapData(await http.post("/api/bracing/message/addConfig", data)),
    getEmergencyFileNotice: async () => unwrapData(await http.get(`${API}/emergency-file-notice`)),
    saveEmergencyFileNotice: async (data) => unwrapData(await http.post(`${API}/emergency-file-notice`, data)),
    getNoticeMethods: async (sceneCode) => unwrapData(await http.get(`/api/message2/sat-msg-scene-receive/code/${sceneCode}`)),
    getChannelConfigs: async (sceneCode) => unwrapData(await http.get(`/api/message/sat-msg-configs/channel/${sceneCode}`)),
    listTenantUsers: async (params = {}) =>
      unwrapData(await http.get(query("/api/ouaa/authenticated/user-under-tenant/page", { ...params, enabled: true }))),
    getTenantUsersByIds: async (ids) => {
      const normalized = (ids || []).map(String).filter(Boolean);
      if (!normalized.length) return [];
      return unwrapData(await http.get(query("/gw-bff/ouaa/users/get-by-ids", { ids: normalized.join(",") })));
    },
  };
}

export async function create(ctx: PlatformContext): Promise<EmergencyManagementClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createEmergencyManagementClient(module.createHttpClientForPlatform(ctx));
}
