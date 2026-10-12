export type AlarmStatus = "ALARM_UN_CONFIRMED" | "ALARM_PROGRESS_CONFIRMED" | "ALARM_SUSPEND" | "ALARM_HANDLER";

export type AlarmHandlerResult = "ALARM_ACTUAL" | "ALARM_IMPRACTICAL";

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
  alarmConfirmedResult?: string;
  alarmStatus?: AlarmStatus;
  alarmStatusName?: string;
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
