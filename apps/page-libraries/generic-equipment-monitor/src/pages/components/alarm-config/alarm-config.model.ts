import type {
  AlarmAssignValue,
  AlarmDeviceValue,
  AlarmIotValue,
  AlarmMessageValue,
  EmergencyAction,
  EmergencyActionBefore,
  EmergencyActionBeforeType,
  EmergencyRuleEditorState,
  RuleDataType,
  RuleGroupType,
  RuleTimeType,
} from "./types";
import { EmergencyActionBeforeType as ActionBeforeTypeEnum } from "./types";

export const CONDITION_TYPE_OPTIONS = [
  { value: "DEVICE_EVENT_CONDITION", label: "设备事件" },
  { value: "CUSTOM_RULE_CONDITION", label: "属性判断" },
] as const;

export const PERIOD_OPTIONS = [
  { value: "ALL", label: "全天" },
  { value: "WEEK", label: "周" },
  { value: "MONTH", label: "月" },
  { value: "TIME", label: "时段" },
] as const;

export const WEEK_OPTIONS = [
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
  { value: "7", label: "周日" },
] as const;

export const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}日`,
}));

export const COMPARATOR_OPTIONS = [
  { label: "=", value: "EQ" },
  { label: "≠", value: "NE" },
  { label: ">", value: "GT" },
  { label: "≥", value: "GE" },
  { label: "<", value: "LT" },
  { label: "≤", value: "LE" },
] as const;

export const DEVICE_EVENT_ALARM_TYPE_OPTIONS = [
  { label: "状态持续时延", value: "@dev_event_delay@" },
  { label: "事件发生次数", value: "@dev_event_count@" },
] as const;

export const EVENT_CONFIG_TYPE_OPTIONS = [
  { label: "阈值设定", value: "THRESHOLD_SETTING" },
  { label: "参数设定", value: "PARAMETER_SETTING" },
] as const;

export function unwrapApiList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    if (Array.isArray(nested.list)) return nested.list;
    if (Array.isArray(nested.records)) return nested.records;
  }
  if (Array.isArray(root.list)) return root.list;
  if (Array.isArray(root.records)) return root.records;
  return [];
}

export const NOTIFY_TYPE_OPTIONS = [
  { value: "IMMEDIATELY_NOTIFY", label: "及时通知" },
  { value: "TIMEOUT_NOTIFY", label: "超时通知" },
] as const;

export const MESSAGE_TARGET_OPTIONS = [
  { value: "DEPARTMENT", label: "部门" },
  { value: "ROLE", label: "角色" },
  { value: "USER", label: "用户" },
] as const;

export const EXECUTE_MODE_OPTIONS = [
  { value: "AUTOMATIC", label: "自动执行" },
  { value: "MANUAL", label: "手动执行" },
] as const;

export const JUDGMENT_TIMEOUT_DEFAULT = 30;

export function createGuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyConditionExp() {
  return {
    id: createGuid(),
    propCode: "",
    op: null,
    oprand: "",
    delayTime: 0,
    propName: "",
    propUnit: "",
    emergencyRuleConditionId: "",
    emergencyRuleId: "",
    startDelayTime: 0,
    endDelayTime: 0,
  };
}

function emptyRuleCondition() {
  return {
    id: createGuid(),
    deviceProdCategoryCodeConcat: "",
    deviceProdId: undefined,
    conditionType: null,
    deviceEventCode: undefined,
    deviceEventName: "",
    deviceEventType: "",
    deviceProdCategoryName: "",
    deviceProdName: "",
    emergencyRuleConditionExps: [emptyConditionExp()],
  };
}

export function emptyRuleTime(): RuleTimeType {
  return {
    timeType: "ALL",
    timeConditions: "",
    timeList: [{ beginTime: "", endTime: "" }],
  };
}

export function emptyRuleGroup(): RuleGroupType {
  return {
    id: createGuid(),
    emergencyRuleConditions: [emptyRuleCondition()],
    emergencyRuleTime: emptyRuleTime(),
  };
}

export function defaultAlarmAssign(): AlarmAssignValue {
  return {
    actionType: "ALARM_NOTIFY_ACTION",
    enabled: true,
    actionConfig: {
      dutyUser: false,
      targetModifyParams: [{ id: createGuid(), messageTargetNotify: "USER", targetConfig: [] }],
      channelTypes: [],
    },
  };
}

export function defaultAlarmMessage(): AlarmMessageValue {
  return {
    enabled: true,
    actionType: "MESSAGE_NOTIFY_ACTION",
    id: "",
    actionConfig: [
      {
        id: createGuid(),
        delayTimeUnit: "MINUTE",
        duration: 1,
        notifyType: null,
        channelTypes: [],
        targetModifyParams: [{ id: createGuid(), messageTargetNotify: "USER", targetConfig: [] }],
      },
    ],
  };
}

export function defaultAlarmIot(): AlarmIotValue {
  return {
    enabled: true,
    actionType: "IOT_DEVICE_ACTION",
    id: "",
    actionConfig: [],
  };
}

export function defaultAlarmDispose(): EmergencyActionBefore {
  return {
    actionBeforeType: ActionBeforeTypeEnum.ALARM_JUDGMENT,
    enabled: false,
    actionBeforeConfig: {
      systemProcess: false,
      judgmentTimeoutSeconds: JUDGMENT_TIMEOUT_DEFAULT,
    },
  };
}

export function defaultVideoDeviceAction(): EmergencyAction {
  return {
    actionType: "VIDEO_DEVICE_ACTION",
    enabled: true,
    actionConfig: [
      {
        linkageVideoStrategyType: "REF_VIDEO",
        code: "",
        name: "",
        token: "",
        type: "PHOTOGRAPH",
        timeUnit: "SECOND",
        intervalTime: 1,
        durationTime: 2,
        executeMode: "AUTOMATIC",
      },
      {
        linkageVideoStrategyType: "REF_VIDEO",
        code: "",
        name: "",
        token: "",
        type: "VIDEOTAPE",
        time: 30,
        timeUnit: "SECOND",
        executeMode: "AUTOMATIC",
      },
    ],
  };
}

export function emptyEmergencyRuleEditorState(): EmergencyRuleEditorState {
  return {
    id: "",
    name: "",
    alarmLevelId: undefined,
    alarmLevelName: "",
    emergencyEventTypeId: undefined,
    emergencyEventTypeName: "",
    notifyCommandDispatch: false,
    repeatTime: 0,
    repeatTimeUnit: "MINUTE",
    estimatedHandlerTime: 0,
    estimatedHandlerUnit: "MINUTE",
    remark: "",
    turnWarningSound: true,
    appointDevice: true,
    emergencyRuleConditionGroups: [emptyRuleGroup()],
    emergencyRuleConditionDevices: [],
    emergencyActionBeforeList: [defaultAlarmDispose()],
    emergencyActions: [defaultAlarmAssign(), defaultAlarmMessage(), defaultAlarmIot(), defaultVideoDeviceAction()],
  };
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function asArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export function findEmergencyAction<T extends EmergencyAction>(actions: EmergencyAction[], actionType: T["actionType"]): T | undefined {
  return actions.find((item) => item.actionType === actionType) as T | undefined;
}

export function normalizeRuleGroupsForLoad(groups: RuleGroupType[]): RuleGroupType[] {
  return groups.map((group) => ({
    ...group,
    emergencyRuleConditions: group.emergencyRuleConditions.map((condition) => ({
      ...condition,
      id: condition.id || createGuid(),
      emergencyRuleConditionExps: condition.emergencyRuleConditionExps.map((exp) => ({
        ...exp,
        id: exp.id || createGuid(),
      })),
    })),
    emergencyRuleTime: normalizeRuleTimeForLoad(group.emergencyRuleTime),
  }));
}

export function normalizeRuleTimeForLoad(time: RuleTimeType): RuleTimeType {
  if (time.timeConditions && time.timeConditions !== "" && !Array.isArray(time.timeList)) {
    try {
      const parsed = JSON.parse(time.timeConditions) as unknown;
      if (Array.isArray(parsed)) {
        if (time.timeType === "TIME") {
          return { ...time, timeList: parsed as { beginTime: string; endTime: string }[] };
        }
        return { ...time, timeList: parsed as unknown as RuleTimeType["timeList"] };
      }
    } catch {
      // keep original
    }
  }
  return {
    ...time,
    timeList: Array.isArray(time.timeList) ? time.timeList : [{ beginTime: "", endTime: "" }],
  };
}

export function normalizeRuleGroupsForSave(groups: RuleGroupType[]): RuleGroupType[] {
  return groups.map((group) => {
    const time = group.emergencyRuleTime;
    if (time.timeType === "ALL") {
      return {
        ...group,
        emergencyRuleTime: { ...time, timeConditions: "", timeList: [{ beginTime: "", endTime: "" }] },
      };
    }
    const serialized = time.timeConditions || JSON.stringify(Array.isArray(time.timeList) ? time.timeList : []);
    return {
      ...group,
      emergencyRuleTime: {
        ...time,
        timeConditions: serialized,
        timeList: Array.isArray(time.timeList) ? time.timeList : [{ beginTime: "", endTime: "" }],
      },
    };
  });
}

export function resetRuleGroupsForCopy(groups: RuleGroupType[]): RuleGroupType[] {
  return groups.map((group) => ({
    ...group,
    emergencyRuleTime: emptyRuleTime(),
  }));
}

export function parseEmergencyRuleFromApi(raw: unknown, options?: { copy?: boolean }): EmergencyRuleEditorState {
  const data = asRecord(raw);
  const actions = asArray<EmergencyAction>(data.emergencyActions);
  const groups = asArray<RuleGroupType>(data.emergencyRuleConditionGroups).map((group) => ({
    ...group,
    emergencyRuleConditions: asArray<RuleDataType>(group.emergencyRuleConditions).map((condition) => {
      const row = asRecord(condition);
      return {
        ...condition,
        // 不同应用的 emergency-rule DTO 同时存在 deviceProd* 与 deviceProduct* 两套字段。
        deviceProdCategoryName: String(row.deviceProdCategoryName ?? row.deviceProductCategoryName ?? row.productCategoryName ?? ""),
        deviceProdName: String(row.deviceProdName ?? row.deviceProductName ?? row.productName ?? ""),
        deviceEventName: String(row.deviceEventName ?? row.eventName ?? ""),
      };
    }),
  }));
  const loadedGroups = groups.length ? normalizeRuleGroupsForLoad(groups) : [emptyRuleGroup()];
  const disposeList = asArray<EmergencyActionBefore>(data.emergencyActionBeforeList);

  return {
    id: options?.copy ? "" : String(data.id || ""),
    name: String(data.name || ""),
    alarmLevelId: data.alarmLevelId != null ? String(data.alarmLevelId) : undefined,
    alarmLevelName: String(data.alarmLevelName ?? ""),
    emergencyEventTypeId: data.emergencyEventTypeId != null ? String(data.emergencyEventTypeId) : undefined,
    emergencyEventTypeName: String(data.emergencyEventTypeName ?? ""),
    notifyCommandDispatch: data.notifyCommandDispatch === true,
    repeatTime: Number(data.repeatTime ?? 0),
    repeatTimeUnit: String(data.repeatTimeUnit || "MINUTE"),
    estimatedHandlerTime: Number(data.estimatedHandlerTime ?? 0),
    estimatedHandlerUnit: String(data.estimatedHandlerUnit || "MINUTE"),
    remark: String(data.remark || ""),
    turnWarningSound: data.turnWarningSound !== false,
    appointDevice: data.appointDevice !== false,
    emergencyRuleConditionGroups: options?.copy ? resetRuleGroupsForCopy(loadedGroups) : loadedGroups,
    emergencyRuleConditionDevices: asArray(data.emergencyRuleConditionDevices).map((item) => {
      const row = asRecord(item);
      return {
        ...item,
        deviceId: String(row.deviceId ?? row.id ?? ""),
        deviceName: String(row.deviceName ?? row.name ?? ""),
        deviceProdCategoryName: String(row.deviceProdCategoryName ?? row.deviceProductCategoryName ?? row.productCategoryName ?? ""),
        deviceProdName: String(row.deviceProdName ?? row.deviceProductName ?? row.productName ?? ""),
        deviceAreaName: String(row.deviceAreaName ?? row.areaName ?? row.deviceArea ?? ""),
      };
    }),
    emergencyActionBeforeList: disposeList.length
      ? disposeList.map((item) => ({
          actionBeforeType: (item.actionBeforeType as EmergencyActionBeforeType) || ActionBeforeTypeEnum.ALARM_JUDGMENT,
          enabled: item.enabled ?? false,
          actionBeforeConfig: {
            systemProcess: item.actionBeforeConfig?.systemProcess ?? false,
            judgmentTimeoutSeconds: item.actionBeforeConfig?.judgmentTimeoutSeconds ?? JUDGMENT_TIMEOUT_DEFAULT,
          },
        }))
      : [defaultAlarmDispose()],
    emergencyActions: [
      findEmergencyAction(actions, "ALARM_NOTIFY_ACTION") ?? defaultAlarmAssign(),
      findEmergencyAction(actions, "MESSAGE_NOTIFY_ACTION") ?? defaultAlarmMessage(),
      findEmergencyAction(actions, "IOT_DEVICE_ACTION") ?? defaultAlarmIot(),
      findEmergencyAction(actions, "VIDEO_DEVICE_ACTION") ?? defaultVideoDeviceAction(),
    ],
  };
}

export function alarmAssignNotifySceneCode(applicationCode: string): string {
  return `${applicationCode}_ALARM_ASSIGN_NOTIFY`;
}

export function alarmMessageNotifySceneCode(applicationCode: string): string {
  return `${applicationCode}_EMERGENCY_ALARM`;
}

function asNotifyOptions(raw: unknown): { label: string; value: string }[] {
  return Array.isArray(raw)
    ? raw
        .map((item) => {
          const row = asRecord(item);
          const value = String(row.channelCode ?? row.value ?? "");
          const label = String(row.channelName ?? row.label ?? value);
          return value ? { label, value } : null;
        })
        .filter((item): item is { label: string; value: string } => !!item)
    : [];
}

export const ATTENDANCE_APP_CODE = "ATTENDANCE_MANAGEMENT";

export type AreaCascaderOption = { id: string; name: string; children?: AreaCascaderOption[] };

/** 区域树 → Cascader options（fieldNames: name/id） */
export function mapAreaCascaderOptions(raw: unknown): AreaCascaderOption[] {
  const list = Array.isArray(raw) ? raw : unwrapApiList(raw);
  return list
    .map((item) => {
      const row = asRecord(item);
      const id = String(row.id ?? row.key ?? "");
      if (!id) return null;
      const childRaw = row.children;
      const children = childRaw ? mapAreaCascaderOptions(childRaw) : undefined;
      return {
        id,
        name: String(row.name ?? row.title ?? id),
        ...(children?.length ? { children } : {}),
      };
    })
    .filter((item): item is AreaCascaderOption => !!item);
}

/** securitymanagement getApplicationModels → Select options */
export function parseApplicationProductOptions(raw: unknown): { label: string; value: string }[] {
  return unwrapApiList(raw)
    .map((item) => {
      const row = asRecord(item);
      const value = String(row.deviceProdId ?? row.productId ?? row.id ?? "");
      const label = String(row.deviceProdName ?? row.productName ?? row.name ?? value);
      return value ? { label, value } : null;
    })
    .filter((item): item is { label: string; value: string } => !!item);
}

/** IoT 产品属性（可写指令），与 alarm-iot-rule getDeviceCondition 过滤一致 */
export function parseWritableIotProps(raw: unknown): { label: string; value: string; propName: string }[] {
  const list = unwrapApiList(raw);
  const first = list[0] && typeof list[0] === "object" ? (list[0] as Record<string, unknown>) : {};
  return unwrapApiList(first.productPropVoList ?? first.propList)
    .map((item) => {
      const row = asRecord(item);
      if (row.dataWrite === 0) return null;
      const value = String(row.propCode ?? row.code ?? "");
      const propName = String(row.propName ?? row.name ?? value);
      return value ? { label: propName, value, propName } : null;
    })
    .filter((item): item is { label: string; value: string; propName: string } => !!item);
}

/** 扁平化 IoT 设备实例分页记录（alarm-iot 设备弹窗） */
export function flattenIotDeviceInstances(records: unknown[]): Record<string, unknown>[] {
  return records.map((item) => {
    const row = asRecord(item);
    const productInfo = asRecord(row.productInfo);
    const productCategory = asRecord(row.productCategory);
    const area = asRecord(row.area);
    return { ...productInfo, ...productCategory, ...area, ...row };
  });
}

/** 租户是否开通考勤应用（当班人员 checkbox 显隐） */
export function hasAttendanceApplication(raw: unknown): boolean {
  const groups = unwrapApiList(raw);
  for (const group of groups) {
    const apps = unwrapApiList(asRecord(group).applicationPageVOS);
    if (apps.some((app) => asRecord(app).code === ATTENDANCE_APP_CODE)) {
      return true;
    }
  }
  return false;
}

/** 与 iot-center sceneNotificationMethod 对齐：按场景过滤可选通知方式 */
export async function loadSceneNotificationOptions(
  fetchChannels: () => Promise<unknown>,
  fetchScene: () => Promise<unknown>,
): Promise<{ label: string; value: string }[]> {
  const [channelsRaw, sceneRaw] = await Promise.all([fetchChannels(), fetchScene()]);
  const channels = asNotifyOptions(channelsRaw);
  const scene = asRecord(sceneRaw);
  const codes = asArray<string>(scene.channelCodes);
  if (!codes.length) {
    return channels;
  }
  const allowed = new Set(codes.map(String));
  return channels.filter((item) => allowed.has(item.value));
}

export function buildEmergencyRulePayload(input: {
  applicationCode: string;
  basic: EmergencyRuleEditorState;
  ruleGroups: RuleGroupType[];
  alarmDevice: AlarmDeviceValue;
  alarmAssign: AlarmAssignValue;
  alarmMessage: AlarmMessageValue;
  alarmIot: AlarmIotValue;
  alarmDispose: EmergencyActionBefore;
}): Record<string, unknown> {
  const { basic, ruleGroups, alarmDevice, alarmAssign, alarmMessage, alarmIot, alarmDispose } = input;
  return {
    id: basic.id || undefined,
    enabled: true,
    applicationCode: input.applicationCode,
    name: basic.name,
    alarmLevelId: basic.alarmLevelId,
    emergencyEventTypeId: basic.emergencyEventTypeId,
    repeatTime: basic.repeatTime,
    repeatTimeUnit: "MINUTE",
    estimatedHandlerTime: basic.estimatedHandlerTime,
    estimatedHandlerUnit: basic.estimatedHandlerUnit,
    notifyCommandDispatch: basic.notifyCommandDispatch,
    remark: basic.remark,
    turnWarningSound: basic.turnWarningSound,
    appointDevice: alarmDevice.enabled,
    emergencyRuleConditionGroups: normalizeRuleGroupsForSave(ruleGroups),
    emergencyRuleConditionDevices: alarmDevice.emergencyRuleConditions,
    emergencyActionBeforeList: [alarmDispose],
    emergencyActions: [alarmAssign, alarmMessage, alarmIot, defaultVideoDeviceAction()],
  };
}
