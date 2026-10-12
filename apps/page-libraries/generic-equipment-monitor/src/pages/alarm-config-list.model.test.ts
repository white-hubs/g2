import { describe, expect, test } from "bun:test";

import {
  buildAlarmConfigEditorNavigateParams,
  buildAlarmConfigListQuery,
  formatDisableDuration,
  formatDuration,
} from "./alarm-config-list.model";

describe("buildAlarmConfigListQuery", () => {
  test("requires host applicationCode and never invents query-param fallback", () => {
    expect(() => buildAlarmConfigListQuery({ pageNumber: 1, pageSize: 10, applicationCode: "  " })).toThrow(/applicationCode/);
  });

  test("passes host applicationCode into emergency-rule list query", () => {
    expect(
      buildAlarmConfigListQuery({
        pageNumber: 1,
        pageSize: 10,
        applicationCode: "DOORMANAGE",
        keyword: "门",
        alarmLevelId: "lv1",
      }),
    ).toEqual({
      pageNumber: 1,
      pageSize: 10,
      applicationCode: "DOORMANAGE",
      keyword: "门",
      alarmLevelId: "lv1",
    });
  });
});

describe("alarm config display helpers", () => {
  test("formats repeat/handler duration with unit label", () => {
    expect(formatDuration(0, "MINUTE")).toBe("0分钟");
    expect(formatDuration(60, "MINUTE")).toBe("60分钟");
  });

  test("formats disable duration hours", () => {
    expect(formatDisableDuration(null)).toBe("");
    expect(formatDisableDuration(2)).toBe("2 小时");
  });
});

describe("buildAlarmConfigEditorNavigateParams", () => {
  test("builds page-key params without portal paths", () => {
    expect(buildAlarmConfigEditorNavigateParams("add")).toEqual({ type: "add" });
    expect(buildAlarmConfigEditorNavigateParams("detail", "9")).toEqual({ type: "detail", id: "9" });
    expect(buildAlarmConfigEditorNavigateParams("edit", "9")).toEqual({ type: "edit", id: "9" });
    expect(buildAlarmConfigEditorNavigateParams("copy", "9")).toEqual({ type: "edit", id: "9", copy: "1" });
  });
});
