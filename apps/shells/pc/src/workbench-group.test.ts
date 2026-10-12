import { describe, expect, test } from "bun:test";

import { WORKBENCH_GROUP_KEY, isWorkbenchGroupKey, isWorkbenchPath, prependWorkbenchDisplayGroup } from "./workbench-group";

describe("prependWorkbenchDisplayGroup", () => {
  test("工作台固定插到最前，OUAA 分组 order 顺延", () => {
    expect(
      prependWorkbenchDisplayGroup([
        { key: "g-ops", label: "运维管理", order: 0 },
        { key: "g-internal", label: "内部管理", order: 1 },
      ]),
    ).toEqual([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "g-ops", label: "运维管理", order: 1 },
      { key: "g-internal", label: "内部管理", order: 2 },
    ]);
  });

  test("已有 workbench 时去重再置顶", () => {
    expect(
      prependWorkbenchDisplayGroup([
        { key: "workbench", label: "旧工作台", order: 9 },
        { key: "g1", label: "A", order: 0 },
      ]),
    ).toEqual([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "g1", label: "A", order: 1 },
    ]);
  });
});

describe("isWorkbenchPath / isWorkbenchGroupKey", () => {
  test("识别 /index、/workbench、/d/workbench", () => {
    expect(isWorkbenchPath("/index")).toBe(true);
    expect(isWorkbenchPath("/workbench")).toBe(true);
    expect(isWorkbenchPath("/d/workbench")).toBe(true);
    expect(isWorkbenchPath("/d/workbench/config")).toBe(true);
    expect(isWorkbenchPath("/ops/hazard")).toBe(false);
    expect(isWorkbenchGroupKey("workbench")).toBe(true);
  });
});
