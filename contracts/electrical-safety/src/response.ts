import type { DeviceKind, LongId } from "./enums";
import type { RemoteInspectionColumnType } from "./request";

export interface DictionaryItem {
  code: string;
  name: string;
}

export interface FacilityListItem {
  id: LongId;
  facilityName: string;
  areaId: LongId;
  areaName: string | null;
  floorArea: number | null;
  fireRatingCode: string;
  fireRatingName: string | null;
  fireResistanceLevelCode: string | null;
  fireResistanceLevelName: string | null;
  responsibleId: LongId | null;
  responsibleName: string | null;
  environmentDeviceCount: number;
  videoDeviceCount: number;
  electricalDeviceCount: number;
}

export interface FacilityDetail {
  id: LongId;
  facilityName: string;
  areaId: LongId;
  areaName: string | null;
  floorArea: number | null;
  fireRatingCode: string;
  fireRatingName: string | null;
  fireResistanceLevelCode: string | null;
  fireResistanceLevelName: string | null;
  responsibleId: LongId | null;
  responsibleName: string | null;
  remark: string | null;
}

export interface FacilityDevice {
  deviceId: LongId;
  deviceCode: string | null;
  deviceName: string | null;
  productCategoryCode: string | null;
  productCategoryName: string | null;
  productName: string | null;
  brandName: string | null;
  areaId: LongId | null;
  areaName: string | null;
}

export interface DeviceConfig {
  deviceId: LongId;
  deviceKind: DeviceKind;
  deviceType: string | null;
  config: Record<string, unknown>;
}

export interface MonitoringFacility {
  id: LongId;
  facilityName: string;
  electricalDeviceCount: number;
  hasActiveAlarm: boolean;
}
export interface ElectricalFacilityOverviewDisplayProperty {
  deviceId: LongId;
  deviceName: string;
  propertyCode: string;
  propertyName: string;
  value: unknown;
  unit: string | null;
  status: "NORMAL" | "WARNING" | "ALARM" | "UNKNOWN";
  collectTime: string | null;
}
export interface ElectricalFacilityOverview {
  facilityId: LongId;
  facilityName: string;
  hasActiveAlarm: boolean;
  electricalDeviceTotal: number;
  electricalDeviceOnline: number;
  electricalDeviceOnlineRate: number;
  displayProperties: ElectricalFacilityOverviewDisplayProperty[];
}
export interface MonitorPoint {
  deviceId: LongId;
  deviceName: string;
  propertyCode: string;
  propertyName: string;
  value: unknown;
  unit: string | null;
  status: "NORMAL" | "WARNING" | "ALARM" | "UNKNOWN";
  collectTime?: string | null;
}
export interface MonitoringOverview {
  facilityId: LongId;
  facilityName: string;
  monitorPoints: MonitorPoint[];
  cameras: { deviceId: LongId; deviceName: string; onlineStatus: "ONLINE" | "OFFLINE" }[];
}
export interface MonitoringDevice {
  deviceId: LongId;
  deviceName: string;
  productCode: string;
  productName: string;
  productCategoryCode: string;
  productCategoryName: string;
  onlineStatus: "ONLINE" | "OFFLINE";
  hasActiveAlarm: boolean;
  alarmLevelCode: string | null;
  alarmLevelName: string | null;
  maintenanceSummary: string | null;
  maintenanceStatus: "NORMAL" | "WARNING" | "DANGER";
  displayProperties: MonitorPoint[];
}
export interface DeviceBasicInfo {
  deviceId: LongId;
  deviceCode: string;
  deviceName: string;
  productCode: string;
  productName: string;
  productCategoryCode: string;
  productCategoryName: string;
  brandName: string | null;
  model: string | null;
  facilityId: LongId;
  facilityName: string;
  commissioningDate: string | null;
  deviceConfigDisplay: { code: string; name: string; value: unknown } | null;
  maintenanceCompany: string | null;
  onlineStatus: "ONLINE" | "OFFLINE";
}
export interface DeviceRealtimeProperties {
  properties: (MonitorPoint & {
    dataType?: string | null;
    precision?: number | null;
    /** 0 - read only; 1 - read/write. */
    dataWrite?: number | null;
    /** Numeric range or enum options supplied by the product model. */
    dataConfig?: unknown[] | null;
    remark?: string | null;
  })[];
  methods: {
    methodCode: string;
    methodName: string;
    description: string | null;
    methodType: string;
    inputParams: Record<string, unknown>;
    outputParams?: Record<string, unknown>;
  }[];
}
export interface DevicePropertyControlResponse {
  commandSeq: string;
  commandHandle: string;
  statusCode: string;
  message: string;
}
export interface DeviceControlRecord {
  operateTime: string;
  actionCode: string;
  actionName: string;
  operatorName: string;
  resultCode: string;
  resultName: string;
}
export interface DeviceAlarmRecord {
  eventName: string;
  levelCode: string;
  levelName: string;
  occurTime: string;
  timeoutStatusCode: string;
  timeoutStatusName: string;
  handleResultCode: string;
  handleResultName: string;
  handlerName: string;
}
export interface DeviceMaintenanceRecord {
  taskName: string;
  planName: string;
  inspectorName: string;
  inspectionTime: string;
  statusCode: string;
  statusName: string;
  resultCode: string;
  resultName: string;
  resultDescription: string | null;
}
export interface DeviceAiAnalysis {
  deviceId: LongId;
  statisticsTime: string;
  serviceAgeScore: number;
  parameterStabilityScore: number;
  alarmFrequencyScore: number;
  maintenanceTimelinessScore: number;
  environmentScore: number;
  healthScore: number;
  future7dRisk: string;
  remainingLifeMonths: number;
  sameProductRank: number;
  sameProductTotal: number;
  aiAnalysis: string | null;
  healthScoreTrend: DeviceHealthScoreTrend[];
}

