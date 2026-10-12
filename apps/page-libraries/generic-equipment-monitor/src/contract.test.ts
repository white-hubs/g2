import { describe, expect, test } from "bun:test";

import { GEM_ACTION_KEYS, GEM_PAGE_KEYS, contractInfo } from "./contract";

describe("generic-equipment-monitor public contract", () => {
  test("page and action keys remain non-empty and unique", () => {
    for (const values of [Object.values(GEM_PAGE_KEYS), Object.values(GEM_ACTION_KEYS)]) {
      expect(values.every((value) => value.length > 0)).toBe(true);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  test("publishes contract major 1 for runtime hosts", () => {
    expect(contractInfo).toEqual({ name: "generic-equipment-monitor", major: 1 });
  });
});
