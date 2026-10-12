import { describe, expect, test } from "bun:test";

import { displayValue, pageResult } from "./page-utils";

describe("secure education page utilities", () => {
  test("localizes legacy enum values and booleans", () => {
    expect(displayValue("PUBLISHED")).toBe("已发布");
    expect(displayValue("MISS_EXAM")).toBe("缺考");
    expect(displayValue("SINGLE_CHOICE")).toBe("单选题");
    expect(displayValue(true)).toBe("是");
    expect(displayValue(false)).toBe("否");
  });

  test("keeps Chinese text and extracts named object values", () => {
    expect(displayValue("安全培训")).toBe("安全培训");
    expect(displayValue({ marketName: "中心市场" })).toBe("中心市场");
    expect(displayValue([])).toBe("--");
  });

  test("normalizes paged responses", () => {
    expect(pageResult({ records: [{ id: "1" }], total: 1 })).toEqual({ records: [{ id: "1" }], total: 1 });
    expect(pageResult(undefined)).toEqual({ records: [], total: 0 });
  });
});
