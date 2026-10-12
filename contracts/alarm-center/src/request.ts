export interface AlarmRecordPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  alarmLevelId?: string;
  alarmTypeId?: string;
  alarmTargetTypeId?: string;
  areaIds?: string;
  alarmHandlerResult?: string;
  alarmStatus?: string;
  period?: string;
  businessType?: string;
  applicationCode?: string;
  alarmHandlerTimeoutStatus?: string;
  alarmEvent?: string;
  userId?: string;
  userResponsible?: string;
  departmentId?: string;
  alarmLevelCode?: string;
  deviceTags?: string;
  sceneType?: string;
  areaId?: string;
  deviceIds?: string[];
  alarmEventTypeId?: string;
  areaLike?: boolean;
  alarmTargetKey?: string;
}

export interface AlarmRecordBatchDeletePayload {
  ids: string[];
}

export interface AlarmTransferPayload {
  departmentId: string;
  departmentName: string;
  userId: string;
  userName: string;
}

export type AlarmAssignTargetType = "USER" | "ROLE" | "DEPARTMENT";

export interface AlarmDynamicAssignTarget {
  targetType: AlarmAssignTargetType;
  targetIds: string[];
}

export interface AlarmMessageTargetModifyParam {
  messageTargetNotify: string;
  targetConfig: Record<string, unknown>;
}

export interface AlarmCcMessageNotify {
  channelTypes: string[];
  targetModifyParams: AlarmMessageTargetModifyParam[];
}

export interface AlarmAssignPayload {
  assignUser: AlarmDynamicAssignTarget[];
  ccMessageNotifies?: AlarmCcMessageNotify[];
}

export interface AlarmSuspendPayload {
  estimatedProcessTime: string;
  remark: string;
  fileVOS: AlarmUploadFilePayload[];
}

export interface AlarmReasonPayload {
  id?: string;
  reason?: string;
}

export interface AlarmUploadFilePayload {
  id: string;
  name?: string;
  path?: string;
  type?: string;
  suffix?: string;
  size?: number;
  businessKey?: string | null;
  [key: string]: unknown;
}

export interface AlarmHandlePayload {
  alarmHandlerResult: string;
  alarmHandlerResultRemark: string;
  fileVOS: AlarmUploadFilePayload[];
  alarmReason?: AlarmReasonPayload | null;
  alarmReasonName?: string | null;
}

export interface AlarmFollowPayload {
  id: string;
  content: string;
  files: string[];
}

export interface AlarmUrgePayload {
  ids: string[];
}

export interface AlarmLinkageExecutePayload {
  eventIotDeviceId: string;
}

export interface AlarmNearbyDeviceQuery {
  alarmRecordId: string;
  pageNumber: number;
  pageSize: number;
  productId?: string;
  categoryCode?: string;
}
