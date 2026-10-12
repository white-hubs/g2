import { describe, expect, test } from "bun:test";

import domain from "./domain";

describe("safety-personnel-management OUAA migration", () => {
  test("keeps every legacy page under the local /d route", () => {
    const route = domain.routes[0];
    const paths = (route?.children ?? []).map((child) => child.path);
    expect(paths).toEqual([
      "",
      "home",
      "personnel",
      "committee",
      "certificates",
      "config/cert",
      "config/org",
      "key-personnel",
      "key-personnel/alarm-record",
      "key-personnel/alarm-detail",
      "key-personnel/alarm-config",
      "key-personnel/alarm-config/edit",
      "key-personnel/track",
      "key-personnel/equipment",
      "key-personnel/statistics",
    ]);
  });

  test("menu preserves the production safety personnel hierarchy", () => {
    const children = domain.menuContribution?.[0]?.children ?? [];
    expect(children[0]).toMatchObject({ label: "首页", path: "/d/safety-personnel-management/home" });
    expect(children.slice(1).map((item) => item.label)).toEqual(["安全人员", "重点人员"]);
    expect(children[1]?.children?.map((item) => item.label)).toEqual(["人员管理", "安委会管理", "证书管理", "证书配置", "组织配置"]);
    expect(children[2]?.children?.map((item) => item.label)).toEqual([
      "重点人员",
      "报警记录",
      "报警配置",
      "行为轨迹",
      "设备关联",
      "数据分析",
    ]);
  });
});
