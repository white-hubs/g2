import { describe, expect, test } from "bun:test";

import { normalizeSelectOptions } from "./form-options";

describe("normalizeSelectOptions", () => {
  test("converts legacy string options used by stream-engine form designer", () => {
    expect(normalizeSelectOptions(["已修复", "未修复"])).toEqual([
      { label: "已修复", value: "已修复" },
      { label: "未修复", value: "未修复" },
    ]);
  });

  test("keeps object options", () => {
    expect(
      normalizeSelectOptions([
        { label: "A", value: "a" },
        { name: "B", id: "b" },
      ]),
    ).toEqual([
      { label: "A", value: "a" },
      { label: "B", value: "b" },
    ]);
  });

  test("ignores invalid entries", () => {
    expect(normalizeSelectOptions([null, undefined, {}, "ok"])).toEqual([{ label: "ok", value: "ok" }]);
  });
});
