import { describe, expect, test } from "bun:test";

import type { PlatformModule } from "./types";

describe("PlatformModule shape", () => {
  test("label/slots/install 均为可选字段", () => {
    const empty: PlatformModule = {};
    const withLabel: PlatformModule = { label: "x" };
    const withSlots: PlatformModule = { slots: { "chrome.topBar": {} } };
    const withInstall: PlatformModule = { install: async () => {} };
    expect(empty).toBeDefined();
    expect(withLabel.label).toBe("x");
    expect(Object.keys(withSlots.slots ?? {})).toContain("chrome.topBar");
    expect(typeof withInstall.install).toBe("function");
  });
});
