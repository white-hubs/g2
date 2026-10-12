export interface DeviceBaseDetailsDTO {
  id: string;
  deviceName: string;
  deviceCode: string;
  productCategoryName?: string;
  productCategoryCode?: string;
  lntAndLat?: string;
  locationDes?: string;
  deviceIotProdId?: string;
  departmentId?: string;
  departmentName?: string;
  areaId?: string;
  areaName?: string;
  areaLastId?: string;
  deviceState?: boolean;
  deviceStateCode?: number;
  communicationTime?: string;
  managerIds?: string;
  managerNames?: string;
  thirdPartyId?: string;
  thirdpartyCfg?: string;
  tenant?: string;
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
}

export type ColdStoreDevice = DeviceBaseDetailsDTO;

export type ColdStoreCamera = DeviceBaseDetailsDTO;

export interface ColdStore {
  id: string;
  code: string;
  name: string;
  type: string;
  area: string;
  designTemp: string;
  method: string;
  mainDevice: DeviceBaseDetailsDTO;
  insulation: string;
  /** 冷库关联建筑区域 ID。 */
  building?: string;
  location?: string;
  builtTime?: string;
  responsibleId?: string;
  responsibleName?: string;
  riskLevel?: string;
  complianceScore?: number;
  aiEvaluation?: string;
  devices: DeviceBaseDetailsDTO[];
  cameras: DeviceBaseDetailsDTO[];
}

export interface ColdStoreMonitorExceptionStatistics {
  ammoniaExceptionCount?: number;
  refrigerationExceptionCount?: number;
  doorExceptionCount?: number;
  temperatureHumidityExceptionCount?: number;
  onlineStoreCount?: number;
  totalStoreCount?: number;
}

export interface ColdStoreMonitorMetric {
  code?: string;
  name?: string;
  value?: string;
  unit?: string;
  productCode?: string;
  propertyCode?: string;
  abnormal?: boolean;
}

export interface ColdStoreMonitorCard {
  id: string;
  code?: string;
  name?: string;
  areaName?: string;
  status?: string;
  statusName?: string;
  warningText?: string;
  onlineDeviceCount?: number;
  metrics: ColdStoreMonitorMetric[];
}

export interface ColdStoreMonitorTrendPoint {
  ts?: number;
  value?: string;
}

export interface ColdStoreMonitorTrend {
  code?: string;
  name?: string;
  unit?: string;
  productCode?: string;
  propertyCode?: string;
  points: ColdStoreMonitorTrendPoint[];
}

export interface ColdStoreMonitorDevice {
  deviceId?: string;
  deviceCode?: string;
  deviceName?: string;
  productCode?: string;
  productName?: string;
  value?: string;
  unit?: string;
  online?: boolean;
}

export interface ColdStoreMonitorDeviceGroup {
  productCode?: string;
  productName?: string;
  count?: number;
  devices: ColdStoreMonitorDevice[];
}

export interface ColdStoreMonitorCamera {
  id?: string | number;
  deviceId?: string | number;
  deviceCode?: string;
  deviceName?: string;
  locationDes?: string;
  areaName?: string;
  deviceState?: boolean;
  code?: string;
  name?: string;
  location?: string;
  online?: boolean;
}

export interface ColdStoreMonitorCardDetail extends ColdStoreMonitorCard {
  mainDeviceId?: string;
  trends: ColdStoreMonitorTrend[];
  deviceGroups: ColdStoreMonitorDeviceGroup[];
  cameras: ColdStoreMonitorCamera[];
}

export interface ColdStoreInsideDoorStatus {
  storeId: string;
  storeName?: string;
  doorStatus?: string;
  openedDuration?: string;
  aiBehavior?: string;
  temperatureChange?: string;
  relatedAlarm?: string;
}

export interface ColdStoreInsideDoorBasicInfo {
  storeId: string;
  storeName?: string;
  doorStatus?: string;
  doorStatusName?: string;
  setTemperature?: string;
  currentTemperature?: string;
  openedDuration?: string;
  todayOpenCount?: number;
  latestNormalClose?: string;
  aiBehavior?: string;
  cameraName?: string;
  lastMaintenanceDate?: string;
}

