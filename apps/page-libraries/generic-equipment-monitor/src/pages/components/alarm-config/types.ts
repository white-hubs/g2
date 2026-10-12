/** 与 iot-center generic-alarm-config 对齐的 emergency-rule 载荷类型 */

export type SelectEnum = "DEPARTMENT" | "ROLE" | "USER" | null;

export interface TargetModifyParams {
  messageTargetNotify: SelectEnum;
  id: string;
  targetConfig: {
    id?: string;
    userId?: string;
    roleId?: string;
    roleName?: string;
    departmentId?: string;
    userName?: string;
    departmentName?: string;
  }[];
}

export interface NoticeType {
  dutyUser: boolean;
  targetModifyParams: TargetModifyParams[];
  channelTypes: string[];
}

export interface EmergencyRuleConditionExpsType {
  id: string;
  propCode: string | undefined;
  propName: string;
  propUnit: string;
  op: string | null;
  oprand: string;
  delayTime: number;
  emergencyRuleConditionId: string;
  emergencyRuleId: string;
  startDelayTime: number | null;
  endDelayTime: number | null;
}

export interface RuleTimeType {
  timeType: "ALL" | "WEEK" | "MONTH" | "TIME";
  timeConditions: string;
  timeList: { beginTime: string; endTime: string }[] | string;
}

export interface RuleDataType {
  id: string;
  deviceProdId: string | undefined;
  deviceProdCategoryCodeConcat: string;
  deviceEventName: string;
  deviceProdCategoryName: string;
  deviceEventType: string;
  deviceProdName: string;
  conditionType: string | null;
  emergencyRuleConditionExps: EmergencyRuleConditionExpsType[];
  deviceEventCode: string | undefined;
  eventConfigType?: "THRESHOLD_SETTING" | "PARAMETER_SETTING";
}

export interface RuleGroupType {
  id: string;
  emergencyRuleConditions: RuleDataType[];
  emergencyRuleTime: RuleTimeType;
}

export interface DeviceTypeAlarm {
  conditionType: string;
  deviceName: string;
  deviceAreaId: string;
  deviceAreaName: string;
  deviceProdCategoryCodeConcat: string | undefined;
  deviceProdCategoryName: string | undefined;
  deviceProdId: string | undefined;
  deviceProdName: string | undefined;
  id: string;
  deviceId: string;
  enabled?: boolean;
}

export interface AlarmDeviceValue {
  enabled: boolean;
  emergencyRuleConditions: DeviceTypeAlarm[];
}

export interface AlarmAssignValue {
  actionType: "ALARM_NOTIFY_ACTION";
  enabled: boolean;
  actionConfig: NoticeType;
}

export interface AlarmMessageType {
  id: string;
  delayTimeUnit: string;
  duration: number | string;
  notifyType: null | string;
  channelTypes: string[];
  targetModifyParams: TargetModifyParams[];
}

export interface AlarmMessageValue {
  enabled: boolean;
  actionType: "MESSAGE_NOTIFY_ACTION";
  id: string;
  actionConfig: AlarmMessageType[];
}

export interface AlarmIotType {
  deviceProdCategoryCode: string;
  deviceProdId: null | string;
  uuid: string;
  code: string;
  executeMode: string;
  genreId: string;
  id: string;
  modelId: string | null;
  name: string;
  propCode: string | null;
  propName: string;
  propValue: string;
}

export interface AlarmIotValue {
  enabled: boolean;
  actionType: "IOT_DEVICE_ACTION";
  id: string;
  actionConfig: AlarmIotType[];
}

export enum EmergencyActionBeforeType {
  ALARM_JUDGMENT = "ALARM_JUDGMENT",
}

export interface EmergencyActionBefore {
  actionBeforeType: EmergencyActionBeforeType;
  enabled: boolean;
  actionBeforeConfig: {
    systemProcess: boolean;
    judgmentTimeoutSeconds: number;
  };
}

export interface VideoDeviceActionValue {
  actionType: "VIDEO_DEVICE_ACTION";
  enabled: boolean;
  actionConfig: unknown[];
}

export type EmergencyAction = AlarmAssignValue | AlarmMessageValue | AlarmIotValue | VideoDeviceActionValue;

export interface EmergencyRuleBasicFields {
  id: string;
  name: string;
  alarmLevelId: string | undefined;
  /** 服务端回传的展示名称；详情页不应再以 id 代替名称。 */
  alarmLevelName?: string;
  emergencyEventTypeId: string | undefined;
  /** 服务端回传的展示名称；各子应用的事件分类名称不同。 */
  emergencyEventTypeName?: string;
  notifyCommandDispatch?: boolean;
  repeatTime: number;
  repeatTimeUnit: string;
  estimatedHandlerTime: number;
  estimatedHandlerUnit: string;
  remark: string;
  turnWarningSound: boolean;
  appointDevice: boolean;
}

export interface EmergencyRuleEditorState extends EmergencyRuleBasicFields {
  emergencyRuleConditionGroups: RuleGroupType[];
  emergencyRuleConditionDevices: DeviceTypeAlarm[];
  emergencyActionBeforeList: EmergencyActionBefore[];
  emergencyActions: EmergencyAction[];
}
