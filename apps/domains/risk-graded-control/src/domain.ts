import type { RiskGradedControlClient } from "@g2-client/risk-graded-control/client";
import type { DomainModule } from "@g2-composition/contract";

import { DOMAIN_CONTEXT_KEY, installRiskGradedControlContext } from "./domain-context";
import { installRiskGradedControlPcUi } from "./pc-ui-runtime";

import "./assets/style.less";

const BASE = "/d/risk-graded-control";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "risk-graded-control-home",
      meta: { title: "风险管控" },
      redirect: `${BASE}/config/warning-signs`,
    },
    {
      path: `${BASE}/config/warning-signs`,
      name: "warning-signs",
      meta: { title: "安全警示标志管理" },
      component: () => import("./views/config/warning-signs/warning-signs").then((m) => m.WarningSignsPage),
    },
    {
      path: `${BASE}/config/unit-types`,
      name: "unit-types",
      meta: { title: "风险单元类型管理" },
      component: () => import("./views/config/unit-types/unit-types").then((m) => m.UnitTypesPage),
    },
    {
      path: `${BASE}/config/assessment-methods`,
      name: "assessment-methods",
      meta: { title: "评估方法配置" },
      component: () => import("./views/config/assessment-methods/assessment-methods").then((m) => m.AssessmentMethodsPage),
    },
    {
      path: `${BASE}/zones`,
      name: "zones",
      meta: { title: "风险区域划分" },
      component: () => import("./views/zone/zone-list/zone-list").then((m) => m.ZoneListPage),
    },
    {
      path: `${BASE}/zones/form`,
      name: "zone-form",
      meta: { title: "区域新增/编辑", hideInMenu: true, activeMenuPath: `${BASE}/zones` },
      component: () => import("./views/zone/zone-form/zone-form").then((m) => m.ZoneFormPage),
    },
    {
      path: `${BASE}/units`,
      name: "units",
      meta: { title: "风险单元管理" },
      component: () => import("./views/unit/unit-list/unit-list").then((m) => m.UnitListPage),
    },
    {
      path: `${BASE}/units/form`,
      name: "unit-form",
      meta: { title: "单元新增/编辑", hideInMenu: true, activeMenuPath: `${BASE}/units` },
      component: () => import("./views/unit/unit-form/unit-form").then((m) => m.UnitFormPage),
    },
    {
      path: `${BASE}/unit-inventory`,
      name: "unit-inventory",
      meta: { title: "风险单元清单" },
      component: () => import("./views/unit-inventory/unit-inventory").then((m) => m.UnitInventoryPage),
    },
    {
      path: `${BASE}/identifications`,
      name: "identifications",
      meta: { title: "风险辨识管理" },
      component: () => import("./views/identification/identification-list/identification-list").then((m) => m.IdentificationListPage),
    },
    {
      path: `${BASE}/identifications/entry`,
      name: "identification-entry",
      meta: { title: "辨识录入", hideInMenu: true, activeMenuPath: `${BASE}/identifications` },
      component: () => import("./views/identification/identification-entry/identification-entry").then((m) => m.IdentificationEntryPage),
    },
    {
      path: `${BASE}/identifications/history`,
      name: "identification-history",
      meta: { title: "辨识历史", hideInMenu: true, activeMenuPath: `${BASE}/identifications` },
      component: () =>
        import("./views/identification/identification-history/identification-history").then((m) => m.IdentificationHistoryPage),
    },
    {
      path: `${BASE}/reviews/pending`,
      name: "review-pending",
      meta: { title: "辨识审核" },
      component: () => import("./views/review/review-pending/review-pending").then((m) => m.ReviewPendingPage),
    },
    {
      path: `${BASE}/reviews/execute`,
      name: "review-execute",
      meta: { title: "审核执行", hideInMenu: true, activeMenuPath: `${BASE}/reviews/pending` },
      component: () => import("./views/review/review-execute/review-execute").then((m) => m.ReviewExecutePage),
    },
    {
      path: `${BASE}/review-reports`,
      name: "review-reports",
      meta: { title: "评审报告" },
      component: () => import("./views/review-report/review-report").then((m) => m.ReviewReportPage),
    },
    {
      path: `${BASE}/assessments`,
      name: "assessments",
      meta: { title: "风险评估管理" },
      component: () => import("./views/assessment/assessment-list/assessment-list").then((m) => m.AssessmentListPage),
    },
    {
      path: `${BASE}/assessments/detail`,
      name: "assessment-detail",
      meta: { title: "风险评估详情", hideInMenu: true, activeMenuPath: `${BASE}/assessments` },
      component: () => import("./views/assessment/assessment-detail/assessment-detail").then((m) => m.AssessmentDetailPage),
    },
    {
      path: `${BASE}/assessments/innate`,
      name: "innate-assessment",
      meta: { title: "固有风险评估", hideInMenu: true, activeMenuPath: `${BASE}/assessments` },
      component: () => import("./views/assessment/innate-assessment/innate-assessment").then((m) => m.InnateAssessmentPage),
    },
    {
      path: `${BASE}/assessments/control`,
      name: "control-assessment",
      meta: { title: "控制风险评估", hideInMenu: true, activeMenuPath: `${BASE}/assessments` },
      component: () => import("./views/assessment/control-assessment/control-assessment").then((m) => m.ControlAssessmentPage),
    },
    {
      path: `${BASE}/measures/config`,
      name: "measure-config",
      meta: { title: "管控措施配置" },
      component: () => import("./views/control-measure/measure-config/measure-config").then((m) => m.MeasureConfigPage),
    },
    {
      path: `${BASE}/measures/execution`,
      name: "measure-execution",
      meta: { title: "措施执行" },
      component: () => import("./views/control-measure/measure-execution/measure-execution").then((m) => m.MeasureExecutionPage),
    },
    {
      path: `${BASE}/measures/list`,
      name: "measure-list",
      meta: { title: "措施清单", hideInMenu: true, activeMenuPath: `${BASE}/measures/config` },
      component: () => import("./views/control-measure/measure-list/measure-list").then((m) => m.MeasureListPage),
    },
    {
      path: `${BASE}/evaluation-plans`,
      name: "evaluation-plans",
      meta: { title: "评估计划" },
      component: () => import("./views/evaluation-plan/plan-list/plan-list").then((m) => m.PlanListPage),
    },
    {
      path: `${BASE}/evaluation-plans/form`,
      name: "evaluation-plan-form",
      meta: { title: "计划配置", hideInMenu: true, activeMenuPath: `${BASE}/evaluation-plans` },
      component: () => import("./views/evaluation-plan/plan-form/plan-form").then((m) => m.PlanFormPage),
    },
    {
      path: `${BASE}/warnings/config`,
      name: "warning-config",
      meta: { title: "预警消息配置" },
      component: () => import("./views/warning/warning-config/warning-config").then((m) => m.WarningConfigPage),
    },
    {
      path: `${BASE}/warnings/dashboard`,
      name: "warning-dashboard",
      meta: { title: "预警看板" },
      component: () => import("./views/warning/warning-dashboard/warning-dashboard").then((m) => m.WarningDashboardPage),
    },
    {
      path: `${BASE}/four-color-map`,
      name: "four-color-map",
      meta: { title: "风险四色图" },
      component: () => import("./views/four-color-map/four-color-map").then((m) => m.FourColorMapPage),
    },
    {
      path: `${BASE}/notification-cards`,
      name: "notification-cards",
      meta: { title: "风险告知卡" },
      component: () => import("./views/notification-card/notification-card-list").then((m) => m.NotificationCardListPage),
    },
  ],
  menuContribution: [
    {
      label: "风险管控",
      iconKey: "risk-graded-control",
      children: [
        {
          label: "安全警示标志管理",
          entry: "warning-signs",
          path: `${BASE}/config/warning-signs`,
        },
        {
          label: "风险单元类型管理",
          entry: "unit-types",
          path: `${BASE}/config/unit-types`,
        },
        {
          label: "评估方法配置",
          entry: "assessment-methods",
          path: `${BASE}/config/assessment-methods`,
        },
        { label: "风险区域划分", entry: "zones", path: `${BASE}/zones` },
        { label: "风险单元管理", entry: "units", path: `${BASE}/units` },
        {
          label: "风险单元清单",
          entry: "unit-inventory",
          path: `${BASE}/unit-inventory`,
        },
        {
          label: "风险辨识管理",
          entry: "identifications",
          path: `${BASE}/identifications`,
        },
        {
          label: "辨识审核",
          entry: "review-pending",
          path: `${BASE}/reviews/pending`,
        },
        {
          label: "风险评估管理",
          entry: "assessments",
          path: `${BASE}/assessments`,
        },
        {
          label: "管控措施配置",
          entry: "measure-config",
          path: `${BASE}/measures/config`,
        },
        {
          label: "措施执行",
          entry: "measure-execution",
          path: `${BASE}/measures/execution`,
        },
        {
          label: "评估计划",
          entry: "evaluation-plans",
          path: `${BASE}/evaluation-plans`,
        },
        {
          label: "预警消息配置",
          entry: "warning-config",
          path: `${BASE}/warnings/config`,
        },
        {
          label: "预警看板",
          entry: "warning-dashboard",
          path: `${BASE}/warnings/dashboard`,
        },
        {
          label: "风险四色图",
          entry: "four-color-map",
          path: `${BASE}/four-color-map`,
        },
        {
          label: "风险告知卡",
          entry: "notification-cards",
          path: `${BASE}/notification-cards`,
        },
        {
          label: "评审报告",
          entry: "review-reports",
          path: `${BASE}/review-reports`,
        },
      ],
    },
  ],
  async install(app, ctx) {
    await installRiskGradedControlPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcMap", "platform");
    installRiskGradedControlContext(ctx, await ctx.ensureClient<RiskGradedControlClient>("riskGradedControlClient"));
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domainModule;