export interface ColdStoreInsideDoorEvent {
  ts?: number;
  eventTime?: string;
  eventType?: string;
  eventTypeName?: string;
  description?: string;
}

export interface ColdStoreInsideDoorDetail {
  basicInfo?: ColdStoreInsideDoorBasicInfo;
  temperatureTrends: ColdStoreMonitorTrendPoint[];
  doorEvents: ColdStoreInsideDoorEvent[];
}

export interface ColdStoreInsideTemperatureAnalysisCard {
  storeId: string;
  storeName?: string;
  averageTemperature?: string;
}

export interface ColdStoreInsideTemperaturePointValue {
  code?: string;
  name?: string;
  temperature?: string;
  deviation?: string;
}

export interface ColdStoreInsideTemperatureMonitorRow {
  storeId: string;
  storeName?: string;
  setTemperature?: string;
  currentAverageTemperature?: string;
  points: ColdStoreInsideTemperaturePointValue[];
  maxDeviation?: string;
  aiJudgement?: string;
}

export interface ColdStoreInsideTemperaturePointTrend {
  code?: string;
  name?: string;
  points: ColdStoreMonitorTrendPoint[];
}

export interface ColdStoreInsideTemperatureTrendChart {
  storeId: string;
  storeName?: string;
  setTemperature?: string;
  pointTrends: ColdStoreInsideTemperaturePointTrend[];
}

export interface ColdStoreInsideTemperatureAbnormalRecord {
  time?: string;
  storeId?: string;
  storeName?: string;
  pointName?: string;
  abnormalType?: string;
  actualTemperature?: string;
  deviation?: string;
  duration?: string;
  aiReason?: string;
}

export interface ColdStoreInsideTemperatureOverview {
  analysisCards: ColdStoreInsideTemperatureAnalysisCard[];
  monitorRows: ColdStoreInsideTemperatureMonitorRow[];
  trendCharts: ColdStoreInsideTemperatureTrendChart[];
  abnormalRecords: ColdStoreInsideTemperatureAbnormalRecord[];
}

export interface ColdStoreRefrigerationUnitHealthRank {
  unitCode: string;
  rank?: number;
  unitName?: string;
  storeName?: string;
  pressureScore?: number;
  temperatureScore?: number;
  vibrationScore?: number;
  currentScore?: number;
  totalScore?: number;
  remainingLife?: string;
  healthLevel?: string;
  healthLevelName?: string;
}

export interface ColdStoreRefrigerationHealthOverview {
  units: ColdStoreRefrigerationUnitHealthRank[];
}

export interface ColdStoreRefrigerationEnergyItem {
  storeCode: string;
  storeName?: string;
  currentCop?: number;
  baselineCop?: number;
  deviationPercent?: number;
  efficiencyLevel?: string;
  efficiencyLevelName?: string;
  aiDiagnosis?: string;
  aiRecommendation?: string;
  expectedSavingPercent?: number;
}

export interface ColdStoreRefrigerationEnergy {
  records: ColdStoreRefrigerationEnergyItem[];
  trendDescription?: string;
}

export interface ColdStoreRefrigerationParameterScore {
  code?: string;
  name?: string;
  score?: number;
}

export interface ColdStoreRefrigerationRuntimeMetric {
  code?: string;
  name?: string;
  value?: string;
  unit?: string;
  updateTime?: string;
}

export interface ColdStoreRefrigerationSimilarCase {
  caseDate?: string;
  storeName?: string;
  description?: string;
}

export interface ColdStoreRefrigerationUnitDetail {
  unitCode: string;
  unitName?: string;
  storeName?: string;
  healthScore?: number;
  healthLevel?: string;
  healthLevelName?: string;
  remainingLife?: string;
  trend?: string;
  trendName?: string;
  diagnosis?: string;
  diagnosisConfidence?: string;
  latestUpdateTime?: string;
  parameterScores: ColdStoreRefrigerationParameterScore[];
  runtimeMetrics: ColdStoreRefrigerationRuntimeMetric[];
  trends: ColdStoreMonitorTrend[];
  aiDiagnosis?: string;
  similarCases: ColdStoreRefrigerationSimilarCase[];
  maintenanceSuggestions: string[];
}

