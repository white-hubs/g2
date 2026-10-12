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

/** 旧仓 request baseURL `/api` + `/energymanagement` */
const ENERGY_API = "/api/energymanagement";
/** 旧仓报警服务前缀 */
const ALARM_API = "/api/alarm";

export enum chargeTypeE {
  fpg = "FPG",
  jtj = "JTJ",
}

export enum instrumentTypeE {
  WATER = "water_meter",
  ELECTRIC = "electricity_meter",
  GAS = "gas_meter",
}

export type EnergyConsumptionClient = {
  // energyOverview
  EnergyUsagePage: (params?: unknown) => Promise<unknown>;
  AddUsageSetting: (params?: unknown) => Promise<unknown>;
  EditUsageSetting: (params?: unknown) => Promise<unknown>;
  DelUsageSetting: (params?: unknown) => Promise<unknown>;
  Comprehensive: (params?: unknown) => Promise<unknown>;
  EnergyTrend: (params?: unknown) => Promise<unknown>;
  EnergyUnityTrend: (params?: unknown) => Promise<unknown>;
  EnergyProportionStatistics: (params?: unknown) => Promise<unknown>;
  CarbonStatisticsData: (params?: unknown) => Promise<unknown>;
  CarbonClassifyStatisticsData: (params?: unknown) => Promise<unknown>;
  EnergyConsumptionTrend: () => Promise<unknown>;
  EnergyDirection: () => Promise<unknown>;
  PeakValleyPeriods: (params?: unknown) => Promise<unknown>;
  EnergyCollectPeriodItype: (code?: unknown) => Promise<unknown>;
  EnergyCollectConfigList: () => Promise<unknown>;
  ClassifySettingsPage: (params?: unknown) => Promise<unknown>;
  FuelListPage: (params?: unknown) => Promise<unknown>;
  UpdateClassifySettings: (params?: unknown) => Promise<unknown>;
  AreaProjectTree: (params?: unknown) => Promise<unknown>;
  AreaProjectAdd: (params?: unknown) => Promise<unknown>;
  AreaProjectUpdate: (params?: unknown) => Promise<unknown>;
  AreaProjectDelete: (id?: unknown) => Promise<unknown>;
  SubItemPage: (params?: unknown) => Promise<unknown>;
  SubItemTreePage: (params?: unknown) => Promise<unknown>;
  SubItemList: (params?: unknown) => Promise<unknown>;
  DeviceList: (params?: unknown) => Promise<unknown>;
  EnergyProjectAdd: (params?: unknown) => Promise<unknown>;
  EnergyProjectUpdate: (params?: unknown) => Promise<unknown>;
  EnergyProjectDelete: (id?: unknown) => Promise<unknown>;
  EnergyProjectTree: (params?: unknown) => Promise<unknown>;
  SubItemReferDevice: (id?: unknown, params?: unknown) => Promise<unknown>;
  AreaReferDevice: (id?: unknown, params?: unknown) => Promise<unknown>;
  AreaReferDeviceById: (id?: unknown) => Promise<unknown>;
  SubItemReferDeviceById: (id?: unknown) => Promise<unknown>;
  deviceReadUpdate: (id?: unknown) => Promise<unknown>;
  TableRecordUpdate: (params?: unknown) => Promise<unknown>;
  ReadRecordPage: (params?: unknown) => Promise<unknown>;
  ReadRecordUpdate: (params?: unknown) => Promise<unknown>;
  ReadRecordDelete: (dateRangeList?: unknown) => Promise<unknown>;
  deviceDetail: (id?: unknown) => Promise<unknown>;
  meterDeviceBatchUpdate: (ids?: unknown) => Promise<unknown>;
  classifyEnergyPage: (params?: unknown) => Promise<unknown>;
  subItemEnergyPage: (params?: unknown) => Promise<unknown>;
  classifyExport: (data?: unknown) => Promise<unknown>;
  readLogExport: (params?: unknown) => Promise<unknown>;
  readRecordTemplateExport: (data?: unknown) => Promise<unknown>;
  readRecordImport: (data?: unknown) => Promise<unknown>;
  subItemExport: (data?: unknown) => Promise<unknown>;
  templateExport: () => Promise<unknown>;
  classifyimport: (data?: unknown) => Promise<unknown>;
  EnergySituation: (params?: unknown) => Promise<unknown>;
  UsageTrend: (params?: unknown) => Promise<unknown>;
  UsageSubItemTrend: (params?: unknown) => Promise<unknown>;
  UsageSubItemProperty: (params?: unknown) => Promise<unknown>;
  EnergyFlowDirection: (params?: unknown) => Promise<unknown>;
  SearchDevice: () => Promise<unknown>;
  getMeterDeviceList: (params?: unknown) => Promise<unknown>;
  getDeviceUseTrend: (params?: unknown) => Promise<unknown>;
  getDeviceUseRanking: (params?: unknown) => Promise<unknown>;
  // feeManage
  saveChargeConfig: (params?: unknown) => Promise<unknown>;
  getChargeConfig: (params?: unknown) => Promise<unknown>;
  getAreaTree: (params?: unknown) => Promise<unknown>;
  getChargeAreaQoq: (params?: unknown) => Promise<unknown>;
  getChargeTrend: (params?: unknown) => Promise<unknown>;
  getChargeTrend1: (params?: unknown) => Promise<unknown>;
  getChargeArea: (params?: unknown) => Promise<unknown>;
  areaExcel: (data?: unknown) => Promise<unknown>;
  getChargeAreaTotal: (params?: unknown) => Promise<unknown>;
  getTypeAmount: (params?: unknown) => Promise<unknown>;
  getTrendByfpg: (params?: unknown) => Promise<unknown>;
  getFpgAmoutQoq: (params?: unknown) => Promise<unknown>;
  getAmountWithRatio: (params?: unknown) => Promise<unknown>;
  getEnergyChargeRules: (params?: unknown) => Promise<unknown>;
  deleteEnergyChargeRules: (params?: unknown) => Promise<unknown>;
  addEnergyChargeRules: (params?: unknown) => Promise<unknown>;
  editEnergyChargeRules: (params?: unknown) => Promise<unknown>;
  getEnergyReportTotal: (params?: unknown) => Promise<unknown>;
  getEnergyReportElectricity: (params?: unknown) => Promise<unknown>;
  getEnergyReportOther: (params?: unknown) => Promise<unknown>;
  exportReportTotal: (params?: unknown) => Promise<unknown>;
  exportReportElectric: (params?: unknown) => Promise<unknown>;
  exportReportOther: (params?: unknown) => Promise<unknown>;
  getComprehensiveRatioCost: (params?: unknown) => Promise<unknown>;
  getReportChargeTrend: (params?: unknown) => Promise<unknown>;
  getReportPieChart: (params?: unknown) => Promise<unknown>;
  getChargeBathTrend: (params?: unknown) => Promise<unknown>;
  // dosageAnalysis
  GetDetails: (data?: unknown) => Promise<unknown>;
  EetailsExcel: (data?: unknown) => Promise<unknown>;
  EnergyAnalysis: (data?: unknown) => Promise<unknown>;
  EnergyAnalysisg: (data?: unknown) => Promise<unknown>;
  EnergyRanking: (data?: unknown) => Promise<unknown>;
  DosageAnalysis: (data?: unknown) => Promise<unknown>;
  MeterArea: () => Promise<unknown>;
  RouteTree: (routeName?: unknown, instrumentType?: unknown) => Promise<unknown>;
  AreaTree: (areaName?: unknown, instrumentType?: unknown) => Promise<unknown>;
  Distribution: (deviceid?: unknown) => Promise<unknown>;
  iotDistribution: () => Promise<unknown>;
  // loadPrediction
  getOccupancy: () => Promise<unknown>;
  EnergyGateList: () => Promise<unknown>;
  EnergyGate: (id?: unknown, data?: unknown) => Promise<unknown>;
  LoadforecastionTrand: (data?: unknown) => Promise<unknown>;
  LoadforecastionExport: (data?: unknown) => Promise<unknown>;
  // energyStatistics
  CarboEmissionStatistics: () => Promise<unknown>;
  CarboEmissionTrends: (params?: unknown) => Promise<unknown>;
  ProportionOfCarbonEmissions: (params?: unknown) => Promise<unknown>;
  EnergyArea: (data?: unknown) => Promise<unknown>;
  // device
  deviceList: (params?: unknown) => Promise<unknown>;
  devices: () => Promise<unknown>;
  deleteDevices: (id?: unknown) => Promise<unknown>;
  batchDelete: (params?: unknown) => Promise<unknown>;
  meterAdd: (data?: unknown) => Promise<unknown>;
  TableRecordPage: (params?: unknown) => Promise<unknown>;
  setParentDevice: (params?: unknown) => Promise<unknown>;
  getParentList: (deviceId?: unknown, instrumentType?: unknown) => Promise<unknown>;
  getTopologyDiagram: (params?: unknown) => Promise<unknown>;
  // cycle
  putCycle: (data?: unknown) => Promise<unknown>;
  setCycle: (data?: unknown) => Promise<unknown>;
  metterReade: () => Promise<unknown>;
  cycleList: () => Promise<unknown>;
  // access
  meterType: () => Promise<unknown>;
  getproject: (id?: unknown) => Promise<unknown>;
  deleteproject: (id?: unknown) => Promise<unknown>;
  getDviceAreaArr: (type?: unknown) => Promise<unknown>;
  projectgape: (params?: unknown) => Promise<unknown>;
  addproject: (params?: unknown) => Promise<unknown>;
  putproject: (params?: unknown, id?: unknown) => Promise<unknown>;
  areaList: () => Promise<unknown>;
  // record（旧 record.deviceDetail 与 energyOverview.deviceDetail 同名冲突，保留 overview 的 detail 路径）
  getAreaList: (params?: unknown) => Promise<unknown>;
  metterDevice: (params?: unknown) => Promise<unknown>;
  meterReading: (params?: unknown) => Promise<unknown>;
  meterStatistics: (params?: unknown) => Promise<unknown>;
  totalUsage: (params?: unknown) => Promise<unknown>;
  energyUsage: (params?: unknown) => Promise<unknown>;
  // alarm
  alarmStatisticsStatusGroup: (params?: unknown) => Promise<unknown>;
  alarmStatisticsLevel: (params?: unknown) => Promise<unknown>;
  alarmRecords: (params?: unknown) => Promise<unknown>;
};