export interface DeviceHealthScoreTrend {
  date: string;
  healthScore: number | null;
}
export interface ElectricalDeviceHealthDistribution {
  totalCount: number;
  healthyCount: number;
  attentionCount: number;
  abnormalCount: number;
  unknownCount: number;
  attentionTop5: {
    deviceId: LongId;
    deviceName: string;
    healthScore: number;
  }[];
}
export interface ElectricalDeviceOnlineRate {
  totalCount: number;
  onlineCount: number;
  offlineCount: number;
  onlineRate: number;
}
export interface ElectricalSafetyScore {
  score: number | null;
  previousScore: number | null;
  difference: number | null;
}
export interface ConfigurableProduct {
  productCode: string;
  productName: string;
  productCategoryCode: string;
  productCategoryName: string;
}

export interface ProductCategoryTree {
  categoryCode: string;
  categoryName: string;
  categoryCodeConcat: string;
  children?: ProductCategoryTree[];
}

export interface ProductReference {
  productCode: string;
  productName: string;
}

export interface ProductPropertyReference {
  propertyCode: string;
  propertyName: string;
  unit: string | null;
}
export interface DeviceCardConfig {
  facilityId: LongId;
  productCode: string;
  productName: string;
  productCategoryCode: string;
  productCategoryName: string;
  availableProperties: { propertyCode: string; propertyName: string; unit: string | null }[];
  selectedItems: {
    deviceId?: LongId;
    deviceName?: string;
    propertyCode: string;
    propertyName: string;
    unit: string | null;
    sort: number;
  }[];
}
export interface MonitorPanelConfig {
  facilityId: LongId;
  availableDevices: {
    deviceId: LongId;
    deviceName: string;
    productCode: string;
    productName: string;
    properties: Array<{ propertyCode: string; propertyName: string; unit: string | null }>;
  }[];
  selectedItems: {
    deviceId: LongId;
    deviceName: string;
    propertyCode: string;
    propertyName: string;
    unit: string | null;
    sort: number;
  }[];
}
export interface ElectricalCenterScadaBindingContent {
  /** 前端序列化后的电气中心与二维组态关系。 */
  content: string;
}
export interface FacilityScadaBindingContent {
  /** 前端序列化后的设施房与二维组态关系。 */
  content: string;
}
export type ElectricalParameterControlType = "TEXT" | "RATIO" | "SELECT";

export interface ElectricalDeviceParameter {
  parameterCode: string;
  parameterName: string;
  controlType: ElectricalParameterControlType;
  options: string[];
  defaultValue: string | null;
  helpText: string | null;
  sort: number | null;
}

export interface ElectricalDeviceTypeParameterConfig {
  deviceType: string;
  parameters: ElectricalDeviceParameter[];
}

export interface EnvironmentAvailableProperty {
  propertyCode: string;
  propertyName: string;
  unit: string | null;
}

export interface EnvironmentParameterMapping {
  propertyCode: string;
  propertyName: string;
  unit: string | null;
  parameterTypeCode: string;
  parameterTypeName: string;
}

export interface EnvironmentDeviceParameterConfig {
  deviceId: LongId;
  productCode: string | null;
  productName: string | null;
  availableProperties: EnvironmentAvailableProperty[];
  parameterTypes: DictionaryItem[];
  items: EnvironmentParameterMapping[];
}

export interface RemoteInspectionTemplateListItem {
  id: LongId;
  templateName: string;
  facilityId: LongId;
  facilityName: string;
  frequencyHours: number;
  showRealtimeData: boolean;
  enabled: boolean;
  createTime: string;
}

export interface RemoteInspectionTemplateColumn {
  id: LongId;
  columnType?: RemoteInspectionColumnType;
  firstHeader: string;
  secondHeader?: string | null;
  propertyCode?: string | null;
  propertyName?: string | null;
  unit?: string | null;
  productCategoryCode?: string | null;
  productCategoryName?: string | null;
  productId?: LongId | null;
  productName?: string | null;
  sort: number;
}

export interface RemoteInspectionTemplateDetail extends Omit<RemoteInspectionTemplateListItem, "createTime"> {
  remark: string;
  columns: RemoteInspectionTemplateColumn[];
}

export interface RemoteInspectionDataHeader {
  columnKey: string;
  columnType?: RemoteInspectionColumnType;
  firstHeader: string;
  secondHeader: string;
  sort: number;
}

export interface RemoteInspectionDataRecord {
  index: number;
  collectTime: string;
  deviceId: LongId;
  deviceName: string;
  values: Record<string, string>;
}

export interface RemoteInspectionData {
  headers: RemoteInspectionDataHeader[];
  total: number;
  records: RemoteInspectionDataRecord[];
}
