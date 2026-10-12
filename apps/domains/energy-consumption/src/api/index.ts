import { asLegacyResult } from "./unwrap";
/**
 * 域内 API 薄封装：方法名与旧仓 `@/api/*` 对齐，返回 `{ data }` 兼容旧解构。
 */
import { getEnergyConsumptionClient } from "@/domain-context";

function bind(method: string) {
  return async (...args: unknown[]) => {
    const client = getEnergyConsumptionClient() as Record<string, (...a: unknown[]) => Promise<unknown>>;
    const fn = client[method];
    if (typeof fn !== "function") {
      throw new Error(`energy-consumption client missing method: ${method}`);
    }
    return asLegacyResult(await fn(...args));
  };
}

// —— energyOverview ——
export const EnergyUsagePage = bind("EnergyUsagePage");
export const AddUsageSetting = bind("AddUsageSetting");
export const EditUsageSetting = bind("EditUsageSetting");
export const DelUsageSetting = bind("DelUsageSetting");
export const Comprehensive = bind("Comprehensive");
export const EnergyTrend = bind("EnergyTrend");
export const EnergyUnityTrend = bind("EnergyUnityTrend");
export const EnergyProportionStatistics = bind("EnergyProportionStatistics");
export const CarbonStatisticsData = bind("CarbonStatisticsData");
export const CarbonClassifyStatisticsData = bind("CarbonClassifyStatisticsData");
export const EnergyConsumptionTrend = bind("EnergyConsumptionTrend");
export const EnergyDirection = bind("EnergyDirection");
export const PeakValleyPeriods = bind("PeakValleyPeriods");
export const EnergyCollectPeriodItype = bind("EnergyCollectPeriodItype");
export const EnergyCollectConfigList = bind("EnergyCollectConfigList");
export const ClassifySettingsPage = bind("ClassifySettingsPage");
export const FuelListPage = bind("FuelListPage");
export const UpdateClassifySettings = bind("UpdateClassifySettings");
export const AreaProjectTree = bind("AreaProjectTree");
export const AreaProjectAdd = bind("AreaProjectAdd");
export const AreaProjectUpdate = bind("AreaProjectUpdate");
export const AreaProjectDelete = bind("AreaProjectDelete");
export const SubItemPage = bind("SubItemPage");
export const SubItemTreePage = bind("SubItemTreePage");
export const SubItemList = bind("SubItemList");
export const DeviceList = bind("DeviceList");
export const EnergyProjectAdd = bind("EnergyProjectAdd");
export const EnergyProjectUpdate = bind("EnergyProjectUpdate");
export const EnergyProjectDelete = bind("EnergyProjectDelete");
export const EnergyProjectTree = bind("EnergyProjectTree");
export const SubItemReferDevice = bind("SubItemReferDevice");
export const AreaReferDevice = bind("AreaReferDevice");
export const AreaReferDeviceById = bind("AreaReferDeviceById");
export const SubItemReferDeviceById = bind("SubItemReferDeviceById");
export const deviceReadUpdate = bind("deviceReadUpdate");
export const TableRecordUpdate = bind("TableRecordUpdate");
export const ReadRecordPage = bind("ReadRecordPage");
export const ReadRecordUpdate = bind("ReadRecordUpdate");
export const ReadRecordDelete = bind("ReadRecordDelete");
export const deviceDetail = bind("deviceDetail");
export const meterDeviceBatchUpdate = bind("meterDeviceBatchUpdate");
export const classifyEnergyPage = bind("classifyEnergyPage");
export const subItemEnergyPage = bind("subItemEnergyPage");
export const classifyExport = bind("classifyExport");
export const readLogExport = bind("readLogExport");
export const readRecordTemplateExport = bind("readRecordTemplateExport");
export const readRecordImport = bind("readRecordImport");
export const subItemExport = bind("subItemExport");
export const templateExport = bind("templateExport");
export const classifyimport = bind("classifyimport");
export const EnergySituation = bind("EnergySituation");
export const UsageTrend = bind("UsageTrend");
export const UsageSubItemTrend = bind("UsageSubItemTrend");
export const UsageSubItemProperty = bind("UsageSubItemProperty");
export const EnergyFlowDirection = bind("EnergyFlowDirection");
export const SearchDevice = bind("SearchDevice");
export const getMeterDeviceList = bind("getMeterDeviceList");
export const getDeviceUseTrend = bind("getDeviceUseTrend");
export const getDeviceUseRanking = bind("getDeviceUseRanking");