export function createEnergyConsumptionClient(http: HttpClient): EnergyConsumptionClient {
  return {
    // ——— energyOverview ———
    EnergyUsagePage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/yearEnergy/page`, { ...(params as Record<string, unknown>) })),
    AddUsageSetting: async (params?: unknown) => http.post(`${ENERGY_API}/yearEnergy/add`, params),
    EditUsageSetting: async (params?: unknown) => http.put(`${ENERGY_API}/yearEnergy/edit`, params),
    DelUsageSetting: async (params?: unknown) =>
      http.delete(withQuery(`${ENERGY_API}/yearEnergy/remove`, { ...(params as Record<string, unknown>) })),
    Comprehensive: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/stat/category/all`, { ...(params as Record<string, unknown>) })),
    EnergyTrend: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-summary/trend`, { ...(params as Record<string, unknown>) })),
    EnergyUnityTrend: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/dc/stat/trend`, { ...(params as Record<string, unknown>) })),
    EnergyProportionStatistics: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/project/stat/category`, { ...(params as Record<string, unknown>) })),
    CarbonStatisticsData: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/stat/carbon/dmy`, { ...(params as Record<string, unknown>) })),
    CarbonClassifyStatisticsData: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/dc/stat/time/category`, { ...(params as Record<string, unknown>) })),
    EnergyConsumptionTrend: async () => http.get(`${ENERGY_API}/energy-consumption-trend`),
    EnergyDirection: async () => http.get(`${ENERGY_API}/energy-direction`),
    PeakValleyPeriods: async (params?: unknown) => http.post(`${ENERGY_API}/energy-collect-period/batch`, params),
    EnergyCollectPeriodItype: async (code?: unknown) => http.get(`${ENERGY_API}/energy-collect-period/itype/${code}`),
    EnergyCollectConfigList: async () => http.get(`${ENERGY_API}/energy-collect-config/list`),
    ClassifySettingsPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-collect-config/page`, { ...(params as Record<string, unknown>) })),
    FuelListPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/fuel/select/list`, { ...(params as Record<string, unknown>) })),
    UpdateClassifySettings: async (params?: unknown) => {
      const p = params as { id?: string };
      return http.put(`${ENERGY_API}/energy-collect-config/${p?.id}`, params);
    },
    AreaProjectTree: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/area-project/tree`, { ...(params as Record<string, unknown>) })),
    AreaProjectAdd: async (params?: unknown) => http.post(`${ENERGY_API}/area-project`, params),
    AreaProjectUpdate: async (params?: unknown) => {
      const p = params as { id?: string };
      return http.put(`${ENERGY_API}/area-project/${p?.id}`, params);
    },
    AreaProjectDelete: async (id?: unknown) => http.delete(`${ENERGY_API}/area-project/${id}`),
    SubItemPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-project/page`, { ...(params as Record<string, unknown>) })),
    SubItemTreePage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-project/tree/special`, { ...(params as Record<string, unknown>) })),
    SubItemList: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-project/list`, { ...(params as Record<string, unknown>) })),
    DeviceList: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device/page`, { ...(params as Record<string, unknown>) })),
    EnergyProjectAdd: async (params?: unknown) => http.post(`${ENERGY_API}/energy-project`, params),
    EnergyProjectUpdate: async (params?: unknown) => {
      const p = params as { id?: string };
      return http.put(`${ENERGY_API}/energy-project/${p?.id}`, params);
    },
    EnergyProjectDelete: async (id?: unknown) => http.delete(`${ENERGY_API}/energy-project/${id}`),
    EnergyProjectTree: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-project/tree`, { ...(params as Record<string, unknown>) })),
    SubItemReferDevice: async (id?: unknown, params?: unknown) => http.post(`${ENERGY_API}/energy-project/${id}/refer/device`, params),
    AreaReferDevice: async (id?: unknown, params?: unknown) => http.post(`${ENERGY_API}/area-project/${id}/refer/device`, params),
    AreaReferDeviceById: async (id?: unknown) => http.get(`${ENERGY_API}/area-project/${id}/refer/device`),
    SubItemReferDeviceById: async (id?: unknown) => http.get(`${ENERGY_API}/energy-project/${id}/refer/device`),
    deviceReadUpdate: async (id?: unknown) => http.get(`${ENERGY_API}/meter-device/${id}/update/prop/value`),
    TableRecordUpdate: async (params?: unknown) => http.post(`${ENERGY_API}/meter-device-change-log`, params),
    ReadRecordPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-read-log/page`, { ...(params as Record<string, unknown>) })),
    ReadRecordUpdate: async (params?: unknown) => http.post(`${ENERGY_API}/meter-read-log`, params),
    ReadRecordDelete: async (dateRangeList?: unknown) => http.post(`${ENERGY_API}/meter-read-log/remove-batch`, { dateRangeList }),
    deviceDetail: async (id?: unknown) => http.get(`${ENERGY_API}/meter-device/detail/${id}`),
    meterDeviceBatchUpdate: async (ids?: unknown) =>
      http.put(withQuery(`${ENERGY_API}/meter-device/update/prop/value/batch/`, { ids }), {}),
    classifyEnergyPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/category`, { ...(params as Record<string, unknown>) })),
    subItemEnergyPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/project`, { ...(params as Record<string, unknown>) })),
    classifyExport: async (data?: unknown) => http.post(`${ENERGY_API}/energy-daily-usage/export`, data),
    readLogExport: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-read-log/export`, { ...(params as Record<string, unknown>) })),
    readRecordTemplateExport: async (data?: unknown) => http.post(`${ENERGY_API}/meter-read-log/download-template`, data),
    readRecordImport: async (data?: unknown) => http.post(`${ENERGY_API}/meter-read-log/import-excel`, data),
    subItemExport: async (data?: unknown) => http.post(`${ENERGY_API}/energy-daily-usage/project/export`, data),
    templateExport: async () => http.post(`${ENERGY_API}/energy-daily-usage/template`),
    classifyimport: async (data?: unknown) => http.post(`${ENERGY_API}/energy-daily-usage/import`, data),
    EnergySituation: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/stat/dmy`, { ...(params as Record<string, unknown>) })),
    UsageTrend: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/project/stat/trend`, { ...(params as Record<string, unknown>) })),
    UsageSubItemTrend: async (params?: unknown) =>
      http.get(
        withQuery(`${ENERGY_API}/energy-daily-usage/project/stat/time/category`, {
          ...(params as Record<string, unknown>),
        }),
      ),
    UsageSubItemProperty: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage/project/stat/category`, { ...(params as Record<string, unknown>) })),
    EnergyFlowDirection: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-usage-project/area/stat/flow`, { ...(params as Record<string, unknown>) })),
    SearchDevice: async () => http.get(`${ENERGY_API}/meter-device/all/deviceId`),
    getMeterDeviceList: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device/drop-down/list`, { ...(params as Record<string, unknown>) })),
    getDeviceUseTrend: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/device-use-trend`, { ...(params as Record<string, unknown>) })),
    getDeviceUseRanking: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/device-use-ranking`, { ...(params as Record<string, unknown>) })),

    // ——— feeManage ———
    saveChargeConfig: async (params?: unknown) => http.post(`${ENERGY_API}/energy-charge-config`, params),
    getChargeConfig: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-charge-config`, { ...(params as Record<string, unknown>) })),
    getAreaTree: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/area-project/tree`, { ...(params as Record<string, unknown>) })),
    getChargeAreaQoq: async (params?: unknown) => http.post(`${ENERGY_API}/area-comprehensive-expenses`, params),
    getChargeTrend: async (params?: unknown) => http.post(`${ENERGY_API}/area-comprehensive-trend`, params),
    getChargeTrend1: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-charge/trend`, { ...(params as Record<string, unknown>) })),
    getChargeArea: async (params?: unknown) => http.post(`${ENERGY_API}/area-comprehensive-detail`, params),
    areaExcel: async (data?: unknown) => http.post(`${ENERGY_API}/area-comprehensive-detail/excel`, data),
    getChargeAreaTotal: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/area-comprehensive-trend`, { ...(params as Record<string, unknown>) })),
    getTypeAmount: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-charge/type/amount`, { ...(params as Record<string, unknown>) })),
    getTrendByfpg: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/comprehensive-expenses-trend`, { ...(params as Record<string, unknown>) })),
    getFpgAmoutQoq: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-charge/fpgAmout/qoq`, { ...(params as Record<string, unknown>) })),
    getAmountWithRatio: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/comprehensive-expenses`, { ...(params as Record<string, unknown>) })),
    getEnergyChargeRules: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-charge-rules/page`, { ...(params as Record<string, unknown>) })),
    deleteEnergyChargeRules: async (params?: unknown) =>
      http.delete(withQuery(`${ENERGY_API}/energy-charge-rules/remove`, { ...(params as Record<string, unknown>) })),
    addEnergyChargeRules: async (params?: unknown) => http.post(`${ENERGY_API}/energy-charge-rules/add`, params),
    editEnergyChargeRules: async (params?: unknown) => http.post(`${ENERGY_API}/energy-charge-rules/edit`, params),
    getEnergyReportTotal: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/total/page`, { ...(params as Record<string, unknown>) })),
    getEnergyReportElectricity: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/electricity/page`, { ...(params as Record<string, unknown>) })),
    getEnergyReportOther: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/typeOther/page`, { ...(params as Record<string, unknown>) })),
    exportReportTotal: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/total/import`, { ...(params as Record<string, unknown>) })),
    exportReportElectric: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/electricity/import`, { ...(params as Record<string, unknown>) })),
    exportReportOther: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/typeOther/import`, { ...(params as Record<string, unknown>) })),
    getComprehensiveRatioCost: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/comprehensiveRatioCost`, { ...(params as Record<string, unknown>) })),
    getReportChargeTrend: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/chargeTrend`, { ...(params as Record<string, unknown>) })),
    getReportPieChart: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/pieChart`, { ...(params as Record<string, unknown>) })),
    getChargeBathTrend: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy/report/chargeBathTrend`, { ...(params as Record<string, unknown>) })),

    // ——— dosageAnalysis ———
    GetDetails: async (data?: unknown) => http.post(`${ENERGY_API}/energy-consumption-details`, data),
    EetailsExcel: async (data?: unknown) => http.post(`${ENERGY_API}/energy-consumption-details/excel`, data),
    EnergyAnalysis: async (data?: unknown) => http.post(`${ENERGY_API}/energy-analysis`, data),
    EnergyAnalysisg: async (data?: unknown) => http.post(`${ENERGY_API}/energy-analysis-distribution`, data),
    EnergyRanking: async (data?: unknown) => http.post(`${ENERGY_API}/energy-consumption-ranking`, data),
    DosageAnalysis: async (data?: unknown) => http.post(`${ENERGY_API}/dosage-analysis/`, data),
    MeterArea: async () => http.get(`${ENERGY_API}/enumType/getInstumenttype/`),
    RouteTree: async (routeName?: unknown, instrumentType?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/route-project/tree`, { routeName, instrumentType })),
    AreaTree: async (areaName?: unknown, instrumentType?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/area-project/tree`, { areaName, instrumentType })),
    Distribution: async (deviceid?: unknown) => http.get(`${ENERGY_API}/distribution-statistics/${deviceid}`),
    iotDistribution: async () => http.get(`${ENERGY_API}/iot-distributions`),

    // ——— loadPrediction ———
    getOccupancy: async () => http.get(`${ENERGY_API}/occupancy-rate`),
    EnergyGateList: async () => http.get(`${ENERGY_API}/energy-gate/list`),
    EnergyGate: async (id?: unknown, data?: unknown) => http.put(`${ENERGY_API}/energy-gate/${id}`, data),
    LoadforecastionTrand: async (data?: unknown) => http.post(`${ENERGY_API}/load-forecasting/trend`, data),
    // 旧代码拼接出错误路径；对齐 trend 族修正为 /load-forecasting/export
    LoadforecastionExport: async (data?: unknown) => http.post(`${ENERGY_API}/load-forecasting/export`, data),

    // ——— energyStatistics ———
    CarboEmissionStatistics: async () => http.get(`${ENERGY_API}/carbon-emission-statistics`),
    CarboEmissionTrends: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-daily-summary/trend`, { ...(params as Record<string, unknown>) })),
    ProportionOfCarbonEmissions: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/proportion-of-carbon-emissions-items/`, { ...(params as Record<string, unknown>) })),
    EnergyArea: async (data?: unknown) => http.post(`${ENERGY_API}/energy-area`, data),

    // ——— device ———
    deviceList: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device/page`, { ...(params as Record<string, unknown>) })),
    devices: async () => http.get(`${ENERGY_API}/meter-device/devices`),
    deleteDevices: async (id?: unknown) => http.delete(`${ENERGY_API}/meter-device/${id}`),
    batchDelete: async (params?: unknown) => http.post(`${ENERGY_API}/meter-device/batchdelete`, params),
    meterAdd: async (data?: unknown) => http.post(`${ENERGY_API}/meter-device/batchAdd`, data),
    TableRecordPage: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device-change-log/page`, { ...(params as Record<string, unknown>) })),
    setParentDevice: async (params?: unknown) => {
      const p = params as { id?: string; parentId?: string };
      return http.put(`${ENERGY_API}/meter-device/config/superiorInstrument/${p?.id}/${p?.parentId}`, {});
    },
    getParentList: async (deviceId?: unknown, instrumentType?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device/getNotChildren`, { deviceId, instrumentType })),
    getTopologyDiagram: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device/getTree`, { ...(params as Record<string, unknown>) })),

    // ——— cycle ———
    putCycle: async (data?: unknown) => {
      const d = data as { id?: string } | string;
      const id = typeof d === "object" && d?.id ? d.id : d;
      return http.put(`${ENERGY_API}/meter-reade-cycle/${id}`, typeof d === "object" ? d : {});
    },
    setCycle: async (data?: unknown) => http.post(`${ENERGY_API}/meter-reade-cycle/task`, data),
    metterReade: async () => http.get(`${ENERGY_API}/meter-reade-cycle/one`),
    cycleList: async () => http.get(`${ENERGY_API}/enumType/getReadingCycleRuleName`),

    // ——— access ———
    meterType: async () => http.get(`${ENERGY_API}/enumType/getInstumenttype`),
    getproject: async (id?: unknown) => http.get(`${ENERGY_API}/energy-project/${id}`),
    deleteproject: async (id?: unknown) => http.delete(`${ENERGY_API}/energy-project/${id}`),
    getDviceAreaArr: async (type?: unknown) => http.get(`${ENERGY_API}/meter-device/device-area/${type}`),
    projectgape: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/energy-project/page`, { ...(params as Record<string, unknown>) })),
    addproject: async (params?: unknown) => http.post(`${ENERGY_API}/energy-project`, params),
    putproject: async (params?: unknown, id?: unknown) => http.put(`${ENERGY_API}/energy-project/${id}`, params),
    areaList: async () => http.get(`${ENERGY_API}/area-list`),

    // ——— record ———
    getAreaList: async (params?: unknown) => http.get(withQuery(`${ENERGY_API}/area-list`, { ...(params as Record<string, unknown>) })),
    metterDevice: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/meter-device/getReadeList`, { ...(params as Record<string, unknown>) })),
    meterReading: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/manual-meter-reading`, { ...(params as Record<string, unknown>) })),
    meterStatistics: async (params?: unknown) =>
      http.get(withQuery(`${ENERGY_API}/quantity-meter-statistics`, { ...(params as Record<string, unknown>) })),
    totalUsage: async (params?: unknown) => http.get(withQuery(`${ENERGY_API}/total-usage`, { ...(params as Record<string, unknown>) })),
    energyUsage: async (params?: unknown) => http.get(withQuery(`${ENERGY_API}/energy-usage`, { ...(params as Record<string, unknown>) })),

    // ——— alarm ———
    alarmStatisticsStatusGroup: async (params?: unknown) =>
      http.get(withQuery(`${ALARM_API}/alarm-statistics/status-group`, { ...(params as Record<string, unknown>) })),
    alarmStatisticsLevel: async (params?: unknown) =>
      http.get(withQuery(`${ALARM_API}/alarm-statistics/level`, { ...(params as Record<string, unknown>) })),
    alarmRecords: async (params?: unknown) => http.get(withQuery(`${ALARM_API}/alarm-records`, { ...(params as Record<string, unknown>) })),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<EnergyConsumptionClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createEnergyConsumptionClient(httpModule.createHttpClientForPlatform(ctx));
}
