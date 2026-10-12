import type { SafetyPersonnelClient } from "@g2-client/safety-personnel/client";
import type { DomainModule } from "@g2-composition/contract";
import { defineComponent, h } from "vue";
import { RouterView } from "vue-router";

import { installSafetyDutyContext } from "./domain-context";
import { installSafetyDutyPcUi } from "./pc-ui-runtime";

import "./assets/style.css";
const BASE = "/d/safety-duty";
const SafetyDutyLayout = defineComponent({
  name: "SafetyDutyLayout",
  setup: () => () => h("div", { class: "safety-duty-domain" }, h(RouterView)),
});
const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      component: SafetyDutyLayout,
      children: [
        { path: "", redirect: `${BASE}/organization-duty/overview` },
        {
          path: "organization-duty/overview",
          name: "dutyOverview",
          meta: { title: "履职总览" },
          component: () => import("./views/overview").then((m) => m.DutyOverviewPage),
        },
        {
          path: "organization-duty/role-assignments",
          name: "dutyRoleAssignments",
          meta: { title: "法定角色与人员" },
          component: () => import("./views/role-assignments").then((m) => m.DutyRoleAssignmentsPage),
        },
        {
          path: "organization-duty/templates",
          name: "dutyTemplates",
          meta: { title: "履职清单模板" },
          component: () => import("./views/templates").then((m) => m.DutyTemplatesPage),
        },
        {
          path: "organization-duty/notification-config",
          name: "dutyNotificationConfig",
          meta: { title: "派发与签收通知配置" },
          component: () => import("./views/notification").then((m) => m.DutyNotificationConfigPage),
        },
        {
          path: "organization-duty/signature-tracking",
          name: "dutySignatureTracking",
          meta: { title: "签收追踪" },
          component: () => import("./views/signature-tracking").then((m) => m.DutySignatureTrackingPage),
        },
        {
          path: "organization-duty/assignments",
          name: "dutyAssignments",
          meta: { title: "我的履职" },
          component: () => import("./views/assignments").then((m) => m.DutyAssignmentsPage),
        },
        {
          path: "organization-duty/sign-confirmation",
          name: "dutySignConfirmation",
          meta: { title: "签收确认" },
          component: () => import("./views/signature").then((m) => m.DutySignaturePage),
        },
        {
          path: "score/model",
          name: "dutyScoreModel",
          meta: { title: "评分模型配置" },
          component: () => import("./views/score").then((m) => m.DutyScoreModelPage),
        },
        {
          path: "score/dashboard",
          name: "dutyScoreDashboard",
          meta: { title: "评分看板" },
          component: () => import("./views/score").then((m) => m.DutyScoreDashboardPage),
        },
        {
          path: "score/personal-report",
          name: "dutyScorePersonalReport",
          meta: { title: "个人评分报告" },
          component: () => import("./views/score").then((m) => m.DutyScorePersonalReportPage),
        },
        {
          path: "score/publicity",
          name: "dutyScorePublicity",
          meta: { title: "红黑榜公示" },
          component: () => import("./views/score").then((m) => m.DutyScorePublicityPage),
        },
        {
          path: "score/notify-targets",
          name: "dutyScoreNotifyTargets",
          meta: { title: "分级通知对象" },
          component: () => import("./views/score").then((m) => m.DutyScoreNotifyTargetsPage),
        },
        {
          path: "reports/generate",
          name: "dutyReportGenerate",
          meta: { title: "履职报告" },
          component: () => import("./views/reports").then((m) => m.DutyReportsPage),
        },
      ],
    },
  ],
  menuContribution: [
    {
      label: "安全履职",
      iconKey: "safety-duty",
      children: [
        {
          label: "组织履职",
          children: [
            { label: "履职总览", entry: "dutyOverview", path: `${BASE}/organization-duty/overview` },
            { label: "法定角色与人员", entry: "dutyRoleAssignments", path: `${BASE}/organization-duty/role-assignments` },
            { label: "履职清单模板", entry: "dutyTemplates", path: `${BASE}/organization-duty/templates` },
            { label: "派发与签收通知配置", entry: "dutyNotificationConfig", path: `${BASE}/organization-duty/notification-config` },
            { label: "签收追踪", entry: "dutySignatureTracking", path: `${BASE}/organization-duty/signature-tracking` },
            { label: "我的履职", entry: "dutyAssignments", path: `${BASE}/organization-duty/assignments` },
            { label: "签收确认", entry: "dutySignConfirmation", path: `${BASE}/organization-duty/sign-confirmation` },
          ],
        },
        {
          label: "履职评分",
          children: [
            { label: "评分模型配置", entry: "dutyScoreModel", path: `${BASE}/score/model` },
            { label: "评分看板", entry: "dutyScoreDashboard", path: `${BASE}/score/dashboard` },
            { label: "个人评分报告", entry: "dutyScorePersonalReport", path: `${BASE}/score/personal-report` },
            { label: "红黑榜公示", entry: "dutyScorePublicity", path: `${BASE}/score/publicity` },
            { label: "分级通知对象", entry: "dutyScoreNotifyTargets", path: `${BASE}/score/notify-targets` },
          ],
        },
        { label: "履职报告", children: [{ label: "履职报告", entry: "dutyReportGenerate", path: `${BASE}/reports/generate` }] },
      ],
    },
  ],
  async install(_app, ctx) {
    await installSafetyDutyPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    const client = await ctx.ensureClient<SafetyPersonnelClient>("safetyPersonnelClient");
    installSafetyDutyContext(ctx, client);
  },
};
export default domainModule;
