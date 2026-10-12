import type {
  GrainAlertStatus,
  GrainAlertType,
  GrainColorOdorStatus,
  GrainDimension,
  GrainHealthLevel,
  GrainWarehouseType,
  GrainVarietyCategory,
} from "./enums";

export interface IntelligentGrainPaging {
  pageNumber: number;
  pageSize: number;
}

export interface GrainDashboardQuery {
  areaId?: string;
  areaName?: string;
  grainType?: string;
  healthLevel?: GrainHealthLevel | "";
  keyword?: string;
  sortBy?: "score-asc" | "score-desc" | "alert-desc" | "storage-desc" | "";
}

export interface GrainMetricValue {
  metricCode: string;
  metricName: string;
  value?: number;
  unit?: string;
  status?: "NORMAL" | "ALARM" | "OFFLINE" | string;
  collectTime?: string;
}

export interface GrainWarehouseCard {
  warehouseId: string;
  warehouseName: string;
  areaName?: string;
  grainVarietyId?: string;
  grainVarietyName?: string;
  grainType?: string;
  warehouseType?: GrainWarehouseType | string | null;
  healthScore?: number;
  healthLevel: GrainHealthLevel;
  offline: boolean;
  latestCollectTime?: string;
  temperature: GrainMetricValue;
  storage: GrainMetricValue;
  humidity?: GrainMetricValue;
  gas?: GrainMetricValue;
  activeAlert?: GrainAlertQuickItem;
}

export interface GrainAlertQuickItem {
  id: string;
  level: 1 | 2 | 3 | 4 | number;
  warehouseId: string;
  warehouseName: string;
  dimension: GrainDimension;
  alertType: GrainAlertType;
  alertTypeName: string;
  status: GrainAlertStatus;
  triggeredAt: string;
}

export interface GrainDashboardOverview {
  refreshTime: string;
  warehouses: GrainWarehouseCard[];
  alertQuickList: GrainAlertQuickItem[];
  total: number;
}

export interface GrainWarehouseOption {
  warehouseId: string;
  warehouseName: string;
  areaName?: string;
  grainVarietyId?: string;
  grainVarietyName?: string;
  grainType?: string;
}

export interface GrainWarehousePageQuery extends IntelligentGrainPaging {
  areaId?: string | number;
  areaName?: string;
  grainVarietyId?: string;
  grainType?: string;
  enabled?: boolean | "";
  keyword?: string;
}

export interface GrainWarehouseRecord {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  areaId?: number | null;
  areaName?: string | null;
  grainVarietyId?: string | null;
  grainVarietyName?: string | null;
  grainType?: string | null;
  warehouseType?: GrainWarehouseType | string | null;
  capacityVolume?: number | null;
  capacityWeight?: number | null;
  inboundDate?: string | null;
  qualityGrade?: string | null;
  sourceSystem?: string | null;
  sourceId?: string | null;
  enabled: boolean;
  createTime?: string;
  updateTime?: string;
  deviceBindings?: GrainWarehouseDeviceBinding[];
}

export interface GrainWarehousePayload {
  warehouseCode: string;
  warehouseName: string;
  areaId?: number | null;
  areaName?: string | null;
  grainVarietyId?: string | null;
  warehouseType?: GrainWarehouseType | string | null;
  capacityVolume?: number | null;
  capacityWeight?: number | null;
  inboundDate?: string | null;
  qualityGrade?: string | null;
  sourceSystem?: string | null;
  sourceId?: string | null;
  enabled?: boolean;
  deviceBindings?: GrainWarehouseDeviceBindingPayload[];
}

