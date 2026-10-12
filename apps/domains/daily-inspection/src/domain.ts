import type { DomainModule } from "@g2-composition/contract";
import type { DailyInspectionClient } from "@g2-contract/daily-inspection";

import { DOMAIN_CONTEXT_KEY, installDailyInspectionContext } from "./domain-context";
import { installDailyInspectionPcUi } from "./pc-ui-runtime";

import "./styles.css";

const BASE = "/d/daily-inspection";
const migratedViews = {
  "plan-edit": () => import("./views/inspect-plan/inspect-plan-edit/inspect-plan-edit").then((m) => m.InspectPlanEdit),
  "task-edit": () => import("./views/inspect-task/inspect-task-edit/inspect-task-edit").then((m) => m.InspectTaskEdit),
  "task-info": () => import("./views/inspect-task/inspect-task-edit/inspect-task-info").then((m) => m.InspectTaskInfo),
  "record-info": () => import("./views/inspect-records/record-info/record-info").then((m) => m.RecordInfo),
  "archive-info": () => import("./views/inspect-archive/archive-info/archive-info").then((m) => m.ArchiveInfo),
  "config-item-edit": () => import("./views/inspect-config/inspect-items-form/inspect-items-form").then((m) => m.InspectItemsForm),
  "config-standard": () => import("./views/inspect-config/inspect-standard/inspect-standard").then((m) => m.InspectStandard),
  "config-standard-edit": () =>
    import("./views/inspect-config/inspect-standard-form/inspect-standard-form").then((m) => m.InspectStandardForm),
  "map-config": () => import("./views/inspect-config/inspect-map-config/inspect-map-config").then((m) => m.InspectMapConfig),
  "statistics-result": () => import("./views/inspection-auxiliary-pages").then((m) => m.InspectionResultStatistics),
  "statistics-department": () => import("./views/inspection-auxiliary-pages").then((m) => m.InspectionDepartmentStatistics),
  "statistics-personnel": () => import("./views/inspection-auxiliary-pages").then((m) => m.InspectionPersonnelStatistics),
  "statistics-target": () => import("./views/inspection-auxiliary-pages").then((m) => m.InspectionTargetStatistics),
  "statistics-analysis": () =>
    import("./views/statistical-analysis/inspection-analyse").then((m) => m.default ?? m.InspectionAnalysis ?? m.InspectionAnalyse),
  "standard-ai": () => import("./views/inspect-config/inspect-standard-ai/inspect-standard-ai").then((m) => m.InspectStandardAi),
  "message-config": () => import("./views/inspection-auxiliary-pages").then((m) => m.InspectionMessageConfig),
  "site-config": () => import("./views/inspect-config/site-configuration/site-configuration").then((m) => m.InspectionSiteConfiguration),
  "submit-setting": () => import("./views/inspection-auxiliary-pages").then((m) => m.InspectionSubmitSetting),
  "smart-plan-edit": () =>
    import("./views/smart-inspect-plan/smart-inspect-plan-edit/smart-inspect-plan-edit").then((m) => m.SmartInspectPlanEdit),
  "smart-plan-info": () =>
    import("./views/smart-inspect-plan/smart-inspect-plan-edit/smart-inspect-plan-edit").then((m) => m.SmartInspectPlanInfo),
  "smart-task-edit": () =>
    import("./views/smart-inspect-task/smart-inspect-task-edit/smart-inspect-task-edit").then((m) => m.SmartInspectTaskEdit),
  "smart-task-info": () =>
    import("./views/smart-inspect-task/smart-inspect-task-edit/smart-inspect-task-edit").then((m) => m.SmartInspectTaskInfo),
};
const view = (name: string) =>
  name in migratedViews
    ? migratedViews[name as keyof typeof migratedViews]
    : () => import("./views/inspection-page").then((m) => m.createInspectionPage(name));

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "daily-inspection-home", meta: { title: "巡检计划" }, redirect: `${BASE}/inspect-plan` },
    { path: `${BASE}/inspect-plan`, name: "inspect-plan", meta: { title: "巡检计划" }, component: view("plan") },
    {
      path: `${BASE}/inspect-plan-edit`,
      name: "inspect-plan-edit",
      meta: { title: "巡检计划", hideInMenu: true, activeMenuPath: `${BASE}/inspect-plan` },
      component: view("plan-edit"),
    },
    { path: `${BASE}/smart-inspect-plan`, name: "smart-inspect-plan", meta: { title: "智慧巡检计划" }, component: view("smart-plan") },
    {
      path: `${BASE}/smart-inspect-plan-edit`,
      name: "smart-inspect-plan-edit",
      meta: { title: "智慧巡检计划", hideInMenu: true, activeMenuPath: `${BASE}/smart-inspect-plan` },
      component: view("smart-plan-edit"),
    },
    {
      path: `${BASE}/smart-inspect-plan-info`,
      name: "smart-inspect-plan-info",
      meta: { title: "智慧巡检计划详情", hideInMenu: true, activeMenuPath: `${BASE}/smart-inspect-plan` },
      component: view("smart-plan-info"),
    },
    { path: `${BASE}/inspect-task`, name: "inspect-task", meta: { title: "巡检任务" }, component: view("task") },
    {
      path: `${BASE}/inspect-task-edit`,
      name: "inspect-task-edit",
      meta: { title: "巡检任务", hideInMenu: true, activeMenuPath: `${BASE}/inspect-task` },
      component: view("task-edit"),
    },
    {
      path: `${BASE}/inspect-task-info`,
      name: "inspect-task-info",
      meta: { title: "巡检任务详情", hideInMenu: true, activeMenuPath: `${BASE}/inspect-task` },
      component: view("task-info"),
    },
    { path: `${BASE}/smart-inspect-task`, name: "smart-inspect-task", meta: { title: "智慧巡检任务" }, component: view("smart-task") },
    {
      path: `${BASE}/smart-inspect-task-edit`,
      name: "smart-inspect-task-edit",
      meta: { title: "智慧巡检任务", hideInMenu: true, activeMenuPath: `${BASE}/smart-inspect-task` },
      component: view("smart-task-edit"),
    },
    {
      path: `${BASE}/smart-inspect-task-info`,
      name: "smart-inspect-task-info",
      meta: { title: "智慧巡检任务详情", hideInMenu: true, activeMenuPath: `${BASE}/smart-inspect-task` },
      component: view("smart-task-info"),
    },
    { path: `${BASE}/inspect-records`, name: "inspect-records", meta: { title: "巡检记录" }, component: view("records") },
    {
      path: `${BASE}/inspect-record-info`,
      name: "inspect-record-info",
      meta: { title: "巡检记录详情", hideInMenu: true, activeMenuPath: `${BASE}/inspect-records` },
      component: view("record-info"),
    },
    { path: `${BASE}/inspect-archive`, name: "inspect-archive", meta: { title: "巡检档案" }, component: view("archive") },
    {
      path: `${BASE}/inspect-archive-info`,
      name: "inspect-archive-info",
      meta: { title: "巡检档案详情", hideInMenu: true, activeMenuPath: `${BASE}/inspect-archive` },
      component: view("archive-info"),
    },
    { path: `${BASE}/plan-statistics`, name: "plan-statistics", meta: { title: "计划统计" }, component: view("plan-statistics") },
    {
      path: `${BASE}/task-standard-abnormal-rate`,
      name: "task-standard-abnormal-rate",
      meta: { title: "任务标准项异常率统计" },
      component: view("abnormal-rate"),
    },
    { path: `${BASE}/inspect-cycle`, name: "InspectCycle", meta: { title: "巡检周期" }, component: view("config-cron") },
    { path: `${BASE}/inspect-result`, name: "InspectResult", meta: { title: "巡检结果" }, component: view("config-result") },
    { path: `${BASE}/inspect-items`, name: "InspectItems", meta: { title: "巡检项" }, component: view("config-item") },
    {
      path: `${BASE}/inspect-items-form`,
      name: "InspectItemsForm",
      meta: { title: "巡检项", hideInMenu: true, activeMenuPath: `${BASE}/inspect-items` },
      component: view("config-item-edit"),
    },
    { path: `${BASE}/inspect-standard`, name: "InspectStandard", meta: { title: "巡检标准" }, component: view("config-standard") },
    {
      path: `${BASE}/inspect-standard-form`,
      name: "InspectStandardForm",
      meta: { title: "巡检标准", hideInMenu: true, activeMenuPath: `${BASE}/inspect-standard` },
      component: view("config-standard-edit"),
    },
    {
      path: `${BASE}/inspect-standard-ai`,
      name: "InspectStandardAi",
      meta: { title: "AI巡检标准生成", hideInMenu: true, activeMenuPath: `${BASE}/inspect-standard` },
      component: view("standard-ai"),
    },
    { path: `${BASE}/inspect-type`, name: "inspectType", meta: { title: "巡检类型" }, component: view("config-type") },
    { path: `${BASE}/inspect-map-config`, name: "InspectMapConfig", meta: { title: "巡检地图配置" }, component: view("map-config") },
    {
      path: `${BASE}/statistics/result`,
      name: "inspection-result-statistics",
      meta: { title: "巡检结果统计" },
      component: view("statistics-result"),
    },
    {
      path: `${BASE}/statistics/department`,
      name: "inspection-department-statistics",
      meta: { title: "部门巡检统计" },
      component: view("statistics-department"),
    },
    {
      path: `${BASE}/statistics/personnel`,
      name: "inspection-personnel-statistics",
      meta: { title: "人员巡检统计" },
      component: view("statistics-personnel"),
    },
    {
      path: `${BASE}/statistics/target`,
      name: "inspection-target-statistics",
      meta: { title: "巡检对象统计" },
      component: view("statistics-target"),
    },
    {
      path: `${BASE}/statistics/analysis`,
      name: "inspection-analysis",
      meta: { title: "巡检分析" },
      component: view("statistics-analysis"),
    },
    { path: `${BASE}/message-config`, name: "inspection-message-config", meta: { title: "巡检通知" }, component: view("message-config") },
    {
      path: `${BASE}/site-configuration`,
      name: "inspection-site-configuration",
      meta: { title: "现场点管理" },
      component: view("site-config"),
    },
    {
      path: `${BASE}/submit-setting`,
      name: "inspection-submit-setting",
      meta: { title: "巡检提交设置" },
      component: view("submit-setting"),
    },
  ],
  menuContribution: [
    {
      label: "日常巡检",
      iconKey: "daily-inspection",
      children: [
        { label: "巡检计划", entry: "inspect-plan", path: `${BASE}/inspect-plan` },
        { label: "巡检任务", entry: "inspect-task", path: `${BASE}/inspect-task` },
        { label: "巡检记录", entry: "inspect-records", path: `${BASE}/inspect-records` },
        { label: "巡检档案", entry: "inspect-archive", path: `${BASE}/inspect-archive` },
        {
          label: "巡检配置",
          children: [
            { label: "巡检周期", entry: "inspect-cycle", path: `${BASE}/inspect-cycle` },
            { label: "巡检标准", entry: "inspect-standard", path: `${BASE}/inspect-standard` },
            { label: "巡检项", entry: "inspect-items", path: `${BASE}/inspect-items` },
            { label: "巡检结果", entry: "inspect-result", path: `${BASE}/inspect-result` },
            { label: "巡检类型", entry: "inspect-type", path: `${BASE}/inspect-type` },
            { label: "巡检通知", entry: "inspection-message-config", path: `${BASE}/message-config` },
            { label: "现场点管理", entry: "inspection-site-configuration", path: `${BASE}/site-configuration` },
            { label: "巡检提交设置", entry: "inspection-submit-setting", path: `${BASE}/submit-setting` },
          ],
        },
        {
          label: "统计分析",
          children: [
            { label: "巡检结果统计", entry: "inspection-result-statistics", path: `${BASE}/statistics/result` },
            { label: "部门巡检统计", entry: "inspection-department-statistics", path: `${BASE}/statistics/department` },
            { label: "人员巡检统计", entry: "inspection-personnel-statistics", path: `${BASE}/statistics/personnel` },
            { label: "巡检对象统计", entry: "inspection-target-statistics", path: `${BASE}/statistics/target` },
            { label: "任务标准项异常率统计", entry: "task-standard-abnormal-rate", path: `${BASE}/task-standard-abnormal-rate` },
            { label: "巡检分析", entry: "inspection-analysis", path: `${BASE}/statistics/analysis` },
          ],
        },
        { label: "智慧巡检任务", entry: "smart-inspect-task", path: `${BASE}/smart-inspect-task` },
        { label: "智慧巡检计划", entry: "smart-inspect-plan", path: `${BASE}/smart-inspect-plan` },
      ],
    },
  ],
  async install(app, ctx) {
    await installDailyInspectionPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    const client = await ctx.ensureClient<DailyInspectionClient>("dailyInspectionClient");
    installDailyInspectionContext(ctx, client);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domainModule;
