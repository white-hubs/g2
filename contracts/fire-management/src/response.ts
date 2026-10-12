import type { FireDeviceStatus, FireDeviceType, PanelStyle, PointType, HostStatus } from "./enums";
import type { FirePointControlParam } from "./request";

export type FireCommandStatusCode = "ACCEPT" | "PROCESSING" | "SUCCESS" | "FAIL" | "REJECT" | "EXPIRED";

export interface FireHostOverviewRecord {
  id: string | number;
  deviceId?: string | number;
  deviceName: string;
  deviceLocation?: string;
  productModel?: string;
  deviceCode?: string;
  brandName?: string;
  communicationStatus?: string;
  online: boolean;
  controlPasswordRequired: boolean;
  fireCount: number;
  faultCount: number;
}

export interface FireHostAlarmRecord {
  id: string | number;
  code?: string;
  alarmLevelName?: string;
  alarmTypeName?: string;
  alarmTargetName?: string;
  alarmTargetAddress?: string;
  alarmTime?: string;
  area?: string;
  areaName?: string;
  alarmThreshold?: string;
  alarmEvent?: string;
  alarmEventName?: string;
  alarmStatus?: "ALARM_UN_CONFIRMED" | "ALARM_PROGRESS_CONFIRMED" | "ALARM_SUSPEND" | "ALARM_HANDLER";
  alarmStatusName?: string;
  alarmConfirmedName?: string;
  alarmHandlerName?: string;
  alarmHandlerTimeoutStatus?: "TIMED_OUT" | "NORMAL";
  alarmHandlerTimeoutStatusName?: string;
  timeoutProcessTimesName?: string;
}

export interface FirePointControlDeviceRecord {
  id: string | number;
  fireManageDeviceId: string | number;
  deviceId?: string | number;
  pointName: string;
  pointCode?: string;
  code?: string;
  productModel?: string;
  brandName?: string;
  circuit?: string;
  address?: string;
  busType: "1" | "2";
  location?: string;
  online: boolean;
  controlReady: boolean;
  controlStatus: "RUNNING" | "STOPPED" | "FAULT" | "UNKNOWN";
  statusPropCode?: string | null;
  currentValue?: unknown;
  currentValueTime?: number;
}

export interface FirePointControlPropertyValueRecord {
  value: unknown;
  label?: string;
}

/** 点位关联设备中可用于控制配置的物模型属性。 */
export interface FirePointControlPropertyRecord {
  propertyCode: string;
  propertyName: string;
  dataType?: string;
  dataWrite?: number;
  readable?: boolean;
  writable?: boolean;
  unitName?: string | null;
  remark?: string | null;
  dataConstraint?: unknown;
  options: FirePointControlPropertyValueRecord[];
  currentValue?: unknown;
  currentValueTime?: number;
}

/** 消防主机多线盘指示灯配置。 */
export interface FireHostIndicatorButtonRecord {
  code: string;
  name: string;
}

export interface FireHostIndicatorLightConfigRecord {
  fireManageDeviceId: string | number;
  indicatorCount: 2 | 3;
  indicatorButtons: FireHostIndicatorButtonRecord[];
}

export interface FireHostCommandRecord {
  commandSeq: string;
  commandHandle: string;
  methodCode?: string;
  statusCode?: FireCommandStatusCode;
  message?: string;
  outputParams?: Record<string, unknown>;
}

export interface FireHostCommandStatusRecord {
  instanceId: string;
  deviceId?: string | number;
  deviceName?: string;
  methodCode?: string;
  methodName?: string;
  methodType?: string;
  inputParams?: Record<string, unknown>;
  outputParams?: Record<string, unknown>;
}

export interface FirePointControlCommandRecord {
  fireManageDeviceId: string | number;
  firePointDeviceId: string | number;
  deviceId?: string | number;
  action: "START" | "STOP";
  propertyCode?: string;
  expectedValue?: string;
  requestId: string;
  commandSeq?: string;
  commandHandle: string;
  statusCode?: FireCommandStatusCode | null;
  message?: string | null;
}

export interface FireDeviceRecord {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: FireDeviceType;
  status: FireDeviceStatus;
  location: string;
  lastCheckDate?: number;
  remark?: string;
}

export interface FireHostRecord {
  id: string;
  deviceCode?: string;
  name: string;
  projectId: string;
  projectName: string;
  deviceModel: string;
  pointCount: number;
  panelStyle: PanelStyle;
  controlPassword?: string;
  cameraIds?: string[];
  areaIds?: string[];
  status: HostStatus;
  deviceId?: string | number;
  deviceName?: string;
  deviceProdCategoryName?: string;
  deviceProdCategoryCode?: string;
  areaId?: string;
  deviceProdId?: string | number;
  deviceProdName?: string;
  productModel?: string;
  areaName?: string;
  code?: string;
  deviceStatus?: number;
  communicationStatus?: string;
  brandCode?: string;
  brandName?: string;
  lntAndLat?: string;
  deviceProdCategoryCodeConcat?: string;
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;
  deleted?: number;
  tenant?: number;
}

export interface FirePointRecord {
  id: string;
  hostId: string;
  type: PointType;
  name: string;
  circuit: string;
  address: string;
  code: string;
  busType: number | string;
  fireManageDeviceId?: string | number;
  deviceId?: string | number;
  pointName?: string;
  pointCode?: string;
  productModel?: string;
  brandName?: string;
  location?: string;
  coordinateX?: string | number;
  coordinateY?: string | number;
  locationId?: string;
  locationName?: string;
  posX?: number;
  posY?: number;
  imageId?: string;
  hostCtrl?: boolean;
  ctrlParam?: FirePointControlParam;
  isValid: boolean;
}

