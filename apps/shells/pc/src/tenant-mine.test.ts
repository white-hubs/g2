import { describe, expect, test } from "bun:test";

import { parseOutsideTenants, parseTenantMineList, shouldShowTenantSwitch } from "./tenant-mine";

describe("parseTenantMineList", () => {
  test("兼容直接数组与 { code, data }", () => {
    const row = { id: "1", code: "hq", name: "总部", enabled: true };
    expect(parseTenantMineList([row])).toEqual([{ id: "1", code: "hq", name: "总部", enabled: true }]);
    expect(parseTenantMineList({ code: 200, data: [row] })).toEqual([{ id: "1", code: "hq", name: "总部", enabled: true }]);
  });

  test("enabled 缺省视为 true；显式 false 为禁用", () => {
    expect(parseTenantMineList([{ code: "a", name: "A" }])[0]?.enabled).toBe(true);
    expect(parseTenantMineList([{ code: "b", name: "B", enabled: false }])[0]?.enabled).toBe(false);
  });

  test("code 为 number、id 为 string 时仍能解析（真实 /tenant/mine 响应）", () => {
    expect(
      parseTenantMineList({
        code: 200,
        data: [{ id: "1527470128244015106", code: 58197260, name: "安全指挥调度系统", enabled: true }],
      }),
    ).toEqual([
      {
        id: "1527470128244015106",
        code: "58197260",
        name: "安全指挥调度系统",
        enabled: true,
      },
    ]);
  });
});

describe("parseOutsideTenants / shouldShowTenantSwitch", () => {
  test("解析 feature.outsideTenants", () => {
    expect(parseOutsideTenants({ outsideTenants: [{ id: "x", name: "外链", path: "https://x.test" }] })).toEqual([
      { id: "x", name: "外链", path: "https://x.test" },
    ]);
  });

  test("仅 1 个内部租户且无外链时不展示组织切换", () => {
    expect(shouldShowTenantSwitch([{ id: "1", code: "a", name: "A", enabled: true }], [])).toBe(false);
    expect(
      shouldShowTenantSwitch(
        [
          { id: "1", code: "a", name: "A", enabled: true },
          { id: "2", code: "b", name: "B", enabled: true },
        ],
        [],
      ),
    ).toBe(true);
  });
});
