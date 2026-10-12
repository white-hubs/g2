import type { PlatformContext } from "@g2-composition/contract";
export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}
function withQuery(url: string, payload?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(payload ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return search.size > 0 ? url + "?" + search.toString() : url;
}
async function resultAs<T>(request: Promise<unknown>): Promise<T> {
  let result = await request;
  for (let depth = 0; depth < 4 && result && typeof result === "object" && !(result instanceof Blob); depth++) {
    const record = result as Record<string, unknown>;
    if (
      record.success === false ||
      (record.code != null && !["0", "200"].includes(String(record.code)) && (record.message || record.msg))
    ) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    if (!("data" in record)) break;
    result = record.data;
  }
  return result as T;
}
async function optionalResult<T>(request: Promise<unknown>): Promise<T | null> {
  try {
    return await resultAs<T>(request);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      (("httpStatus" in error && error.httpStatus === 404) || ("status" in error && error.status === 404))
    ) {
      return null;
    }
    throw error;
  }
}

import { ELECTRICAL_MANAGEMENT_GATEWAY_PREFIX, type ElectricalSafetyGateway } from "@g2-contract/electrical-safety";
import type { ElectricalReferenceClient } from "@g2-contract/electrical-safety/references";
export type ElectricalSafetyClient = ElectricalSafetyGateway & ElectricalReferenceClient & GraphClient & LineLossClient;
export function createElectricalSafetyClient(http: HttpClient): ElectricalSafetyClient {
  const baseURL = ELECTRICAL_MANAGEMENT_GATEWAY_PREFIX;
  const deviceCenterBaseURL = "/api/device-center";
  const securityBaseURL = "/api/securitymanagement";
  const encodeId = (id: string | number): string => encodeURIComponent(String(id));

  const listBusinessDictionaryItems: ElectricalSafetyGateway["listBusinessDictionaryItems"] = async (dictType) =>
    resultAs(http.get(withQuery(`${baseURL}/business-dictionaries/${encodeURIComponent(dictType)}/items`, undefined)));

  const getHomeFacilityOverviews: ElectricalSafetyGateway["getHomeFacilityOverviews"] = async () =>
    resultAs(http.get(withQuery(`${baseURL}/home/facility-overviews`, undefined)));

  const getDeviceOnlineRate: ElectricalSafetyGateway["getDeviceOnlineRate"] = async () =>
    resultAs(http.get(withQuery(`${baseURL}/home/statistics/device-online-rate`, undefined)));

  const getDeviceHealthDistribution: ElectricalSafetyGateway["getDeviceHealthDistribution"] = async () =>
    resultAs(http.get(withQuery(`${baseURL}/home/statistics/device-health-distribution`, undefined)));

  const getSafetyScore: ElectricalSafetyGateway["getSafetyScore"] = async () =>
    resultAs(http.get(withQuery(`${baseURL}/home/statistics/safety-score`, undefined)));

  const getMonthlyLineLoss: ElectricalSafetyGateway["getMonthlyLineLoss"] = async () =>
    resultAs(http.get(withQuery(`${securityBaseURL}/lineLoss/stat/month`, undefined)));

  const listFacilities: ElectricalSafetyGateway["listFacilities"] = async (params) =>
    resultAs(http.get(withQuery(`${baseURL}/facilities`, { ...params })));

  const getFacility: ElectricalSafetyGateway["getFacility"] = async (id) =>
    resultAs(http.get(withQuery(`${baseURL}/facilities/${encodeId(id)}`, undefined)));

  const createFacility: ElectricalSafetyGateway["createFacility"] = async (payload) =>
    resultAs(http.post(`${baseURL}/facilities`, { ...payload }));

  const updateFacility: ElectricalSafetyGateway["updateFacility"] = async (id, payload) =>
    resultAs(http.put(`${baseURL}/facilities/${encodeId(id)}`, { ...payload }));

  const deleteFacility: ElectricalSafetyGateway["deleteFacility"] = async (id) =>
    resultAs(http.delete(withQuery(`${baseURL}/facilities/${encodeId(id)}`, undefined)));

  const listFacilityDevices: ElectricalSafetyGateway["listFacilityDevices"] = async (facilityId, deviceKind) =>
    resultAs(http.get(withQuery(`${baseURL}/facilities/${encodeId(facilityId)}/devices`, { deviceKind })));

  const associateFacilityDevices: ElectricalSafetyGateway["associateFacilityDevices"] = async (facilityId, payload) =>
    resultAs(http.post(`${baseURL}/facilities/${encodeId(facilityId)}/devices`, { ...payload }));

  const removeFacilityDevice: ElectricalSafetyGateway["removeFacilityDevice"] = async (facilityId, deviceId) =>
    resultAs(http.delete(withQuery(`${baseURL}/facilities/${encodeId(facilityId)}/devices/${encodeId(deviceId)}`, undefined)));

  const listElectricalDeviceTypeParameterConfigs: ElectricalSafetyGateway["listElectricalDeviceTypeParameterConfigs"] = async () =>
    resultAs(http.get(withQuery(`${baseURL}/device-parameter-configs`, undefined)));

  const getDeviceConfig: ElectricalSafetyGateway["getDeviceConfig"] = async (facilityId, deviceId) =>
    resultAs(http.get(withQuery(`${baseURL}/facilities/${encodeId(facilityId)}/devices/${encodeId(deviceId)}/config`, undefined)));

  const saveDeviceConfig: ElectricalSafetyGateway["saveDeviceConfig"] = async (facilityId, deviceId, payload) =>
    resultAs(http.put(`${baseURL}/facilities/${encodeId(facilityId)}/devices/${encodeId(deviceId)}/config`, { ...payload }));

  const getEnvironmentDeviceParameterConfig: ElectricalSafetyGateway["getEnvironmentDeviceParameterConfig"] = async (
    facilityId,
    deviceId,
  ) =>
    resultAs(
      http.get(
        withQuery(`${baseURL}/facilities/${encodeId(facilityId)}/devices/${encodeId(deviceId)}/environment-parameter-config`, undefined),
      ),
    );

  const saveEnvironmentDeviceParameterConfig: ElectricalSafetyGateway["saveEnvironmentDeviceParameterConfig"] = async (
    facilityId,
    deviceId,
    payload,
  ) =>
    resultAs(
      http.put(`${baseURL}/facilities/${encodeId(facilityId)}/devices/${encodeId(deviceId)}/environment-parameter-config`, { ...payload }),
    );

  const listMonitoringFacilities: ElectricalSafetyGateway["listMonitoringFacilities"] = async (params) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/facilities`, { ...params })));

  const getMonitoringOverview: ElectricalSafetyGateway["getMonitoringOverview"] = async (facilityId) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/overview`, undefined)));

  const listMonitoringDevices: ElectricalSafetyGateway["listMonitoringDevices"] = async (facilityId, params) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/devices`, { ...params })));

  const getMonitoringDevice: ElectricalSafetyGateway["getMonitoringDevice"] = async (deviceId) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/devices/${encodeId(deviceId)}`, undefined)));

  const getDeviceRealtimeProperties: ElectricalSafetyGateway["getDeviceRealtimeProperties"] = async (deviceId) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/realtime-properties`, undefined)));

  const controlDeviceProperty: ElectricalSafetyGateway["controlDeviceProperty"] = async (deviceId, propertyCode, payload) =>
    resultAs(
      http.post(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/properties/${encodeURIComponent(propertyCode)}:control`, {
        ...payload,
      }),
    );

  const listDeviceControlRecords: ElectricalSafetyGateway["listDeviceControlRecords"] = async (deviceId, params) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/control-records`, { ...params })));

  const listDeviceAlarmRecords: ElectricalSafetyGateway["listDeviceAlarmRecords"] = async (deviceId, params) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/alarm-records`, { ...params })));

  const listDeviceMaintenanceRecords: ElectricalSafetyGateway["listDeviceMaintenanceRecords"] = async (deviceId, params) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/maintenance-records`, { ...params })));

  const invokeDeviceMethod: ElectricalSafetyGateway["invokeDeviceMethod"] = async (deviceId, methodCode, payload) =>
    resultAs(
      http.post(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/methods/${encodeURIComponent(methodCode)}:invoke`, { ...payload }),
    );

  const getDeviceAiAnalysis: ElectricalSafetyGateway["getDeviceAiAnalysis"] = async (deviceId) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/devices/${encodeId(deviceId)}/analysis`, undefined)));

  const listConfigurableProducts: ElectricalSafetyGateway["listConfigurableProducts"] = async (facilityId) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/card-configs/products`, undefined)));

  const listProductCategoryTree: ElectricalSafetyGateway["listProductCategoryTree"] = async () =>
    resultAs(http.get(withQuery(`${deviceCenterBaseURL}/iot/product/category-tree`, undefined)));

  const listProductsByCategory: ElectricalSafetyGateway["listProductsByCategory"] = async (categoryCode) => {
    const products = await resultAs<{ id: string | number; name: string }[]>(
      http.get(withQuery(`${deviceCenterBaseURL}/category/${encodeURIComponent(categoryCode)}/product/list`, undefined)),
    );
    return products.map((product) => ({ productCode: String(product.id), productName: product.name }));
  };

  const listProductProperties: ElectricalSafetyGateway["listProductProperties"] = async (productCode) => {
    const properties = await resultAs<{ propCode?: string; name?: string; unitName?: string | null }[]>(
      http.get(withQuery(`${deviceCenterBaseURL}/things/product-prop/list`, { prodId: productCode })),
    );
    return properties.flatMap((property) =>
      property.propCode && property.name
        ? [{ propertyCode: property.propCode, propertyName: property.name, unit: property.unitName ?? null }]
        : [],
    );
  };

  const getDeviceCardConfig: ElectricalSafetyGateway["getDeviceCardConfig"] = async (facilityId, productCode) =>
    resultAs(
      http.get(
        withQuery(
          `${baseURL}/monitoring/facilities/${encodeId(facilityId)}/card-configs/products/${encodeURIComponent(productCode)}`,
          undefined,
        ),
      ),
    );

  const saveDeviceCardConfig: ElectricalSafetyGateway["saveDeviceCardConfig"] = async (facilityId, productCode, payload) =>
    resultAs(
      http.put(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/card-configs/products/${encodeURIComponent(productCode)}`, {
        ...payload,
      }),
    );

  const getMonitorPanelConfig: ElectricalSafetyGateway["getMonitorPanelConfig"] = async (facilityId) =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/panel-config`, undefined)));

  const saveMonitorPanelConfig: ElectricalSafetyGateway["saveMonitorPanelConfig"] = async (facilityId, payload) =>
    resultAs(http.put(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/panel-config`, { ...payload }));

  const getElectricalCenterScadaBinding: ElectricalSafetyGateway["getElectricalCenterScadaBinding"] = async () =>
    resultAs(http.get(withQuery(`${baseURL}/monitoring/scada-binding`, undefined)));

  const saveElectricalCenterScadaBinding: ElectricalSafetyGateway["saveElectricalCenterScadaBinding"] = async (payload) =>
    resultAs(http.put(`${baseURL}/monitoring/scada-binding`, { ...payload }));

  const deleteElectricalCenterScadaBinding: ElectricalSafetyGateway["deleteElectricalCenterScadaBinding"] = async () =>
    resultAs(http.delete(withQuery(`${baseURL}/monitoring/scada-binding`, undefined)));

  const getFacilityScadaBinding: ElectricalSafetyGateway["getFacilityScadaBinding"] = async (facilityId) =>
    optionalResult(http.get(withQuery(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/scada-binding`, undefined)));

  const saveFacilityScadaBinding: ElectricalSafetyGateway["saveFacilityScadaBinding"] = async (facilityId, payload) =>
    resultAs(http.put(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/scada-binding`, { ...payload }));

  const deleteFacilityScadaBinding: ElectricalSafetyGateway["deleteFacilityScadaBinding"] = async (facilityId) =>
    resultAs(http.delete(withQuery(`${baseURL}/monitoring/facilities/${encodeId(facilityId)}/scada-binding`, undefined)));

  const listRemoteInspectionTemplates: ElectricalSafetyGateway["listRemoteInspectionTemplates"] = async (params) =>
    resultAs(http.get(withQuery(`${baseURL}/remote-inspection/templates`, { ...params })));

  const getRemoteInspectionTemplate: ElectricalSafetyGateway["getRemoteInspectionTemplate"] = async (id) =>
    resultAs(http.get(withQuery(`${baseURL}/remote-inspection/templates/${encodeId(id)}`, undefined)));

  const createRemoteInspectionTemplate: ElectricalSafetyGateway["createRemoteInspectionTemplate"] = async (payload) =>
    resultAs(http.post(`${baseURL}/remote-inspection/templates`, { ...payload }));

  const updateRemoteInspectionTemplate: ElectricalSafetyGateway["updateRemoteInspectionTemplate"] = async (id, payload) =>
    resultAs(http.put(`${baseURL}/remote-inspection/templates/${encodeId(id)}`, { ...payload }));

  const deleteRemoteInspectionTemplate: ElectricalSafetyGateway["deleteRemoteInspectionTemplate"] = async (id) =>
    resultAs(http.delete(withQuery(`${baseURL}/remote-inspection/templates/${encodeId(id)}`, undefined)));

  const updateRemoteInspectionTemplateEnabled: ElectricalSafetyGateway["updateRemoteInspectionTemplateEnabled"] = async (id, payload) =>
    resultAs(http.put(`${baseURL}/remote-inspection/templates/${encodeId(id)}/enabled`, { ...payload }));

  const getRemoteInspectionData: ElectricalSafetyGateway["getRemoteInspectionData"] = async (id, params) => {
    const result = await resultAs<Awaited<ReturnType<ElectricalSafetyGateway["getRemoteInspectionData"]>>>(
      http.get(withQuery(`${baseURL}/remote-inspection/templates/${encodeId(id)}/data`, { ...params })),
    );
    // 旧网关返回日期范围内的完整记录集；新版分页响应则保留服务端的总数和当前页。
    if (result.total != null && Number.isFinite(Number(result.total))) return result;
    const pageSize = Math.max(1, params.pageSize ?? 10);
    const offset = (Math.max(1, params.pageNumber ?? 1) - 1) * pageSize;
    return { ...result, total: result.records.length, records: result.records.slice(offset, offset + pageSize) };
  };

  const exportRemoteInspectionData: ElectricalSafetyGateway["exportRemoteInspectionData"] = async (id, params) =>
    resultAs(http.get(withQuery(`${baseURL}/remote-inspection/templates/${encodeId(id)}/data/export`, { ...params })));

  return {
    listDeviceManagementPage: (params) => resultAs(http.get(withQuery("/api/device-center/device/mgt/page", params))),
    listDeviceProducts: () => resultAs(http.get("/api/device-center/things/product/list/all")),
    getAlarmRecordPage: (params) => resultAs(http.get(withQuery("/api/alarm/alarm-records", params))),
    getAlarmStatisticsLevel: (params) => resultAs(http.get(withQuery("/api/alarm/alarm-statistics/level", params))),
    listScadaPages: () => resultAs(http.get("/scada/api/pages/")),
    getScadaPage: (id) => optionalResult(http.get("/scada/api/pages/" + encodeURIComponent(id))),
    getDefaultElectricalCenterPage: () => optionalResult(http.get("/scada/api/pages/electrical-center")),
    listAllArea: () => resultAs(http.get("/api/mdata/area/list")),
    listUsers: (params) => resultAs(http.get(withQuery("/api/ouaa/users", params))),
    getSecurityDevices: (params) =>
      resultAs(http.get(withQuery("/api/securitymanagement/getSecurityDevicePage/" + encodeURIComponent(params.applicationCode), params))),
    ...createGraphClient(http),
    ...createLineLossClient(http),
    listBusinessDictionaryItems,
    getHomeFacilityOverviews,
    getDeviceOnlineRate,
    getDeviceHealthDistribution,
    getSafetyScore,
    getMonthlyLineLoss,
    listFacilities,
    getFacility,
    createFacility,
    updateFacility,
    deleteFacility,
    listFacilityDevices,
    associateFacilityDevices,
    removeFacilityDevice,
    listElectricalDeviceTypeParameterConfigs,
    getDeviceConfig,
    saveDeviceConfig,
    getEnvironmentDeviceParameterConfig,
    saveEnvironmentDeviceParameterConfig,
    listMonitoringFacilities,
    getMonitoringOverview,
    listMonitoringDevices,
    getMonitoringDevice,
    getDeviceRealtimeProperties,
    controlDeviceProperty,
    listDeviceControlRecords,
    listDeviceAlarmRecords,
    listDeviceMaintenanceRecords,
    invokeDeviceMethod,
    getDeviceAiAnalysis,
    listConfigurableProducts,
    listProductCategoryTree,
    listProductsByCategory,
    listProductProperties,
    getDeviceCardConfig,
    saveDeviceCardConfig,
    getMonitorPanelConfig,
    saveMonitorPanelConfig,
    getElectricalCenterScadaBinding,
    saveElectricalCenterScadaBinding,
    deleteElectricalCenterScadaBinding,
    getFacilityScadaBinding,
    saveFacilityScadaBinding,
    deleteFacilityScadaBinding,
    listRemoteInspectionTemplates,
    getRemoteInspectionTemplate,
    createRemoteInspectionTemplate,
    updateRemoteInspectionTemplate,
    deleteRemoteInspectionTemplate,
    updateRemoteInspectionTemplateEnabled,
    getRemoteInspectionData,
    exportRemoteInspectionData,
  };
}
export async function create(ctx: PlatformContext): Promise<ElectricalSafetyClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createElectricalSafetyClient(module.createHttpClientForPlatform(ctx));
}

import type { GraphClient, LineLossDevice, LineLossTrend, SavedPayload } from "@g2-contract/electrical-safety/graph";
function createGraphClient(http: HttpClient): GraphClient {
  const baseURL = "/api/securitymanagement";
  return {
    async saveGraph(payload: SavedPayload): Promise<boolean> {
      const url = `${baseURL}/electricity-supply/save`;
      const resp = await resultAs<boolean>(http.post(url, payload));
      return resp;
    },
    async loadGraph(): Promise<SavedPayload> {
      const url = `${baseURL}/electricity-supply/detail`;
      const resp = await resultAs<SavedPayload>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async getNewId(num: number): Promise<number[]> {
      const url = `${baseURL}/electricity-supply/get-new-id?num=${num}`;
      const resp = await resultAs<number[]>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async loadLineGraph(): Promise<SavedPayload> {
      const url = `${baseURL}/lineLoss/supply/detail`;
      const resp = await resultAs<SavedPayload>(http.get(withQuery(url, undefined)));
      return resp;
    },
    async updateLine(): Promise<boolean> {
      const url = `${baseURL}/lineLoss/supply/sync`;
      const resp = await resultAs<boolean>(http.post(url));
      return resp;
    },
    async getLineLossTrend(payload: { lineId: string; timeRange: string }): Promise<LineLossTrend[]> {
      const url = `${baseURL}/lineLoss/supply/trend`;
      const resp = await resultAs<LineLossTrend[]>(http.get(withQuery(url, payload)));
      return resp;
    },
    async getLineLossDevice(payload: { lineId: string }): Promise<LineLossDevice> {
      const url = `${baseURL}/lineLoss/connection/devices`;
      const resp = await resultAs<LineLossDevice>(http.get(withQuery(url, payload)));
      return resp;
    },
    async updateLineLossDevice(payload: { id: string; fromDeviceId?: string; toDeviceId?: string }): Promise<boolean> {
      const url = `${baseURL}/lineLoss/supply/edit`;
      const resp = await resultAs<boolean>(http.post(url, payload));
      return resp;
    },
  };
}

import type { LineLossClient, LineLossDevicePage, LineLossPage, OrUpdateDetail } from "@g2-contract/electrical-safety/line-loss";
function createLineLossClient(http: HttpClient): LineLossClient {
  const baseURL = "/api/securitymanagement";
  return {
    async exportLineLossStatistics(params) {
      const records: import("@g2-contract/electrical-safety/line-loss").LineLossPage[] = [];
      let pageNumber = 1;
      while (true) {
        const page = await resultAs<{ records: typeof records; total: number }>(
          http.get(withQuery(baseURL + "/lineLoss/stat/page", { ...params, pageNumber, pageSize: 200 })),
        );
        records.push(...page.records);
        if (page.records.length === 0 || records.length >= page.total) {
          break;
        }
        pageNumber++;
      }
      const escape = (value: unknown) => {
        const text = String(value ?? "");
        return '"' + (/^[=+@-]/.test(text) ? "'" : "") + text.replaceAll('"', '""') + '"';
      };
      const keys = [
        "lineId",
        "lineName",
        "fromNodeName",
        "toNodeName",
        "fromNodeLocation",
        "toNodeLocation",
        "deviceName",
        "inputEnergy",
        "outputEnergy",
        "lossEnergy",
        "lossRate",
        "collectTime",
      ] as const;
      const header = [
        "线路ID",
        "线路名称",
        "起点",
        "终点",
        "起点位置",
        "终点位置",
        "计量设备",
        "输入电量(kWh)",
        "输出电量(kWh)",
        "设备损耗(kWh)",
        "设备线损率(%)",
        "收集时间",
      ];
      const rows = records.map((record) =>
        keys.map((key) => (key === "lossRate" && record[key] !== "" ? Number(record[key]) * 100 : record[key])),
      );
      return new Blob(["\uFEFF" + [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      });
    },
    async getSecurityDevicePage(params: {
      startTime: string;
      pageSize: number;
      pageNumber: number;
      endTime: string;
      deviceIdSet: string[];
    }): Promise<{ total: number; records: LineLossDevicePage[]; pages: number }> {
      const url = `${baseURL}/lineLoss/read/page`;
      const resp = await resultAs<{ total: number; records: LineLossDevicePage[]; pages: number }>(http.get(withQuery(url, params)));
      return resp;
    },
    async getLineLossPage(params: {
      startTime: string;
      pageSize: number;
      pageNumber: number;
      endTime: string;
      lineName?: string;
    }): Promise<{ total: number; records: LineLossPage[]; pages: number }> {
      const url = `${baseURL}/lineLoss/stat/page`;
      const resp = await resultAs<{ total: number; records: LineLossPage[]; pages: number }>(http.get(withQuery(url, params)));
      return resp;
    },
    async saveOrUpdate(params: { id?: string; periodType: string; days?: string; hourTime?: string }): Promise<boolean> {
      const url = `${baseURL}/lineloss/collectConfig/edit`;
      const resp = await resultAs<boolean>(http.post(url, params));
      return resp;
    },
    async getOrUpdate(): Promise<OrUpdateDetail> {
      const url = `${baseURL}/lineloss/collectConfig/detail`;
      const resp = await resultAs<OrUpdateDetail>(http.get(withQuery(url, undefined)));
      return resp;
    },
  };
}