export interface ColdStoreLeakResponseListItem {
  alarmId: string;
  alarmCode?: string;
  title?: string;
  storeId?: string;
  storeCode?: string;
  storeName?: string;
  mainDeviceId?: string;
  mainDeviceCode?: string;
  mainDeviceName?: string;
  currentConcentration?: number;
  concentrationUnit?: string;
  alarmLevelCode?: string;
  alarmLevelName?: string;
  alarmStatusName?: string;
  alarmTime?: string;
  location?: string;
}

export interface ColdStoreLeakEvidence {
  type?: string;
  typeName?: string;
  status?: string;
  statusName?: string;
  value?: number;
  unit?: string;
  observedTime?: string;
}

export interface ColdStoreLeakResponseAlarmRecord {
  id?: string;
  code?: string;
  alarmLevelCode?: string;
  alarmLevelName?: string;
  alarmTypeCode?: string;
  alarmTypeName?: string;
  alarmTargetCode?: string;
  alarmTargetName?: string;
  alarmTime?: string;
  alarmStatus?: string;
  alarmStatusName?: string;
  [key: string]: unknown;
}

export interface ColdStoreLeakResponseAiCaptureFile {
  fileId?: string;
  name?: string;
  path?: string;
  suffix?: string;
  type?: string;
}

export interface ColdStoreLeakResponseDetail {
  alarmRecord?: ColdStoreLeakResponseAlarmRecord;
  storeId?: string;
  storeCode?: string;
  storeName?: string;
  mainDeviceId?: string;
  mainDeviceCode?: string;
  mainDeviceName?: string;
  currentConcentration?: number;
  concentrationUnit?: string;
  concentrationUpdateTime?: string;
  lowThreshold?: number;
  highThreshold?: number;
  concentrationTrends: ColdStoreMonitorTrendPoint[];
  aiConfidence?: number;
  whiteFogDetected?: boolean;
  aiCaptureFileIds?: string[];
  aiCaptureFiles?: ColdStoreLeakResponseAiCaptureFile[];
  evidences: ColdStoreLeakEvidence[];
  cameras: ColdStoreMonitorCamera[];
}

export interface ColdStoreStatisticsOverview {
  onlineStoreCount?: number;
  totalStoreCount?: number;
  overallHealthScore?: number;
  monthlyAlarmCount?: number;
  timelinessRate?: number;
}

export interface ColdStoreStatisticsTrendPoint {
  time?: string;
  value?: number;
}

export interface ColdStoreStatisticsTrendSeries {
  storeId?: string;
  storeName?: string;
  mainDeviceId?: string;
  color?: string;
  points: ColdStoreStatisticsTrendPoint[];
}

export interface ColdStoreStatisticsAmmoniaTrend {
  lowThreshold?: number;
  highThreshold?: number;
  series: ColdStoreStatisticsTrendSeries[];
}

export interface ColdStoreStatisticsAlarmDistribution {
  source?: string;
  sourceName?: string;
  count?: number;
  percent?: number;
  color?: string;
}

export interface ColdStoreStatisticsDoorTimeoutRank {
  rank?: number;
  storeId?: string;
  storeName?: string;
  timeoutCount?: number;
  totalDurationMinutes?: number;
  longestDurationMinutes?: number;
  trend?: "UP" | "FLAT" | "DOWN" | string;
  trendName?: string;
}

export interface ColdStoreStatisticsResponseTimelinessRank {
  rank?: number;
  handlerName?: string;
  receivedCount?: number;
  averageAcceptMinutes?: number;
  averageHandleMinutes?: number;
  totalDurationMinutes?: number;
  evaluation?: "EXCELLENT" | "GOOD" | "NORMAL" | "NEED_IMPROVE" | string;
  evaluationName?: string;
}

export interface ColdStoreStatisticsPreview {
  periodStartTime?: string;
  periodEndTime?: string;
  trendStartTime?: string;
  trendEndTime?: string;
  lastUpdatedTime?: string;
  overview?: ColdStoreStatisticsOverview;
  ammoniaTrend?: ColdStoreStatisticsAmmoniaTrend;
  alarmDistributions: ColdStoreStatisticsAlarmDistribution[];
  doorTimeoutRanks: ColdStoreStatisticsDoorTimeoutRank[];
  responseTimelinessRanks: ColdStoreStatisticsResponseTimelinessRank[];
}
