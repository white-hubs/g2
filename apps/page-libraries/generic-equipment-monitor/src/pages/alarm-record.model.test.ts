import { describe, expect, test } from "bun:test";

import { buildAlarmRecordListQuery, canAssignOrHandle, canSuspend, formatHandlerResult } from "./alarm-record.model";

describe("buildAlarmRecordListQuery", () => {
  test("requires host applicationCode", () => {
    expect(() => buildAlarmRecordListQuery({ pageNumber: 1, pageSize: 10, applicationCode: "" })).toThrow(/applicationCode/);
  });

  test("includes filters from host search state", () => {
    expect(
      buildAlarmRecordListQuery({
        pageNumber: 1,
        pageSize: 10,
        applicationCode: "DOORMANAGE",
        keyword: "门",
        alarmStatus: "ALARM_UN_CONFIRMED",
      }),
    ).toMatchObject({
      applicationCode: "DOORMANAGE",
      keyword: "门",
      alarmStatus: "ALARM_UN_CONFIRMED",
    });
  });
});

describe("alarm record row action gates", () => {
  test("assign/handle/suspend follow GEM status rules", () => {
    expect(canAssignOrHandle("ALARM_UN_CONFIRMED")).toBe(true);
    expect(canSuspend("ALARM_PROGRESS_CONFIRMED")).toBe(true);
    expect(canSuspend("ALARM_UN_CONFIRMED")).toBe(false);
    expect(formatHandlerResult("ALARM_ACTUAL")).toBe("实报");
  });
});
