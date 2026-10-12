import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

describe("intruder-alarm OUAA route tree", () => {
  test("keeps the supplied menu order and hosts every shared page in this domain", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) return;

    expect(asserted.module.menuContribution).toEqual([
      { label: "入侵中心", iconKey: "intruder-alarm", entry: "overView", path: "/d/intruder-alarm/overView" },
      {
        label: "设备监测",
        iconKey: "intruder-alarm",
        children: [
          { label: "二维组态", entry: "configuration", path: "/d/intruder-alarm/configuration" },
          { label: "入侵监测", entry: "equipmentMonitorList", path: "/d/intruder-alarm/equipmentMonitorList" },
        ],
      },
      {
        label: "入侵报警",
        iconKey: "intruder-alarm",
        children: [
          { label: "报警记录", entry: "alarmRecord", path: "/d/intruder-alarm/alarmRecord" },
          { label: "报警配置", entry: "alarmConfigList", path: "/d/intruder-alarm/alarmConfigList" },
        ],
      },
      {
        label: "统计分析",
        iconKey: "intruder-alarm",
        children: [
          { label: "报警分析", entry: "alarmAnalysis", path: "/d/intruder-alarm/alarmAnalysis" },
          { label: "报警统计", entry: "alarmStatistic", path: "/d/intruder-alarm/alarmStatistic" },
        ],
      },
      { label: "入侵报警设备", iconKey: "intruder-alarm", entry: "applicationEquipment", path: "/d/intruder-alarm/applicationEquipment" },
    ]);
    expect(asserted.module.routes.map((route) => route.path)).toEqual(
      expect.arrayContaining([
        "/d/intruder-alarm/equipmentMonitorDetail",
        "/d/intruder-alarm/alarmDetail",
        "/d/intruder-alarm/alarmConfigureAdd",
      ]),
    );
  });
});
