import type { FireDeviceStatus, FireDeviceType, PanelStyle, PointType } from "./enums";

export type FireEntityId = string | number;

export interface ListFireDeviceParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  type?: FireDeviceType | "";
  status?: FireDeviceStatus | "";
}

export interface CreateFireDeviceParams {
  deviceCode: string;
  deviceName: string;
  deviceType: FireDeviceType;
  status?: FireDeviceStatus;
  location: string;
  remark?: string;
}

export interface UpdateFireDeviceParams extends CreateFireDeviceParams {
  id: string;
}

export interface ListFireHostParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  projectId?: string;
  deviceName?: string;
  productModel?: string;
  brandName?: string;
}

export interface ListFireHostOverviewParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
}

/** 按消防主机查询其绑定物联设备的报警中心记录。 */
export interface ListFireHostAlarmRecordsParams {
  fireManageDeviceId: FireEntityId;
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  alarmLevelId?: FireEntityId;
  alarmLevelCode?: string;
  alarmTypeId?: FireEntityId;
  alarmTypeCode?: string;
  alarmEvent?: string;
  alarmEventName?: string;
  alarmStatus?: "ALARM_UN_CONFIRMED" | "ALARM_PROGRESS_CONFIRMED" | "ALARM_SUSPEND" | "ALARM_HANDLER";
  alarmHandlerTimeoutStatus?: "TIMED_OUT" | "NORMAL";
  period?: string;
  applicationCode?: string;
}

export interface FireHostControlCommandParam {
  buttonId: FireEntityId;
  controlPassword?: string;
  commandSeq?: string;
  inputParams?: Record<string, unknown>;
}

export type FireControlStatus = "RUNNING" | "STOPPED" | "FAULT" | "UNKNOWN";

export interface ListFireControlPointParams {
  pageNumber?: number;
  pageSize?: number;
  busType?: "1" | "2";
  controlStatus?: FireControlStatus;
  keyword?: string;
}

export interface FirePointControlCommandParam {
  action: "START" | "STOP";
  controlPassword?: string;
  requestId: string;
}

/** 消防主机多线盘指示灯配置保存参数。 */
export interface FireHostIndicatorLightConfigParam {
  indicatorCount: 2 | 3;
  /** 接口字段名沿用 indicatorNames，数组值传 indicatorButtons 中的 code。 */
  indicatorNames: string[];
}

export type FireUtilityMonitorType = "WATER" | "ELECTRIC";

export interface ListFireUtilityDeviceCandidatesParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  categoryCode?: string;
  brandName?: string;
  areaId?: FireEntityId;
  online?: boolean;
}

export interface SaveFireUtilityDevicesParam {
  deviceIds: FireEntityId[];
}
export interface UpdateFireUtilityRangeParam {
  referenceMin: number;
  referenceMax: number;
}
export interface FireUtilityPanelItemParam {
  relationId: FireEntityId;
  metricPropCode: string;
  referenceMin?: number | null;
  referenceMax?: number | null;
}
export interface SaveFireUtilityPanelParam {
  items: FireUtilityPanelItemParam[];
}

export interface CreateFireHostParams {
  name: string;
  projectId: string;
  deviceModel: string;
  panelStyle: PanelStyle;
  controlPassword?: string;
  cameraIds?: string[];
  areaIds?: string[];
}

export interface UpdateFireHostParams extends CreateFireHostParams {
  id: string;
}

export interface ListFirePointParams {
  hostId: FireEntityId;
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  type?: PointType | "";
  circuit?: string;
  busType?: number | string;
  isValid?: boolean;
  location?: string;
  address?: string;
  pointCode?: string;
  deviceCode?: string;
  code?: string;
  pointName?: string;
  productModel?: string;
  brandName?: string;
}

export interface FireDeviceCommandParam {
  fireManageDeviceId: number | string;
  operationType: number;
  controlPassword?: string;
}

export interface CreateFirePointParams {
  id?: FireEntityId;
  fireManageDeviceId: FireEntityId;
  deviceId?: FireEntityId;
  productModel?: string;
  brandName?: string;
  pointName?: string;
  circuit?: string;
  pointCode?: string;
  address?: string;
  code?: string;
  busType?: string | number;
  location?: string;
  coordinateX?: string | number;
  coordinateY?: string | number;
  hostCtrl?: boolean;
  ctrlParam?: FirePointControlParam;
}

export interface FirePointControlParam {
  start: string;
  stop: string;
  fb?: string;
}

/** 消防点位启停及状态反馈属性配置。 */
export interface FirePointControlConfigParam {
  startPropCode: string;
  startPropValue: string;
  stopPropCode: string;
  stopPropValue: string;
  runningPropCode: string;
  runningValue: string;
  stoppedValue: string;
}

export interface UpdateFirePointParams extends CreateFirePointParams {
  id: FireEntityId;
}

export interface FirePointConfigParam {
  id: FireEntityId;
  coordinateX?: string | number;
  coordinateY?: string | number;
  location?: string;
}

export interface ListFirePointEventParams {
  pageNumber?: number;
  pageSize?: number;
  fireManageDeviceId?: FireEntityId;
  circuit?: string;
  address?: string;
  location?: string;
  eventCodes?: string[];
  startTs?: number;
  endTs?: number;
  bizType?: string;
  maxRecords?: number;
}

export type ListFirePointLocalEventParams = Omit<ListFirePointEventParams, "maxRecords">;

export interface ListFireHostMethodParams {
  keyword?: string;
}

export interface FireHostButtonItemParam {
  methodCode: string;
  icon?: string;
  sortNo?: number;
  enabled?: boolean;
  remark?: string;
}

export interface SaveFireHostButtonsParam {
  buttons: FireHostButtonItemParam[];
}

export interface FireHostButtonUpdateItemParam {
  id: FireEntityId;
  icon?: string;
  sortNo?: number;
  enabled?: boolean;
  remark?: string;
}

export interface UpdateFireHostButtonsParam {
  buttons: FireHostButtonUpdateItemParam[];
}

export interface ListFireHostMonitorDeviceParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  categoryCode?: string;
  brandName?: string;
  areaId?: FireEntityId;
}

export interface SaveFireHostMonitorDevicesParam {
  monitorDeviceIds: FireEntityId[];
}

export interface ListOperationLogParams {
  pageNumber?: number;
  pageSize?: number;
  fireManageDeviceId?: FireEntityId;
  operationCategory?: "HOST_BUTTON" | "BUS_POINT" | "MULTI_LINE_POINT";
  result?: "PROCESSING" | "SUCCESS" | "FAILED";
  operatorKeyword?: string;
  startTime?: string;
  endTime?: string;
}

export interface ListEventParams {
  pageNumber?: number;
  pageSize?: number;
  fireManageDeviceId: string | number;
}

export interface ListFirePointEventStatisticsParams {
  pageNumber?: number;
  pageSize?: number;
  fireManageDeviceId?: FireEntityId;
  startDate?: string;
  endDate?: string;
  location?: string;
}

export interface SaveFireManageDeviceParams {
  deviceId: string | number;
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
}
