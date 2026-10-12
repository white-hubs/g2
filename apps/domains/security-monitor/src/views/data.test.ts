import { describe, expect, test } from "bun:test";

import { normalizePage, normalizeRecord } from "./data";

describe("security-monitor response normalization", () => {
  test("supports direct and wrapped pages", () => {
    expect(normalizePage({ records: [{ id: 1 }], total: 8 })).toEqual({ records: [{ id: 1 }], total: 8 });
    expect(normalizePage({ data: { data: { list: [{ id: 2 }], total: 1 } } })).toEqual({ records: [{ id: 2 }], total: 1 });
  });

  test("unwraps nested record responses", () => {
    expect(normalizeRecord({ data: { data: { id: "line-1" } } })).toEqual({ id: "line-1" });
  });
});
