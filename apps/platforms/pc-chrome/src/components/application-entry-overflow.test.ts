import { describe, expect, test } from "bun:test";

import { computeVisibleTabCount } from "./application-entry-overflow";

describe("computeVisibleTabCount", () => {
  test("全部放得下时返回全部数量（不预留 more）", () => {
    expect(computeVisibleTabCount([80, 80, 80], 300, 40)).toBe(3);
  });

  test("放不下时预留 more 宽度，截断可见数量", () => {
    // 可用 200；more=40 → 可分配 160；80+80=160 → 可见 2，第 3 进 more
    expect(computeVisibleTabCount([80, 80, 80], 200, 40)).toBe(2);
  });

  test("连一个都放不下时返回 0（全进 more）", () => {
    expect(computeVisibleTabCount([120, 120], 100, 40)).toBe(0);
  });

  test("空列表 / 非正可用宽度返回 0", () => {
    expect(computeVisibleTabCount([], 200, 40)).toBe(0);
    expect(computeVisibleTabCount([80], 0, 40)).toBe(0);
  });
});
