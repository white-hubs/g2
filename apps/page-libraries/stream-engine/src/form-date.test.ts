import { expect, it } from "bun:test";

import { formatCurrentDateTime, formatDateRangeLength } from "./form-date";

it("fills current date using the configured format", () => {
  const date = new Date(2026, 8, 24, 9, 5, 3);
  expect(formatCurrentDateTime("yyyy-MM-dd HH:mm:ss", date)).toBe("2026-09-24 09:05:03");
  expect(formatCurrentDateTime("yyyy-MM-dd", date)).toBe("2026-09-24");
});

it("shows a date range duration when configured", () => {
  expect(formatDateRangeLength(["2026-09-24 09:00", "2026-09-25 10:30"])).toBe("1天 1小时 30分钟");
  expect(formatDateRangeLength([])).toBe("先选择时间哦");
});
