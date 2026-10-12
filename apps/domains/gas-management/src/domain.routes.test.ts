import { assertDomainModule, createFakeApp, createFakeDomainContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("gas-management OUAA route tree", () => {
  test("initializes pcUi through the host platform without bundling a local fallback", async () => {
    const loadedPlatforms: string[] = [];
    const context = createFakeDomainContext({
      loadPlatform: async (name, exposedPath) => {
        loadedPlatforms.push(`${name}:${exposedPath}`);
        return {};
      },
    });

    await domainModule.install?.(createFakeApp(), context, {});

    expect(loadedPlatforms).toEqual(["pcUi:platform", "pcChart:platform", "pcPlayer:platform"]);
  });

  test("keeps the supplied order and maps handler statistics to the shared user mode", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;
    expect(asserted.module.menuContribution).toEqual([
      { label: "数据总览", iconKey: "gas-management", entry: "overView", path: "/d/gas-management/overView" },
      { label: "用气监测", iconKey: "gas-management", entry: "equipmentMonitorList", path: "/d/gas-management/equipmentMonitorList" },
      {
        label: "用气报警",
        iconKey: "gas-management",
        children: [
          { label: "报警记录", entry: "alarmRecord", path: "/d/gas-management/alarmRecord" },
          { label: "报警配置", entry: "alarmConfigList", path: "/d/gas-management/alarmConfigList" },
        ],
      },
      {
        label: "统计分析",
        iconKey: "gas-management",
        children: [
          { label: "报警统计", entry: "alarmStatistic", path: "/d/gas-management/alarmStatistic" },
          { label: "报警处理统计", entry: "alarmHandelStatistics", path: "/d/gas-management/alarmHandelStatistics" },
        ],
      },
      { label: "用气设备", iconKey: "gas-management", entry: "applicationEquipment", path: "/d/gas-management/applicationEquipment" },
    ]);
  });
});
