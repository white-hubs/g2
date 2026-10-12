import { describe, expect, test } from "bun:test";

import { buildAttendanceOption, buildThemeDistributionOption, buildTrendOption, buildTypeDistributionOption } from "./overview-options";

function seriesTypes(option: unknown): string[] {
  const series = (option as { series?: { type?: string }[] }).series ?? [];
  return series.map((item) => item.type ?? "");
}

describe("secure education overview chart options", () => {
  test("uses two pie series for exam and training type ratios", () => {
    const option = buildTypeDistributionOption([{ name: "员工考核", value: 2 }], [{ name: "员工培训", value: 3 }]);
    expect(seriesTypes(option)).toEqual(["pie", "pie"]);
  });

  test("uses a donut pie for theme ratios", () => {
    const option = buildThemeDistributionOption([{ name: "消防安全", value: 4 }], "考试主题");
    expect(seriesTypes(option)).toEqual(["pie"]);
  });

  test("uses grouped bars for attendance and lines for annual trends", () => {
    const attendance = buildAttendanceOption([{ name: "消防安全", primary: 10, secondary: 2, tertiary: 1 }], "training");
    expect(seriesTypes(attendance)).toEqual(["bar", "bar", "bar"]);

    const trend = buildTrendOption([{ name: "1月", value: 2 }], [{ name: "1月", value: 3 }]);
    expect(seriesTypes(trend)).toEqual(["line", "line"]);
  });
});