export interface GrainWarehouseDeviceBinding {
  bindingId?: string;
  warehouseId?: string;
  deviceId?: string;
  deviceNameSnapshot?: string;
  metricDimension?: GrainDimension;
  metricCode?: string;
  metricName?: string;
  propCode?: string;
  unit?: string;
  enabled?: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface GrainWarehouseDeviceBindingPayload {
  deviceId: string | number;
  deviceNameSnapshot?: string | null;
  metricDimension: GrainDimension;
  metricCode: string;
  propCode: string;
  unit?: string | null;
  enabled?: boolean;
}

export interface GrainVarietyOption {
  varietyId: string;
  varietyCode?: string;
  varietyName: string;
  category?: GrainVarietyCategory | null;
  categoryName?: string;
  warehouseId?: string | number | null;
}

export interface GrainVarietyPageQuery extends IntelligentGrainPaging {
  category?: GrainVarietyCategory | "";
  enabled?: boolean | "";
  keyword?: string;
}

export interface GrainVarietyRecord {
  varietyId: string;
  varietyCode: string;
  varietyName: string;
  category: GrainVarietyCategory;
  categoryName?: string;
  enabled: boolean;
  createTime?: string;
  updateTime?: string;
}

export interface GrainVarietyPayload {
  varietyCode: string;
  varietyName: string;
  category: GrainVarietyCategory;
  enabled?: boolean;
}

export interface GrainQualityRecordPageQuery extends IntelligentGrainPaging {
  warehouseId?: string | number;
  grainVarietyId?: string | number;
  beginDate?: string;
  endDate?: string;
}

export interface GrainQualityRecord {
  recordId: string;
  warehouseId?: string | null;
  warehouseName?: string | null;
  grainVarietyId?: string | null;
  grainVarietyName?: string | null;
  grainType?: string | null;
  inboundDate?: string | null;
  inspectionTime?: string | null;
  moisture?: number | null;
  fattyAcid?: number | null;
  germinationRate?: number | null;
  impurityRate?: number | null;
  imperfectGrainRate?: number | null;
  yellowRiceRate?: number | null;
  colorOdor?: GrainColorOdorStatus | null;
  colorOdorName?: string | null;
  inspector?: string | null;
  remark?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface GrainQualityRecordPayload {
  warehouseId: string | number;
  inspectionTime: string;
  moisture?: number | null;
  fattyAcid?: number | null;
  germinationRate?: number | null;
  impurityRate?: number | null;
  imperfectGrainRate?: number | null;
  yellowRiceRate?: number | null;
  colorOdor: GrainColorOdorStatus;
  inspector?: string | null;
  remark?: string | null;
}

export interface GrainArchiveDetail {
  warehouseId: string;
  warehouseName: string;
  areaName?: string;
  grainVarietyId?: string;
  grainVarietyName?: string;
  grainType?: string;
  inboundDate?: string;
  latestScanTime?: string;
  health: GrainHealthDetail;
  metrics: Record<string, GrainMetricValue>;
  radar: GrainRadarPoint[];
  ventilationSuggestion?: GrainAiSuggestion;
  qualityPrediction?: GrainQualityPrediction;
  riskPredictions: GrainRiskPrediction[];
  latestAlert?: GrainAlertQuickItem;
}

export interface GrainHealthDetail {
  score?: number;
  level: GrainHealthLevel;
  dimensionScores: GrainDimensionScore[];
}

export interface GrainDimensionScore {
  dimension: GrainDimension;
  label: string;
  score?: number;
  weight: number;
  ready: boolean;
}

export interface GrainRadarPoint {
  dimension: GrainDimension;
  label: string;
  value: number;
}

export interface GrainAiSuggestion {
  source: "RULE" | "AI" | string;
  ready: boolean;
  confidence?: number | null;
  summary: string;
  suggestions: string[];
}

export interface GrainQualityPrediction extends GrainAiSuggestion {
  grainType?: string;
  storageDays?: number;
  storageMonths?: number;
  accumulatedTemperature?: number;
  standardAccumulatedTemperature?: number;
  baseDecayRate?: number;
  temperatureAccelerationFactor?: number;
  moistureCorrectionFactor?: number;
  safeMoisture?: number;
  currentMoisture?: number;
  initialFattyAcid?: number;
  latestMeasuredFattyAcid?: number | null;
  latestMeasuredAt?: string | null;
  currentFattyAcidEstimate?: number;
  monthlyDecayRate?: number;
  unsuitableThreshold?: number;
  expectedUnsuitableDate?: string;
  calibratedByMeasured?: boolean;
  precisionNote?: string;
}

export interface GrainRiskPrediction extends GrainAiSuggestion {
  type?: "DEW" | "MOLD" | "PEST" | string;
  title: string;
  icon?: string;
  badgeText?: string;
  badgeLevel?: "normal" | "warn" | "danger" | string;
  metrics: GrainRiskPredictionMetric[];
  conclusion?: string;
}

export interface GrainRiskPredictionMetric {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface GrainArchiveTrendQuery {
  dimension?: GrainDimension;
  metric?: "WEIGHT" | "VOLUME" | "O2" | "CO2" | "H2S" | "TEMP_MAX" | "TEMPERATURE" | "HUMIDITY" | string;
  begin?: string;
  end?: string;
  range?: 7 | 30 | 90 | 365 | number;
}

export interface GrainArchiveTrend {
  dimension: GrainDimension;
  metric?: string;
  unit?: string;
  thresholds: Array<{ name: string; value: number; unit?: string }>;
  series: Array<{
    name: string;
    unit?: string;
    points: Array<{ time: string; value?: number; triggered?: boolean }>;
  }>;
  summary: Array<{ label: string; value: string; level?: "normal" | "warn" | "danger" | string }>;
}

export interface GrainArchiveRecordQuery extends IntelligentGrainPaging {
  dimension?: GrainDimension;
  metric?: string;
  deviceId?: string | number;
  devicePropertyCode?: string;
  begin?: string;
  end?: string;
}

export interface GrainArchiveRecord {
  collectTime: string;
  value?: number;
  unit?: string;
  deviceId?: string;
  devicePropertyCode?: string;
  metricCode?: string;
  deviceName?: string;
  metricName?: string;
  status?: "NORMAL" | "ALARM" | "OFFLINE" | string;
}

export interface GrainRuleConfig {
  temperature?: Record<string, unknown>;
  storage?: Record<string, unknown>;
  gas?: Record<string, unknown>;
  humidity?: Record<string, unknown>;
  escalation?: Record<string, unknown>;
  alertScan?: Record<string, unknown>;
  version?: number;
}

export interface GrainWarehouseRulePageQuery extends IntelligentGrainPaging {
  areaId?: string;
  grainType?: string;
  keyword?: string;
}

export interface GrainWarehouseRuleRow {
  warehouseId: string;
  warehouseName: string;
  grainVarietyId?: string;
  grainVarietyName?: string;
  grainType?: string;
  overrideDimensions: Array<{ dimension: GrainDimension; summary: string }>;
  updatedAt?: string;
}

export interface GrainRuleEngineConstants {
  dimensions: string[];
  ruleCodes: string[];
  supportedRanges: number[];
}

export interface GrainAlertPageQuery extends IntelligentGrainPaging {
  warehouseId?: string | number;
  tab?: "ALL" | GrainAlertStatus | "";
  status?: GrainAlertStatus;
  alertType?: GrainAlertType | "";
  level?: 1 | 2 | 3 | 4 | "";
  begin?: string;
  end?: string;
  keyword?: string;
  mine?: boolean;
}

export interface GrainAlertPageResult {
  total: number;
  pages: number;
  records: GrainAlertListItem[];
  tabCounts: Record<string, number>;
}

export interface GrainAlertListItem {
  id: string;
  triggeredAt: string;
  warehouseId: string;
  warehouseName: string;
  grainType?: string;
  alertType: GrainAlertType;
  alertTypeName: string;
  level: 1 | 2 | 3 | 4 | number;
  currentValueText: string;
  thresholdText?: string;
  status: GrainAlertStatus;
  assignedUserName?: string;
}

export interface GrainAlertDetail {
  id: string;
  status: GrainAlertStatus;
  alertInfo: GrainAlertListItem;
  snapshot: Record<string, GrainMetricValue>;
  trend: GrainArchiveTrend;
  aiSuggestion?: GrainAiSuggestion;
  judgement?: GrainAlertJudgement;
  disposal?: GrainAlertDisposal;
  disposalHistory?: GrainAlertDisposal[];
  acceptance?: GrainAlertAcceptance;
  logs: GrainAlertLog[];
}

export interface GrainAlertTracking {
  alertId: string;
  logs: GrainAlertLog[];
}

export interface GrainAlertJudgement {
  result?: "REAL" | "MISTAKE" | string | null;
  reason?: string | null;
  judgedAt?: string | null;
}

export interface GrainAlertDisposal {
  id?: string | null;
  realReason?: string | null;
  falseReason?: string | null;
  content?: string | null;
  adoptAi?: boolean;
  photoFileIds?: string[];
  attachmentFileIds?: string[];
  submittedAt?: string | null;
  reviewBefore?: Record<string, GrainMetricValue>;
  reviewAfter?: Record<string, GrainMetricValue>;
  reviewResult?: "PASS" | "FAIL" | "WAITING" | string;
}

export interface GrainAlertAcceptance {
  accepted?: boolean | null;
  conclusion?: string | null;
  rootCauseTag?: string | null;
  rootCauseTagName?: string | null;
  rootCauseTagOptions?: Array<{ code: string; label: string }>;
  rejectReason?: string | null;
  acceptedByName?: string | null;
  acceptedAt?: string | null;
}

export interface BatchWriteMetricSamplesParams {
  records: Array<{
    warehouseId: string | number;
    deviceId?: string | number;
    dimension: GrainDimension;
    metricCode: string;
    devicePropertyCode?: string;
    sampleTime: string;
    value?: number;
    unit?: string;
    quality?: string;
    source?: string;
    rawJson?: string;
  }>;
}

export interface GrainAlertLog {
  action: string;
  fromStatus?: GrainAlertStatus | null;
  toStatus?: GrainAlertStatus | null;
  operatorName?: string;
  remark?: string;
  operatedAt?: string;
}

export interface JudgeRealAlertParams {
  realReason: string;
  disposalContent?: string;
  adoptAi?: boolean;
  photoFileIds?: string[];
  attachmentFileIds?: string[];
}

export interface MarkMistakeAlertParams {
  falseReason: "SENSOR_FAULT" | "NORMAL_OPERATION_FLUCTUATION" | "ENVIRONMENT_INTERFERENCE" | "OTHER" | string;
  remark?: string;
}

export interface SubmitDisposalParams {
  disposalContent: string;
  adoptAi?: boolean;
  photoFileIds?: string[];
  attachmentFileIds?: string[];
}

export interface AcceptAlertParams {
  conclusion: string;
  rootCauseTag: "NATURAL_WARMING" | "VENTILATION_DELAY" | "DEVICE_FAULT" | "OPERATION_ERROR" | "IN_OUT_WAREHOUSE_EFFECT" | "OTHER" | string;
}

export interface RejectAlertParams {
  rejectReason: string;
  rootCauseTag?:
    | "NATURAL_WARMING"
    | "VENTILATION_DELAY"
    | "DEVICE_FAULT"
    | "OPERATION_ERROR"
    | "IN_OUT_WAREHOUSE_EFFECT"
    | "OTHER"
    | string;
}

export interface GrainMobileSummary {
  refreshTime: string;
  warehouses: GrainWarehouseCard[];
  myAlerts: GrainAlertListItem[];
}

export interface GrainMobileAlertQuery extends IntelligentGrainPaging {
  warehouseId?: string | number;
  status?: GrainAlertStatus;
}
