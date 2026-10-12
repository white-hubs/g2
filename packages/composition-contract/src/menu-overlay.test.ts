import { describe, expect, test } from "bun:test";

import { assertMenuOverlay, mergeMenuContribution } from "./menu-overlay";
import type { MenuContributionNode } from "./types";

const defaultTree: MenuContributionNode[] = [
  {
    label: "监测",
    children: [
      { label: "总览", functionCode: "GEM_OVERVIEW", entry: "overView" },
      { label: "报警", functionCode: "GEM_ALARM", entry: "alarmRecord" },
    ],
  },
];

describe("mergeMenuContribution", () => {
  test("无 overlay 时返回与默认菜单等价的树且不共享引用", () => {
    const merged = mergeMenuContribution(defaultTree, undefined);
    expect(merged).toEqual(defaultTree);
    expect(merged).not.toBe(defaultTree);
    expect(merged[0]).not.toBe(defaultTree[0]);
  });

  test("按 code 改 alias 且保留 entry 绑定", () => {
    const asserted = assertMenuOverlay([{ code: "GEM_ALARM", alias: "报警记录" }]);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) {
      return;
    }
    const merged = mergeMenuContribution(defaultTree, asserted.overlay);
    expect(merged[0]?.children?.find((c) => c.functionCode === "GEM_ALARM")).toEqual({
      label: "报警记录",
      functionCode: "GEM_ALARM",
      entry: "alarmRecord",
    });
  });

  test("未知 code 不新增可导航叶子", () => {
    const merged = mergeMenuContribution(defaultTree, [{ code: "UNKNOWN", alias: "幽灵" }]);
    expect(JSON.stringify(merged)).not.toContain("幽灵");
    expect(merged).toEqual(mergeMenuContribution(defaultTree, undefined));
  });

  test("hidden 从树中移除该 code 节点", () => {
    const merged = mergeMenuContribution(defaultTree, [{ code: "GEM_OVERVIEW", hidden: true }]);
    expect(merged[0]?.children?.map((c) => c.functionCode)).toEqual(["GEM_ALARM"]);
  });
});

describe("assertMenuOverlay", () => {
  test("拒绝携带 path 的 overlay 节点", () => {
    const result = assertMenuOverlay([{ code: "GEM_OVERVIEW", path: "/d/x/overView" }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("path"))).toBe(true);
    }
  });
});
