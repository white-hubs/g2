import { describe, expect, test } from "bun:test";

import {
  alarmAssignNotifySceneCode,
  alarmMessageNotifySceneCode,
  buildEmergencyRulePayload,
  defaultAlarmAssign,
  defaultAlarmDispose,
  defaultAlarmIot,
  defaultAlarmMessage,
  emptyRuleGroup,
  hasAttendanceApplication,
  loadSceneNotificationOptions,
  mapAreaCascaderOptions,
  normalizeRuleGroupsForSave,
  parseEmergencyRuleFromApi,
  parseWritableIotProps,
} from "./alarm-config.model";

describe("parseEmergencyRuleFromApi", () => {
  test("hydrates sections from emergency-rule payload", () => {
    const raw = {
      id: "rule-1",
      name: "测试规则",
      alarmLevelId: "lv1",
      repeatTime: 5,
      repeatTimeUnit: "HOUR",
      appointDevice: true,
      emergencyRuleConditionGroups: [
        {
          id: "g1",
          emergencyRuleConditions: [{ id: "c1", conditionType: "DEVICE_EVENT_CONDITION", emergencyRuleConditionExps: [] }],
          emergencyRuleTime: { timeType: "ALL", timeConditions: "", timeList: [] },
        },
      ],
      emergencyRuleConditionDevices: [{ id: "d1", deviceId: "dev1", deviceName: "设备A", conditionType: "DEVICE" }],
      emergencyActionBeforeList: [
        { actionBeforeType: "ALARM_JUDGMENT", enabled: true, actionBeforeConfig: { systemProcess: false, judgmentTimeoutSeconds: 60 } },
      ],
      emergencyActions: [
        {
          actionType: "ALARM_NOTIFY_ACTION",
          enabled: true,
          actionConfig: { dutyUser: false, channelTypes: ["SMS"], targetModifyParams: [] },
        },
        { actionType: "MESSAGE_NOTIFY_ACTION", enabled: false, id: "m1", actionConfig: [] },
        { actionType: "IOT_DEVICE_ACTION", enabled: true, id: "i1", actionConfig: [{ id: "iot1", name: "联动设备" }] },
      ],
    };
    const state = parseEmergencyRuleFromApi(raw);
    expect(state.id).toBe("rule-1");
    expect(state.name).toBe("测试规则");
    expect(state.emergencyRuleConditionGroups).toHaveLength(1);
    expect(state.emergencyRuleConditionDevices).toHaveLength(1);
    expect(state.emergencyActionBeforeList[0]?.enabled).toBe(true);
    expect(state.emergencyActions).toHaveLength(4);
  });

  test("copy mode clears id and resets rule time", () => {
    const state = parseEmergencyRuleFromApi(
      {
        id: "rule-1",
        emergencyRuleConditionGroups: [
          {
            id: "g1",
            emergencyRuleConditions: [],
            emergencyRuleTime: { timeType: "WEEK", timeConditions: '["1"]', timeList: [] },
          },
        ],
      },
      { copy: true },
    );
    expect(state.id).toBe("");
    expect(state.emergencyRuleConditionGroups[0]?.emergencyRuleTime.timeType).toBe("ALL");
  });
});

