import { describe, expect, test } from "vitest";

import { colorForMenuIcon } from "./menu-item-icon";

describe("colorForMenuIcon", () => {
  test("已知 iconKey 返回固定色", () => {
    expect(colorForMenuIcon("hazard", "隐患排查")).toBe("#f5222d");
    expect(colorForMenuIcon("workbench", "工作台")).toBe("#1578ff");
  });

  test("未知 iconKey / 仅 label 时仍返回调色板中的色值", () => {
    const a = colorForMenuIcon(undefined, "自定义菜单");
    const b = colorForMenuIcon("unknown-key", "自定义菜单");
    expect(a).toMatch(/^#[0-9a-f]{6}$/iu);
    expect(b).toMatch(/^#[0-9a-f]{6}$/iu);
  });

  test("同一 label 多次调用颜色稳定", () => {
    expect(colorForMenuIcon(undefined, "工单中心")).toBe(colorForMenuIcon(undefined, "工单中心"));
  });
});
