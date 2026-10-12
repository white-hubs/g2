import { describe, expect, test } from "bun:test";

import { detectStaticSlotConflicts } from "./detect-slot-conflicts";

describe("detectStaticSlotConflicts", () => {
  test("无冲突时返回空数组", () => {
    const conflicts = detectStaticSlotConflicts([
      { name: "pcChrome", slots: ["chrome.topBar"] },
      { name: "pcAuth", slots: ["auth.login"] },
    ]);
    expect(conflicts).toEqual([]);
  });

  test("两个条目声明同一个 slot 名时报冲突，包含两方名字和 slot 名", () => {
    const conflicts = detectStaticSlotConflicts([
      { name: "pcChrome", slots: ["chrome.topBar"] },
      { name: "pcChromeTenantX", slots: ["chrome.topBar"] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].slot).toBe("chrome.topBar");
    expect(conflicts[0].claimants).toEqual(["pcChrome", "pcChromeTenantX"]);
  });

  test("三个条目里两个冲突、一个不冲突，只报冲突的那组", () => {
    const conflicts = detectStaticSlotConflicts([
      { name: "a", slots: ["s1"] },
      { name: "b", slots: ["s1"] },
      { name: "c", slots: ["s2"] },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].slot).toBe("s1");
  });
});
