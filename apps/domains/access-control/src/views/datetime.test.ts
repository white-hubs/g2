import { describe, expect, test } from "bun:test";

import { formatDateTime, formatRangeBound } from "./datetime";

describe("access-control datetime helpers", () => {
  test("formatDateTime formats ISO-like strings", () => {
    expect(formatDateTime("2026-01-02T03:04:05")).toMatch(/2026-01-02 03:04:05/);
    expect(formatDateTime("2026-01-02 03:04:05")).toMatch(/2026-01-02 03:04:05/);
    expect(formatDateTime("")).toBe("--");
  });

  test("formatDateTime accepts epoch ms and Jackson date arrays", () => {
    expect(formatDateTime(Date.UTC(2026, 0, 2, 3, 4, 5))).toMatch(/2026-01-02/);
    expect(formatDateTime(1785320795000)).toMatch(/2026-07-29 \d{2}:26:35/);
    expect(formatDateTime([2026, 1, 2, 3, 4, 5])).toBe("2026-01-02 03:04:05");
  });

  test("formatRangeBound uses duck-typed format() when present", () => {
    expect(formatRangeBound({ format: (p: string) => `FMT:${p}` })).toBe("FMT:YYYY-MM-DD HH:mm:ss");
    expect(formatRangeBound(undefined)).toBe("");
  });
});
