import { describe, expect, test } from "bun:test";

import { formatAlarmTime, normalizeAlarmPage } from "./normalize-page";

describe("normalizeAlarmPage", () => {
  test("unwraps data.list + total into records", () => {
    expect(normalizeAlarmPage({ data: { list: [{ id: 1 }], total: 1 } })).toEqual({
      records: [{ id: 1 }],
      total: 1,
      pages: 1,
    });
  });
});

describe("formatAlarmTime", () => {
  test("formats epoch ms", () => {
    expect(formatAlarmTime(1_700_000_000_000)).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });
});
