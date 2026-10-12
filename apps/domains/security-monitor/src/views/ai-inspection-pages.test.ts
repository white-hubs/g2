import { describe, expect, test } from "bun:test";

import { formatInspectionExecutionPlan } from "./ai-inspection-format";

describe("formatInspectionExecutionPlan", () => {
  test("renders a daily cycle like ghcloud", () => {
    expect(
      formatInspectionExecutionPlan({
        id: "1",
        name: "daily",
        executionMode: "CYCLE",
        cycleType: "EVERY_DAY",
        executeTime: "09:00:00",
      }),
    ).toBe("循环 每日 09:00:00");
  });

  test("renders a one-time plan without the migration artifact", () => {
    expect(
      formatInspectionExecutionPlan({
        id: "2",
        name: "once",
        executionMode: "ONCE",
        startTime: "2026-06-24T10:28:13",
      }),
    ).toBe("单次 2026-06-24 10:28:13");
  });

  test("renders weekly cycle values with Chinese labels", () => {
    expect(
      formatInspectionExecutionPlan({
        id: "3",
        name: "weekly",
        executionMode: "CYCLE",
        cycleType: "EVERY_WEEK",
        cycleValues: "MON,WED",
        executeTime: "08:30",
      }),
    ).toBe("循环 每周 周一、周三 08:30");
  });
});