describe("buildEmergencyRulePayload", () => {
  test("matches iot-center submit shape", () => {
    const basic = {
      id: "rule-1",
      name: "规则A",
      alarmLevelId: "lv1",
      emergencyEventTypeId: undefined,
      repeatTime: 10,
      repeatTimeUnit: "MINUTE",
      estimatedHandlerTime: 30,
      estimatedHandlerUnit: "MINUTE",
      remark: "备注",
      turnWarningSound: true,
      appointDevice: true,
      emergencyRuleConditionGroups: [emptyRuleGroup()],
      emergencyRuleConditionDevices: [],
      emergencyActionBeforeList: [defaultAlarmDispose()],
      emergencyActions: [defaultAlarmAssign(), defaultAlarmMessage(), defaultAlarmIot()],
    };
    const payload = buildEmergencyRulePayload({
      applicationCode: "DOORMANAGE",
      basic,
      ruleGroups: [emptyRuleGroup()],
      alarmDevice: {
        enabled: true,
        emergencyRuleConditions: [
          {
            id: "d1",
            deviceId: "dev1",
            deviceName: "门1",
            conditionType: "DEVICE",
            deviceAreaId: "",
            deviceAreaName: "",
            deviceProdCategoryCodeConcat: undefined,
            deviceProdCategoryName: undefined,
            deviceProdId: undefined,
            deviceProdName: undefined,
          },
        ],
      },
      alarmAssign: defaultAlarmAssign(),
      alarmMessage: defaultAlarmMessage(),
      alarmIot: defaultAlarmIot(),
      alarmDispose: defaultAlarmDispose(),
    });
    expect(payload.applicationCode).toBe("DOORMANAGE");
    expect(payload.name).toBe("规则A");
    expect(payload.appointDevice).toBe(true);
    expect(payload.emergencyRuleConditionDevices).toHaveLength(1);
    expect(Array.isArray(payload.emergencyActions)).toBe(true);
    expect((payload.emergencyActions as unknown[]).length).toBe(4);
    expect((payload.emergencyActionBeforeList as unknown[]).length).toBe(1);
  });
});

describe("normalizeRuleGroupsForSave", () => {
  test("serializes timeConditions for non-ALL periods", () => {
    const groups = normalizeRuleGroupsForSave([
      {
        id: "g1",
        emergencyRuleConditions: [],
        emergencyRuleTime: {
          timeType: "WEEK",
          timeConditions: "",
          timeList: ["1", "2"] as unknown as { beginTime: string; endTime: string }[],
        },
      },
    ]);
    expect(groups[0]?.emergencyRuleTime.timeConditions).toBe('["1","2"]');
  });
});

describe("scene notification helpers", () => {
  test("builds scene codes from applicationCode prop", () => {
    expect(alarmAssignNotifySceneCode("DOORMANAGE")).toBe("DOORMANAGE_ALARM_ASSIGN_NOTIFY");
    expect(alarmMessageNotifySceneCode("DOORMANAGE")).toBe("DOORMANAGE_EMERGENCY_ALARM");
  });

  test("filters channels by scene selection", async () => {
    const options = await loadSceneNotificationOptions(
      async () => [
        { channelCode: "SMS", channelName: "短信" },
        { channelCode: "APP", channelName: "应用内" },
      ],
      async () => ({ channelCodes: ["SMS"] }),
    );
    expect(options).toEqual([{ label: "短信", value: "SMS" }]);
  });
});

describe("alarm editor device/iot helpers", () => {
  test("mapAreaCascaderOptions builds nested area tree", () => {
    const tree = mapAreaCascaderOptions([{ id: "a1", name: "A区", children: [{ id: "a1-1", name: "A1" }] }]);
    expect(tree[0]?.id).toBe("a1");
    expect(tree[0]?.children?.[0]?.name).toBe("A1");
  });

  test("parseWritableIotProps filters dataWrite=0", () => {
    const props = parseWritableIotProps([
      {
        productPropVoList: [
          { propCode: "p1", propName: "开关", dataWrite: 1 },
          { propCode: "p2", propName: "只读", dataWrite: 0 },
        ],
      },
    ]);
    expect(props).toEqual([{ label: "开关", value: "p1", propName: "开关" }]);
  });

  test("hasAttendanceApplication detects ATTENDANCE_MANAGEMENT", () => {
    expect(hasAttendanceApplication([{ applicationPageVOS: [{ code: "DOORMANAGE" }, { code: "ATTENDANCE_MANAGEMENT" }] }])).toBe(true);
    expect(hasAttendanceApplication([{ applicationPageVOS: [{ code: "DOORMANAGE" }] }])).toBe(false);
  });
});
