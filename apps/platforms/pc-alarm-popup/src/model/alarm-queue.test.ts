import { describe, expect, test } from "bun:test";

import {
  addAlarmToQueue,
  buildAlarmDescription,
  createEmptyQueue,
  getCurrentAlarm,
  nextAlarmIndex,
  normalizeAlarmForDetail,
  prevAlarmIndex,
  shouldRefreshAlarmDetail,
} from "./alarm-queue";

describe("alarm queue model", () => {
  test("add / prev / next", () => {
    let state = createEmptyQueue();
    ({ state } = addAlarmToQueue(state, { businessKey: "a1", alarmEventName: "门开" }));
    ({ state } = addAlarmToQueue(state, { businessKey: "a2", alarmEventName: "烟感" }));
    expect(state.items).toHaveLength(2);
    expect(getCurrentAlarm(state)?.businessKey).toBe("a1");
    state = nextAlarmIndex(state);
    expect(getCurrentAlarm(state)?.businessKey).toBe("a2");
    state = prevAlarmIndex(state);
    expect(getCurrentAlarm(state)?.businessKey).toBe("a1");
    state = prevAlarmIndex(state);
    expect(state.currentIndex).toBe(0);
  });

  test("normalizeAlarmForDetail fills id and status", () => {
    const alarm = normalizeAlarmForDetail({ businessKey: "bk-9", businessStatus: "OPEN" });
    expect(alarm.id).toBe("bk-9");
    expect(alarm.alarmStatus).toBe("OPEN");
  });

  test("shouldRefreshAlarmDetail branches", () => {
    expect(shouldRefreshAlarmDetail({ applicationCode: "DOORMANAGE" })).toBe(true);
    expect(shouldRefreshAlarmDetail({ applicationCode: "DOORMANAGE", alarmSnapshot: "{}" })).toBe(false);
    expect(shouldRefreshAlarmDetail({ applicationCode: "RESERVE_MONITORING", alarmSnapshot: "{}" })).toBe(false);
  });

  test("buildAlarmDescription for normal and storage archive", () => {
    expect(
      buildAlarmDescription({
        businessKey: "1",
        alarmTargetName: "门1",
        areaName: "A区",
        alarmEventName: "非法闯入",
      }),
    ).toContain("非法闯入");
    expect(
      buildAlarmDescription({
        businessKey: "2",
        applicationCode: "RESERVE_MONITORING",
        msgContent: "储量告警",
      }),
    ).toBe("储量告警");
  });
});