export interface OperationLogRecord {
  id: string;
  time: string;
  operator: string;
  type: string;
  content: string;
  result: "success" | "failed";
}

export type FireOperationCategory = "HOST_BUTTON" | "BUS_POINT" | "MULTI_LINE_POINT";
export type FireOperationResult = "PROCESSING" | "SUCCESS" | "FAILED";
export type FireOperationStatusCode = "INIT" | FireCommandStatusCode | "ERROR";

export interface FireOperationLogRecord {
  id: string | number;
  operationTime: string;
  completedTime?: string | null;
  fireManageDeviceId: string | number;
  hostName: string;
  hostNameSnapshot?: string | null;
  operatorId?: string | null;
  operatorName?: string | null;
  operationCategory: FireOperationCategory;
  operationCategoryName: string;
  operationContent: string;
  actionCode?: string | null;
  result: FireOperationResult;
  resultName: string;
  failureReason?: string | null;
  statusCode?: FireOperationStatusCode | null;
  responseMessage?: string | null;
  buttonId?: string | number | null;
  firePointDeviceId?: string | number | null;
  deviceId?: string | number | null;
  operationName?: string | null;
  targetName?: string | null;
  commandSeq?: string | null;
  commandHandle?: string | null;
  methodCode?: string | null;
  propertyCode?: string | null;
  expectedValue?: string | null;
  inputParams?: string | null;
  outputParams?: string | null;
  ipAddress?: string | null;
  operationType?: number | null;
  status?: 0 | 1 | 2 | null;
}

export interface EventRecord {
  id?: string | number;
  fireManageDeviceId?: string | number;
  eventCode?: string;
  eventName?: string;
  eventType?: "alarm" | "info" | "fault";
  category: string;
  deviceInfo: string;
  bizType: string;
  eventTime: string;
  location: string;
  pointName?: string;
  circuit?: string;
  address?: string;
  pointCode?: string;
  hostName?: string;
  coordinateX?: string;
  coordinateY?: string;
}

export interface FirePointLocalEventRecord {
  id: string | number;
  firePointDeviceId?: string | number;
  fireManageDeviceId?: string | number;
  deviceId?: string | number;
  eventCode?: string;
  category?: string;
  bizType?: string;
  eventTime?: string;
  location?: string;
  deviceInfo?: string;
  eventPayload?: string;
}

export interface FireProductMethodRecord {
  name?: string;
  methodCode: string;
  description?: string;
  methodType?: string;
  inputParams?: Record<string, unknown>;
  outputParams?: Record<string, unknown>;
  timeoutMs?: number;
  createTimeFormat?: string;
}

export interface FireHostButtonConfigRecord {
  id: string | number;
  fireManageDeviceId?: string | number;
  deviceProdId?: string | number;
  methodCode: string;
  methodName?: string;
  methodType?: string;
  icon?: string;
  sortNo?: number;
  enabled?: boolean;
  remark?: string;
  inputParams?: Record<string, unknown>;
  outputParams?: Record<string, unknown>;
}

export interface FireHostMonitorDeviceRecord {
  id: string | number;
  deviceCode?: string;
  deviceName?: string;
  productCategoryCode?: string;
  productCategoryName?: string;
  productName?: string;
  brandName?: string;
  areaId?: string | number;
  areaName?: string;
  associated?: boolean;
}

export interface WaterSensorRecord {
  id: string;
  name: string;
  type: string;
  value: number;
  unit: string;
  refMin: number;
  refMax: number;
  ratio: number;
  time: string;
  isWarn: boolean;
}

export interface FireUtilityMonitorCardRecord {
  relationId: string | number;
  deviceId: string | number;
  deviceName: string;
  deviceCode?: string;
  location?: string;
  monitorType: "WATER" | "ELECTRIC";
  metricPropCode?: string;
  metricPropName?: string;
  metricUnit?: string;
  currentValue?: number | null;
  collectionTime?: number;
  referenceMin?: number | null;
  referenceMax?: number | null;
  online: boolean;
  configReady: boolean;
  status: "UNCONFIGURED" | "OFFLINE" | "NO_DATA" | "NORMAL" | "BELOW_RANGE" | "ABOVE_RANGE";
}

export interface FireUtilityDeviceCandidateRecord {
  deviceId: string | number;
  deviceName: string;
  deviceCode?: string;
  productName?: string;
  productCategoryCode?: string;
  productCategoryName?: string;
  brandName?: string;
  areaId?: string | number;
  areaName?: string;
  online: boolean;
  associated: boolean;
}

export interface FireUtilityPropertyRecord {
  propertyCode: string;
  propertyName: string;
  dataType: string;
  unit?: string | null;
  precision?: number | null;
  currentValue?: unknown;
  currentValueTime?: number;
  selected: boolean;
}
export interface FireUtilityPanelItemRecord {
  relationId: string | number;
  deviceId?: string | number;
  deviceName?: string;
  metricPropCode?: string | null;
  metricPropName?: string | null;
  metricUnit?: string | null;
  referenceMin?: number | null;
  referenceMax?: number | null;
  sortNo?: number | null;
  selected: boolean;
  configReady: boolean;
}
export interface FireUtilityPanelRecord {
  fireManageDeviceId: string | number;
  monitorType: "WATER" | "ELECTRIC";
  maxItems: number;
  selectedCount: number;
  items: FireUtilityPanelItemRecord[];
}

export interface FirePointEventStatisticsRecord {
  id: string | number;
  pointName?: string;
  location?: string;
  alarmCount?: number;
  faultCount?: number;
  totalCount?: number;
  lastTriggerTime?: string;
}
