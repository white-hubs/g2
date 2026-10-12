import type { FumigationOperationClient } from "@g2-client/fumigation-operation/client";
import type { DomainModule } from "@g2-composition/contract";

import { installFumigationContext } from "./domain-context";
import { hostFumigationGemPage } from "./gem-page-host";

const BASE = "/d/fumigation-operation";

const domain: DomainModule = {
  routes: [
    { path: BASE, name: "fumigation-operation-home", meta: { title: "熏蒸作业" }, redirect: `${BASE}/works` },
    {
      path: `${BASE}/works`,
      name: "fumigation-work-list",
      meta: { title: "作业列表" },
      component: () => import("./views/fumigation/work-list").then((module) => module.FumigationWorkList),
    },
    {
      path: `${BASE}/works/create`,
      name: "fumigation-work-create",
      meta: { title: "新增熏蒸", hideInMenu: true, activeMenuPath: `${BASE}/works` },
      component: () => import("./views/fumigation/work-form").then((module) => module.FumigationWorkCreate),
    },
    {
      path: `${BASE}/approval`,
      name: "fumigation-approval",
      meta: { title: "审批页面", hideInMenu: true, activeMenuPath: `${BASE}/works` },
      component: () => import("./views/fumigation/approval-detail").then((module) => module.FumigationApprovalDetail),
    },
    {
      path: `${BASE}/precheck`,
      name: "fumigation-precheck",
      meta: { title: "三步校验", hideInMenu: true, activeMenuPath: `${BASE}/works` },
      component: () => import("./views/fumigation/precheck").then((module) => module.FumigationPrecheck),
    },
    {
      path: `${BASE}/monitor`,
      name: "fumigation-monitor",
      meta: { title: "监护看板", hideInMenu: true, activeMenuPath: `${BASE}/works` },
      component: () => import("./views/fumigation/monitor-board").then((module) => module.FumigationMonitorBoard),
    },
    {
      path: `${BASE}/realtime`,
      name: "fumigation-realtime",
      meta: { title: "实时态势" },
      component: () => import("./views/fumigation/realtime-situation").then((module) => module.FumigationRealtimeSituation),
    },
    {
      path: `${BASE}/archive`,
      name: "fumigation-archive",
      meta: { title: "合规档案", hideInMenu: true, activeMenuPath: `${BASE}/works` },
      component: () => import("./views/fumigation/compliance-archive").then((module) => module.FumigationComplianceArchive),
    },
    {
      path: `${BASE}/archive/document/:archiveId`,
      name: "fumigation-archive-document",
      meta: { title: "合规档案", hideInMenu: true, activeMenuPath: `${BASE}/works` },
      component: () => import("./views/fumigation/archive-document").then((module) => module.FumigationArchiveDocumentPage),
    },
    {
      path: `${BASE}/alarmRecord`,
      name: "fumigation-alarm-record",
      meta: { title: "报警记录" },
      component: () => hostFumigationGemPage("AlarmRecord"),
    },
    {
      path: `${BASE}/alarmDetail`,
      name: "fumigation-alarm-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarmRecord` },
      component: () => hostFumigationGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: `${BASE}/alarmConfigList`,
      name: "fumigation-alarm-config",
      meta: { title: "报警配置" },
      component: () => hostFumigationGemPage("AlarmConfigList"),
    },
    {
      path: `${BASE}/alarmConfigureAdd`,
      name: "fumigation-alarm-config-form",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarmConfigList` },
      component: () => hostFumigationGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
    },
    {
      path: `${BASE}/alarmStatistic`,
      name: "fumigation-alarm-statistic",
      meta: { title: "报警统计" },
      component: () => hostFumigationGemPage("AlarmStatistic", { pageProps: { mode: "status", title: "报警统计" } }),
    },
    {
      path: `${BASE}/alarmHandelStatistics`,
      name: "fumigation-alarm-handle-statistic",
      meta: { title: "报警处理统计" },
      component: () => hostFumigationGemPage("AlarmHandelStatistics"),
    },
    {
      path: `${BASE}/alarmAnalysis`,
      name: "fumigation-alarm-analysis",
      meta: { title: "报警分析" },
      component: () => hostFumigationGemPage("AlarmAnalysis"),
    },
    {
      path: `${BASE}/alarm/record`,
      name: "fumigation-alarm-drill-record",
      meta: { title: "报警记录", hideInMenu: true, activeMenuPath: `${BASE}/alarmStatistic` },
      component: () => hostFumigationGemPage("AlarmRecord", { routeQueryAs: "initialQuery" }),
    },
    {
      path: `${BASE}/applicationEquipment`,
      name: "fumigation-application-equipment",
      meta: { title: "熏蒸设备" },
      component: () => hostFumigationGemPage("ApplicationEquipment", { pageProps: { title: "熏蒸设备" } }),
    },
  ],
  menuContribution: [
    {
      label: "熏蒸作业",
      iconKey: "fumigation-operation",
      children: [
        { label: "作业列表", entry: "fumigation-work-list", path: `${BASE}/works` },
        { label: "实时态势", entry: "fumigationRealtime", path: `${BASE}/realtime` },
        {
          label: "熏蒸报警",
          entry: "xunZhenAlarm",
          children: [
            { label: "报警记录", entry: "xunZhenAlarmRecord", path: `${BASE}/alarmRecord` },
            { label: "报警配置", entry: "xunZhenAlarmConfig", path: `${BASE}/alarmConfigList` },
          ],
        },
        {
          label: "统计分析",
          entry: "xunZhenTjfx",
          children: [
            { label: "报警统计", entry: "xunZhenAlarmTj", path: `${BASE}/alarmStatistic` },
            { label: "报警处理统计", entry: "xunZhenAlarmCltj", path: `${BASE}/alarmHandelStatistics` },
            { label: "报警分析", entry: "xunZhenAlarmfx", path: `${BASE}/alarmAnalysis` },
          ],
        },
        { label: "熏蒸设备", entry: "xunZhenDeivces", path: `${BASE}/applicationEquipment` },
      ],
    },
  ],
  async install(_app, context, config) {
    await Promise.all([
      context.loadRuntimeCommon("pcUi", "index"),
      context.loadRuntimeCommon("pcChart", "index"),
      context.loadRuntimeCommon("pcPlayer", "index"),
      context.loadRuntimeCommon("pcMap", "index"),
      context.loadRuntimeCommon("pcIotSocket", "index"),
      context.loadRuntimeCommon("pcAlarmCharts", "index"),
      context.loadRuntimeCommon("pcScada", "index"),
      context.loadRuntimeCommon("pcGraphEditor", "index"),
      context.loadRuntimeCommon("pcVisualSdk", "index"),
    ]);
    await Promise.all([
      context.loadPlatform("pcUi", "platform"),
      context.loadPlatform("pcChart", "platform"),
      context.loadPlatform("pcPlayer", "platform"),
      context.loadPlatform("pcMap", "platform"),
      context.loadPlatform("pcIotSocket", "platform"),
      context.loadPlatform("pcAlarmCharts", "platform"),
      context.loadPlatform("pcScada", "platform"),
      context.loadPlatform("pcGraphEditor", "platform"),
      context.loadPlatform("pcVisualSdk", "platform"),
    ]);
    const client = await context.ensureClient<FumigationOperationClient>("fumigationOperationClient");
    installFumigationContext(context, client, config);
  },
};

export default domain;
