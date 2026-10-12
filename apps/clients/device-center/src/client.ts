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
  delete: (url: string, init?: RequestInit) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export interface EquipmentAssociationRuleField {
  field: string;
  operator: string;
  value: string[];
}

/**
 * GEM / 设备中心调用面。
 * - 设备中心：`/api/device-center/*`（旧 `/api/device` 已废弃）
 * - 监测列表宿主：`/api/securitymanagement/getDeviceMonitoringPage/:applicationCode`（与 243 门禁监测一致）
 */
export type DeviceCenterClient = {
  getDeviceTypeList: (query?: Record<string, unknown>) => Promise<unknown>;
  getDeviceModelList: (query?: Record<string, unknown>) => Promise<unknown>;
  getModelAttribute: (query?: Record<string, unknown>) => Promise<unknown>;
  getModelEvent: (modelId?: string) => Promise<unknown>;
  /** 设备中心实例分页（POST）；非 GEM 门禁监测列表主路径。 */
  getIotDeviceList: (query?: Record<string, unknown>) => Promise<unknown>;
  /** GEM 设备监测卡片/列表：securitymanagement + applicationCode。 */
  getDeviceMonitoringPage: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  getAreaTree: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  getStatusList: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  getApplicationGenreVo: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  getDeviceCollection: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  addDeviceCollection: (payload: { applicationCode: string; deviceId: string }) => Promise<unknown>;
  getApplicationModels: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  getDevicePanelConfigList: (payload: { businessKeys: string[]; applicationCode: string; sceneType: string }) => Promise<unknown>;
  saveDevicePanelConfig: (payload: unknown) => Promise<unknown>;
  getConfiguration: (applicationCode: string) => Promise<unknown>;
  addConfiguration: (payload: Record<string, unknown>) => Promise<unknown>;
  editConfiguration: (id: string | number, payload: Record<string, unknown>) => Promise<unknown>;
  deleteConfiguration: (id: string | number) => Promise<unknown>;
  getProdListDetail: (prodIds: string) => Promise<unknown>;
  /**
   * 与 iot-center DeviceService.getDeviceCondition 同源：
   * `GET /api/iot/north/product/prod-list-detail?prodIds&withPropertySpec`
   */
  getDeviceCondition: (query: { prodIds: string; withPropertySpec?: boolean }) => Promise<unknown>;
  /** IoT 产品品类树：`GET /api/device-center/iot/product/category-tree`（报警规则 Cascader）。 */
  getIotProductCategoryTree: () => Promise<unknown>;
  /** 品类下产品列表：`GET /api/device-center/category/:categoryCode/product/list`。 */
  getProductModelByCategory: (categoryCode: string) => Promise<unknown>;
  /** 产品列表（全部）：`GET /api/device-center/things/product/list/all`。 */
  getProductListAll: () => Promise<unknown>;
  /** 自定义标签列表：`GET /api/device-center/tag/customer/list`（设备选择弹窗标签筛）。 */
  getCustomerTagListAll: (query?: Record<string, unknown>) => Promise<unknown>;
  /** 产品品牌分页：`GET /api/device-center/base/prod-brand/page`。 */
  listProductBrands: (query?: Record<string, unknown>) => Promise<unknown>;
  /** 标签下全部设备分组及其设备，多路视频“监控分组”使用。 */
  getDeviceGroupDevicesAll: (tagCode: string) => Promise<unknown>;
  /** 设备台账详情：`GET /api/device-center/device/:id`（旧 getDeviceInstanceDetail）。 */
  getDeviceInfo: (deviceId: string) => Promise<unknown>;
  /** 关联监控列表：`GET /api/device-center/device/associated/videos`。 */
  getDeviceAssociatedVideos: (deviceId: string) => Promise<unknown>;
  /**
   * IoT 北向设备详情（含属性规格与快照）：`GET /api/iot/north/device/detail`。
   * 旧仓 GHIotSocket.deviceDetail 同源；running/attr 在部分设备上会 500，详情页优先走此接口。
   */
  getDeviceIotDetail: (deviceId: string, query?: { withSnapShot?: boolean; withPropertySpec?: boolean }) => Promise<unknown>;
  /** 属性历史：`GET /api/iot/north/device/prop/history-group`。 */
  getDeviceHistoryGroup: (query: { deviceId: string; propCodes: string; startTs: number; endTs: number }) => Promise<unknown>;
  getDeviceAttribute: (id?: string, query?: Record<string, unknown>) => Promise<unknown>;
  deviceModelEventList: (query?: Record<string, unknown>) => Promise<unknown>;
  subscribeDeviceAttribute: (payload?: unknown) => Promise<unknown>;
  /** 属性写值 / 下发：`POST /api/device-center/device/prop/value/write`（controlWithPermission）。 */
  attributeWriteValue: (payload?: unknown) => Promise<unknown>;
  /**
   * 设备属性变更操作日志分页（旧 getDeviceLogPage）：
   * `GET /api/device-center/device/instance/attribute/change/log/page`
   */
  getDeviceLogPage: (query: {
    deviceInstanceId?: string;
    pageNumber: number;
    pageSize: number;
    period?: string;
    keyword?: string;
    genreId?: string;
    executeResult?: string;
  }) => Promise<unknown>;
  /** 应用关联设备列表（门禁设备等）：securitymanagement getSecurityDevicePage。 */
  getSecurityDevicePage: (applicationCode: string, query?: Record<string, unknown>) => Promise<unknown>;
  addBatchSecurityDevice: (payload: Record<string, unknown>) => Promise<unknown>;
  deleteSecurityDevice: (id: string | number) => Promise<unknown>;
  deleteSecurityDeviceBatch: (ids: Array<string | number>) => Promise<unknown>;
  clearSecurityDevice: (payload: { applicationCode: string; keyword?: string }) => Promise<unknown>;
  /** 应用设备关联规则：`/api/device-center/tag/rule/:code`。 */
  getTagRule: (code: string) => Promise<unknown>;
  /** 保存应用设备关联规则：`/api/device-center/tag/rule`。 */
  saveTagRule: (payload: { code: string; name: string; rules: EquipmentAssociationRuleField[][] }) => Promise<unknown>;
  /** 按设备关联规则查询设备：`/api/device-center/device/instance/rule-condition/page`。 */
  getEquipmentAssociationPage: (payload: {
    pageNumber: number;
    pageSize: number;
    rules: EquipmentAssociationRuleField[][];
  }) => Promise<unknown>;
};

