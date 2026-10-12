import { expect, test } from "bun:test";

import { currentMonthRange, formatDateTime } from "./date";

test("数值时间戳按本地时区显示，筛选区间从当月一号开始", () => {
  const date = new Date(2026, 8, 20, 16, 48, 7);
  expect(formatDateTime(date.getTime())).toBe("2026-09-20 16:48:07");
  expect(currentMonthRange(date)).toEqual(["2026-09-01", "2026-09-20"]);
});

test("未确认和未完成时间的 null 值显示空值", () => {
  expect(formatDateTime(null)).toBe("--");
  expect(formatDateTime(undefined)).toBe("--");
  expect(new Date(formatDateTime(0).replace(" ", "T")).getTime()).toBe(0);
});
