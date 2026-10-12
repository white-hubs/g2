import { assertDomainModule } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import domainModule from "./domain";

const LEGACY_ENTRIES = [
  "alarmPage",
  "alarmDetail",
  "multipleVideo",
  "patrolLine",
  "addLine",
  "patrolLineDetail",
  "patrolRecord",
  "recordDetail",
  "implementPatro",
  "overView",
  "monitoring",
  "monitoringNew",
  "alarmStatistics",
  "alarmHandelStatistics",
  "alarm/record",
  "patrolStatistics",
  "patrol/record",
  "safetyAnalysis",
  "alarmRulesList",
  "alarmRulesConfig",
  "applicationEquipment",
];

const VIDEO_MONITOR_AUTH_ENTRIES = [
  "permissions",
  "permissions/new",
  "permissions/:id/edit",
  "permissions/:id/detail",
  "ai-inspection/plans",
  "ai-inspection/plans/create",
  "ai-inspection/plans/:id/edit",
  "ai-inspection/tasks",
  "ai-inspection/tasks/:id",
  "ai-inspection/events",
];

describe("@g2-domain/security-monitor domain module", () => {
  test("contract is valid and the real video-monitor-auth routes plus legacy aliases are preserved", () => {
    const asserted = assertDomainModule(domainModule);
    expect(asserted.ok).toBe(true);
    if (!asserted.ok) {
      return;
    }
    const paths = new Set(asserted.module.routes.map((route) => route.path));
    for (const entry of LEGACY_ENTRIES) {
      expect(paths.has(`/d/security-monitor/${entry}`)).toBe(true);
    }
    for (const entry of VIDEO_MONITOR_AUTH_ENTRIES) {
      expect(paths.has(`/d/security-monitor/${entry}`)).toBe(true);
    }
    expect(asserted.module.menuContribution?.[0]?.label).toBe("安防监控");
    const menu = asserted.module.menuContribution?.[0]?.children ?? [];
    expect(menu.map((item) => item.label)).toEqual([
      "AI视频巡检",
      "数据总览",
      "监控权限",
      "视频监控",
      "报警中心",
      "统计分析",
      "消息配置",
      "设备关联",
    ]);
    expect(menu[0]?.children?.map((item) => item.label)).toEqual(["AI-巡检计划", "AI-巡检任务"]);
    expect(menu[3]?.children?.map((item) => item.label)).toEqual(["实时监控", "巡逻路线", "巡逻记录"]);
    expect(menu[4]?.children?.map((item) => item.label)).toEqual(["报警记录", "报警配置"]);
    expect(menu[5]?.children?.map((item) => item.label)).toEqual(["报警统计", "报警处理统计", "巡逻路线统计", "安全分析"]);
  });
});