function securityPath(applicationCode: string, suffix: string, query?: Record<string, unknown>): string {
  return withQuery(`/api/securitymanagement/${suffix}/${encodeURIComponent(applicationCode)}`, {
    ...query,
    applicationCode,
  });
}

export function createDeviceCenterClient(http: HttpClient): DeviceCenterClient {
  return {
    getDeviceTypeList: (query) => http.get(withQuery("/api/device-center/device/genre/search", query)),
    getDeviceModelList: (query) => http.get(withQuery("/api/device-center/device/model/list", query)),
    getModelAttribute: (query) => http.get(withQuery(`/api/device-center/device/model/${query?.modelId}/associated-attribute`, query)),
    getModelEvent: (modelId) => http.get(`/api/device-center/device/mode/event/list/${modelId}`),
    getIotDeviceList: (query) => http.post("/api/device-center/device/instance/page", query ?? {}),
    getDeviceMonitoringPage: (applicationCode, query) => http.get(securityPath(applicationCode, "getDeviceMonitoringPage", query)),
    getAreaTree: (applicationCode, query) => http.get(securityPath(applicationCode, "getAreaTree", query)),
    getStatusList: (applicationCode, query) => http.get(securityPath(applicationCode, "getStatusList", query)),
    getApplicationGenreVo: (applicationCode, query) => http.get(securityPath(applicationCode, "getApplicationGenreVo", query)),
    getDeviceCollection: (applicationCode, query) => http.get(securityPath(applicationCode, "getDeviceCollection", query)),
    addDeviceCollection: (payload) => http.post("/api/securitymanagement/addDeviceCollection", payload),
    getApplicationModels: (applicationCode, query) => http.get(securityPath(applicationCode, "getApplicationModels", query)),
    getDevicePanelConfigList: (payload) => http.post("/api/securitymanagement/security-panel-config/list-query", payload),
    saveDevicePanelConfig: (payload) => http.post("/api/securitymanagement/security-panel-config", payload),
    getConfiguration: (applicationCode) =>
      http.get(withQuery(`/api/securitymanagement/getDeviceMonitor/${encodeURIComponent(applicationCode)}`, { applicationCode })),
    addConfiguration: (payload) => http.post("/api/securitymanagement/addDeviceMonitor", payload),
    editConfiguration: (id, payload) => http.put(`/api/securitymanagement/updateDeviceMonitor/${encodeURIComponent(String(id))}`, payload),
    deleteConfiguration: (id) => http.delete(`/api/securitymanagement/deleteDeviceMonitor/${encodeURIComponent(String(id))}`),
    getProdListDetail: (prodIds) => http.get(withQuery("/api/iot/north/product/prod-list-detail", { prodIds })),
    getDeviceCondition: (query) =>
      http.get(
        withQuery("/api/iot/north/product/prod-list-detail", {
          prodIds: query.prodIds,
          withPropertySpec: query.withPropertySpec ?? true,
        }),
      ),
    getIotProductCategoryTree: () => http.get("/api/device-center/iot/product/category-tree"),
    getProductModelByCategory: (categoryCode) => http.get(`/api/device-center/category/${encodeURIComponent(categoryCode)}/product/list`),
    getProductListAll: () => http.get("/api/device-center/things/product/list/all"),
    getCustomerTagListAll: (query) => http.get(withQuery("/api/device-center/tag/customer/list", query)),
    listProductBrands: (query) => http.get(withQuery("/api/device-center/base/prod-brand/page", query)),
    getDeviceGroupDevicesAll: (tagCode) => http.get(`/api/device-center/tags/${encodeURIComponent(tagCode)}/device-group-all`),
    getDeviceInfo: (deviceId) => http.get(`/api/device-center/device/${encodeURIComponent(deviceId)}`),
    getDeviceAssociatedVideos: (deviceId) => http.get(withQuery("/api/device-center/device/associated/videos", { deviceId })),
    getDeviceIotDetail: (deviceId, query) =>
      http.get(
        withQuery("/api/iot/north/device/detail", {
          deviceId,
          withSnapShot: query?.withSnapShot ?? true,
          withPropertySpec: query?.withPropertySpec ?? true,
        }),
      ),
    getDeviceHistoryGroup: (query) => http.get(withQuery("/api/iot/north/device/prop/history-group", query)),
    getDeviceAttribute: (id, query) => http.get(withQuery(`/api/device-center/device/instance/${id}/running/attr`, query)),
    deviceModelEventList: (query) => http.get(withQuery(`/api/device-center/device/model/${query?.modelId}/event/code/list`, query)),
    subscribeDeviceAttribute: (payload) => http.post("/api/device-center/device/instance/running/attr/newSubscribe", payload),
    attributeWriteValue: (payload) => http.post("/api/device-center/device/prop/value/write", payload),
    getDeviceLogPage: (query) =>
      http.get(withQuery("/api/device-center/device/instance/attribute/change/log/page", query as Record<string, unknown>)),
    getSecurityDevicePage: (applicationCode, query) => http.get(securityPath(applicationCode, "getSecurityDevicePage", query)),
    addBatchSecurityDevice: (payload) => http.post("/api/securitymanagement/add-security-device", payload),
    deleteSecurityDevice: (id) => http.delete(`/api/securitymanagement/deleteSecurityDevice/${encodeURIComponent(String(id))}`),
    deleteSecurityDeviceBatch: (ids) => http.delete(withQuery("/api/securitymanagement/deleteSecurityDeviceBatch", { ids: ids.join(",") })),
    clearSecurityDevice: (payload) =>
      http.delete("/api/securitymanagement/delete/condition/security-device", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }),
    getTagRule: (code) => http.get(`/api/device-center/tag/rule/${encodeURIComponent(code)}`),
    saveTagRule: (payload) =>
      http.post("/api/device-center/tag/rule", {
        code: payload.code,
        name: payload.name,
        rule: JSON.stringify({
          rules: payload.rules.map((ruleFields) => ({ ruleFields })),
        }),
      }),
    getEquipmentAssociationPage: (payload) =>
      http.post("/api/device-center/device/instance/rule-condition/page", {
        pageNumber: payload.pageNumber,
        pageSize: payload.pageSize,
        ruleGroup: {
          rules: payload.rules.map((ruleFields) => ({ ruleFields })),
        },
      }),
  };
}

export async function create(ctx: PlatformContext): Promise<DeviceCenterClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createDeviceCenterClient(httpModule.createHttpClientForPlatform(ctx));
}
