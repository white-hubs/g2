import type { Pagination, Paging } from "@g2-contract/base";
export interface DeviceManagementPageItem {
  id: string | number;
  deviceNumber: string;
  name: string;
  productId: string | number;
  productName?: string;
  status?: number;
  statusName?: string;
  deviceType?: number;
  deviceTypeName?: string;
}
export interface DeviceProductOption {
  id: string | number;
  prodName: string;
}
export interface ListDeviceManagementPageParams extends Partial<Paging> {
  prodId?: string | number;
  status?: number;
  deviceNameOrNumber?: string;
  isMainDeviceOnly?: boolean;
  deviceIds?: string;
}
export type AlarmStatus = "ALARM_UN_CONFIRMED" | "ALARM_PROGRESS_CONFIRMED" | "ALARM_SUSPEND" | "ALARM_HANDLER";
export type AlarmHandlerResult = "ALARM_ACTUAL" | "ALARM_IMPRACTICAL";
export interface AlarmLevelStatistic {
  alarmNum: number;
  code: string;
  id: string;
  name: string;
  ratio: string;
}
export interface AlarmEventStatusRecord {
  alarmEvent?: string;
  alarmEventName?: string;
  totalNum?: number;
  unConfirmedNum?: number;
  progressConfirmedNum?: number;
  handlerNum?: number;
  suspendNum?: number;
  timeoutNum?: number;
  [key: string]: unknown;
}
export type AlarmHandlerTimeoutStatus = "TIMED_OUT" | "NORMAL";
export interface AlarmRecord {
  id: string;
  code?: string;
  alarmLevelId?: string;
  alarmLevelCode?: string;
  alarmLevelName?: string;
  alarmLevelSort?: number;
  alarmTypeId?: string;
  alarmTypeCode?: string;
  alarmTypeName?: string;
  alarmTargetKey?: string;
  alarmTargetCode?: string;
  alarmTargetName?: string;
  alarmTargetTypeId?: string;
  alarmTargetTypeName?: string;
  businessType?: string;
  businessKey?: string;
  alarmTime?: string;
  area?: string;
  areaName?: string;
  alarmThreshold?: string;
  alarmEvent?: string;
  alarmEventName?: string;
  alarmEventTypeId?: string;
  alarmEventTypeCode?: string;
  alarmEventTypeName?: string;
  alarmConfirmedResult?: string;
  alarmStatus?: AlarmStatus;
  alarmStatusName?: string;
  alarmStatusOrder?: number;
  alarmConfirmedBy?: string;
  alarmConfirmedTime?: string;
  estimateHandlerTime?: string;
  alarmHandlerBy?: string;
  alarmHandlerName?: string;
  alarmHandlerTime?: string;
  alarmHandlerResultRemark?: string;
  timeoutEquipped?: string;
  timeoutProcessTime?: string;
  timeoutProcessTimes?: string;
  timeoutProcessTimesUnit?: string;
  alarmHandlerTimeoutStatus?: AlarmHandlerTimeoutStatus;
  applicationCode?: string;
  applicationName?: string;
  url?: string;
  alarmTargetLongitude?: string;
  alarmHandlerResult?: AlarmHandlerResult;
  alarmHandlerResultName?: string;
  alarmTargetAddress?: string;
  alarmConfirmedName?: string;
  timeoutProcessTimesName?: string;
}
export interface AlarmOperatorRecord {
  id?: string;
  operatorTime?: string;
  operatorByName?: string;
  operatorContent?: string;
  [key: string]: unknown;
}
export interface AlarmFollowRecord {
  id?: string;
  content?: string;
  createTime?: string;
  createUserName?: string;
  files?: unknown[];
  [key: string]: unknown;
}
export interface AlarmReason {
  id: string;
  code?: string;
  reason: string;
  remark?: string;
  [key: string]: unknown;
}
export interface AlarmDetail extends Record<string, unknown> {
  id?: string;
  alarmStatus?: AlarmStatus;
  alarmEventName?: string;
}
export interface AlarmLinkageActionDevice {
  id?: string;
  deviceName?: string;
  propName?: string;
  propValue?: string;
  translatedValue?: string;
  executeMode?: string;
  [key: string]: unknown;
}
export interface AlarmLinkageExecuteRecord {
  id?: string;
  executeTime?: string;
  operatorName?: string;
  deviceName?: string;
  propName?: string;
  propValue?: string;
  translatedValue?: string;
  executeStatus?: string;
  [key: string]: unknown;
}
export interface AlarmNearbyDevice {
  id?: string;
  code?: string;
  name?: string;
  area?: {
    pathName?: string;
    name?: string;
  };
  productInfo?: {
    id?: string;
    brandName?: string;
    name?: string;
    productCategory?: {
      code?: string;
      name?: string;
    };
  };
  status?: {
    onlineState?: boolean;
  };
  [key: string]: unknown;
}
export interface Area {
  id: string;
  aliasName: string;
  code: string;
  children: Area[];
  parentId: string | null;
  name: string;
  //...其他字段
}
export interface ElectricalReferenceClient {
  listScadaPages(): Promise<{ id: string; name: string }[]>;
  getScadaPage(id: string): Promise<{ content?: string } | null>;
  getDefaultElectricalCenterPage(): Promise<{ id: string; name: string } | null>;
  listDeviceManagementPage(params: ListDeviceManagementPageParams): Promise<Pagination<DeviceManagementPageItem>>;
  listDeviceProducts(): Promise<DeviceProductOption[]>;
  getAlarmRecordPage(params: Record<string, unknown>): Promise<Pagination<AlarmRecord>>;
  getAlarmStatisticsLevel(params: Record<string, unknown>): Promise<AlarmLevelStatistic[]>;
  listAllArea(): Promise<Area[]>;
  listUsers(params: { pageNumber: number; pageSize: number }): Promise<Pagination<{ id: string; name: string; username: string }>>;
  getSecurityDevices(params: {
    applicationCode: string;
    pageNumber: number;
    pageSize: number;
    keyword?: string;
    areaId?: string;
  }): Promise<{
    records: { id: string; deviceId: string; name: string; deviceName: string; areaName?: string }[];
    total: number;
    pages: number;
  }>;
}
