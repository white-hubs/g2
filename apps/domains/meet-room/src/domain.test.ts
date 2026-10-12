import { describe, expect, test } from "bun:test";

import domain from "./domain";

describe("会议室管理领域", () => {
  test("菜单严格保持旧系统顺序", () => {
    const root = domain.menuContribution?.[0];
    expect(root?.children?.map((item) => item.entry)).toEqual(["hys", "sbgl", "hysyy", "yyjl", "yyfx", "ywsz"]);
    expect(root?.children?.[5]?.children?.map((item) => item.entry)).toEqual(["znsb", "hywp", "hylx", "zdsz", "hypzssz", "hyslx"]);
  });

  test("设备详情隐藏路由保持设备监测菜单高亮", () => {
    const detail = domain.routes.find((route) => route.path === "/d/meet-room/equipmentMoitorDetail");
    expect(detail?.meta?.hideInMenu).toBe(true);
    expect(detail?.meta?.activeMenuPath).toBe("/d/meet-room/equipmentMoitorList");
  });
});
