import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("@g2-domain/rotating-management domain module", () => {
  test("publishes all rotating-management menu routes", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;
    const paths = asserted.module.routes.map((route) => route.path).filter(Boolean);
    for (const entry of [
      "",
      "equipmentMonitorList",
      "configuration",
      "alarmRecord",
      "alarmConfigList",
      "alarm-handler-sub-config",
      "alarmStatistic",
      "alarmHandelStatistics",
      "alarmAnalysis",
      "applicationEquipment",
      "message-notice",
    ]) {
      expect(paths).toContain(`/d/rotating-management${entry ? `/${entry}` : ""}`);
    }
    expect(asserted.module.menuContribution?.[0]?.label).toBe("动环监控");
    expect(asserted.module.menuContribution?.[0]?.children?.map((item) => item.label)).toEqual([
      "动环中心",
      "动环监测",
      "动环报警",
      "统计分析",
      "动环设备",
      "消息配置",
    ]);
  });

  test("initializes pcUi through the host platform without bundling pc-ui", async () => {
    const platforms: string[] = [];
    const context = createFakeDomainContext({
      loadPlatform: async (name, entry) => {
        platforms.push(`${name}:${entry}`);
        return {};
      },
      ensureClient: async <T>() => ({}) as T,
      loadPageLibrary: async () => ({}),
    });

    await domainModule.install?.(createFakeApp(), context);

    expect(platforms).toContain("pcUi:platform");
    expect(platforms).toContain("pcChart:platform");
    expect(platforms).toContain("pcPlayer:platform");
  });
});