// —— feeManage ——
export const saveChargeConfig = bind("saveChargeConfig");
export const getChargeConfig = bind("getChargeConfig");
export const getAreaTree = bind("getAreaTree");
export const getChargeAreaQoq = bind("getChargeAreaQoq");
export const getChargeTrend = bind("getChargeTrend");
export const getChargeTrend1 = bind("getChargeTrend1");
export const getChargeArea = bind("getChargeArea");
export const areaExcel = bind("areaExcel");
export const getChargeAreaTotal = bind("getChargeAreaTotal");
export const getTypeAmount = bind("getTypeAmount");
export const getTrendByfpg = bind("getTrendByfpg");
export const getFpgAmoutQoq = bind("getFpgAmoutQoq");
export const getAmountWithRatio = bind("getAmountWithRatio");
export const getEnergyChargeRules = bind("getEnergyChargeRules");
export const deleteEnergyChargeRules = bind("deleteEnergyChargeRules");
export const addEnergyChargeRules = bind("addEnergyChargeRules");
export const editEnergyChargeRules = bind("editEnergyChargeRules");
export const getEnergyReportTotal = bind("getEnergyReportTotal");
export const getEnergyReportElectricity = bind("getEnergyReportElectricity");
export const getEnergyReportOther = bind("getEnergyReportOther");
export const exportReportTotal = bind("exportReportTotal");
export const exportReportElectric = bind("exportReportElectric");
export const exportReportOther = bind("exportReportOther");
export const getComprehensiveRatioCost = bind("getComprehensiveRatioCost");
export const getReportChargeTrend = bind("getReportChargeTrend");
export const getReportPieChart = bind("getReportPieChart");
export const getChargeBathTrend = bind("getChargeBathTrend");
export { chargeTypeE, instrumentTypeE } from "@g2-client/energy-consumption/client";

// —— dosageAnalysis ——
export const GetDetails = bind("GetDetails");
export const EetailsExcel = bind("EetailsExcel");
export const EnergyAnalysis = bind("EnergyAnalysis");
export const EnergyAnalysisg = bind("EnergyAnalysisg");
export const EnergyRanking = bind("EnergyRanking");
export const DosageAnalysis = bind("DosageAnalysis");
export const MeterArea = bind("MeterArea");
export const RouteTree = bind("RouteTree");
export const AreaTree = bind("AreaTree");
export const Distribution = bind("Distribution");
export const iotDistribution = bind("iotDistribution");

// —— loadPrediction ——
export const getOccupancy = bind("getOccupancy");
export const EnergyGateList = bind("EnergyGateList");
export const EnergyGate = bind("EnergyGate");
export const LoadforecastionTrand = bind("LoadforecastionTrand");
export const LoadforecastionExport = bind("LoadforecastionExport");

// —— energyStatistics ——
export const CarboEmissionStatistics = bind("CarboEmissionStatistics");
export const CarboEmissionTrends = bind("CarboEmissionTrends");
export const ProportionOfCarbonEmissions = bind("ProportionOfCarbonEmissions");
export const EnergyArea = bind("EnergyArea");

// —— device ——
export const deviceList = bind("deviceList");
export const devices = bind("devices");
export const deleteDevices = bind("deleteDevices");
export const batchDelete = bind("batchDelete");
export const meterAdd = bind("meterAdd");
export const TableRecordPage = bind("TableRecordPage");
export const setParentDevice = bind("setParentDevice");
export const getParentList = bind("getParentList");
export const getTopologyDiagram = bind("getTopologyDiagram");

// —— cycle ——
export const putCycle = bind("putCycle");
export const setCycle = bind("setCycle");
export const metterReade = bind("metterReade");
export const cycleList = bind("cycleList");

// —— access ——
export const meterType = bind("meterType");
export const getproject = bind("getproject");
export const deleteproject = bind("deleteproject");
export const getDviceAreaArr = bind("getDviceAreaArr");
export const projectgape = bind("projectgape");
export const addproject = bind("addproject");
export const putproject = bind("putproject");
export const areaList = bind("areaList");

// —— record ——
export const getAreaList = bind("getAreaList");
export const metterDevice = bind("metterDevice");
export const meterReading = bind("meterReading");
export const meterStatistics = bind("meterStatistics");
export const totalUsage = bind("totalUsage");
export const energyUsage = bind("energyUsage");

// —— alarm ——
export const alarmStatisticsStatusGroup = bind("alarmStatisticsStatusGroup");
export const alarmStatisticsLevel = bind("alarmStatisticsLevel");
export const alarmRecords = bind("alarmRecords");
