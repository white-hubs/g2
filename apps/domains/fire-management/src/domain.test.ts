import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/fire-management domain module", () => {
  test("routes and menuContribution pass contract assert", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;
    const paths = asserted.module.routes.map((r) => r.path).filter(Boolean);
    expect(paths).toContain("/d/fire-management");
    expect(paths).toContain("/d/fire-management/fire-host-control");
    expect(paths).toContain("/d/fire-management/fire-device-list");
    expect(paths).toContain("/d/fire-management/fire-device-detail");
    expect(paths).toContain("/d/fire-management/fire-host-config");
    expect(paths).toContain("/d/fire-management/fire-point-management");
    expect(paths).toContain("/d/fire-management/fire-event-records");
    expect(paths).toContain("/d/fire-management/alarm-record");
    expect(paths).toContain("/d/fire-management/alarm-config");
    expect(paths).toContain("/d/fire-management/alarm-handle-statistics");
    expect(paths).toContain("/d/fire-management/fire-analysis");
    expect(paths).toContain("/d/fire-management/overview");
    expect(paths).toContain("/d/fire-management/alarm-statistic");
    expect(paths).toContain("/d/fire-management/message-notice");
    expect(paths).toContain("/d/fire-management/equipment-association");
    const equipmentRoute = asserted.module.routes.find((route) => route.path === "/d/fire-management/equipment-association");
    expect(equipmentRoute?.component).toBeDefined();
    const menu = asserted.module.menuContribution?.[0]?.children ?? [];
    expect(menu.map((item) => item.label)).toEqual(["设备监测", "主机管理", "消防报警", "统计分析", "业务配置"]);
    expect(menu[1]?.children?.map((item) => item.label)).toEqual(["主机配置", "远程控制"]);
    expect(menu[2]?.children?.map((item) => item.label)).toEqual(["报警记录", "报警配置"]);
    expect(menu[3]?.children?.map((item) => item.label)).toEqual(["处理统计", "消防分析", "数据总览", "报警统计"]);
    expect(menu[4]?.children?.map((item) => item.label)).toEqual(["消息配置", "设备关联"]);
  });
});
