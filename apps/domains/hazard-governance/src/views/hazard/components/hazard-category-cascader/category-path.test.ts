import type { HazardCategoryTreeVO } from "@g2-contract/hazard-governance";
import { describe, expect, test } from "bun:test";

import { normalizeHazardCategoryTree, resolveHazardCategoryPath } from "./category-path";

const categoryTree: HazardCategoryTreeVO[] = [
  {
    id: "1",
    name: "设备设施",
    children: [
      {
        id: "11",
        name: "特种设备",
        children: [{ id: "111", name: "电梯" }],
      },
    ],
  },
];

describe("resolveHazardCategoryPath", () => {
  test("根据末级分类 ID 解析完整回显路径", () => {
    expect(resolveHazardCategoryPath(["111"], categoryTree)).toEqual(["1", "11", "111"]);
  });

  test("兼容接口运行时返回数字 ID", () => {
    const numericTree = [
      {
        id: 1,
        name: "设备设施",
        children: [
          {
            id: 11,
            name: "特种设备",
            children: [{ id: 111, name: "电梯" }],
          },
        ],
      },
    ] as unknown as HazardCategoryTreeVO[];
    const normalizedTree = normalizeHazardCategoryTree(numericTree);

    expect(resolveHazardCategoryPath(["111"], normalizedTree)).toEqual(["1", "11", "111"]);
    expect(normalizedTree[0].children?.[0].children?.[0].id).toBe("111");
  });
});
