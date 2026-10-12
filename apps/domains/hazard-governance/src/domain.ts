import type { HazardGovernanceClient } from "@g2-client/hazard-governance/client";
import type { DomainModule } from "@g2-composition/contract";

import { DOMAIN_CONTEXT_KEY, installHazardGovernanceContext } from "./domain-context";
import { installHazardGovernancePcUi } from "./pc-ui-runtime";

import "./assets/style.less";
import "./views/hazard/shared/styles.less";

const BASE = "/d/hazard-governance";
const routeDefinitions = [
  ["hazard-workbench", "HazardWorkbench", "我的待办"],
  ["hazard-ledger", "HazardLedger", "隐患台账"],
  ["hazard-ledger-detail", "HazardLedgerDetail", "隐患详情"],
  ["rectification-tasks", "RectificationTasks", "隐患任务"],
  ["rectification-form", "RectificationForm", "整改表单"],
  ["rectification-progress", "RectificationProgress", "整改进度"],
  ["approval-list", "ApprovalList", "隐患审批"],
  ["approval-detail", "ApprovalDetail", "审批详情"],
  ["acceptance-list", "AcceptanceList", "隐患验收"],
  ["acceptance-detail", "AcceptanceDetail", "验收详情"],
  ["hazard-dashboard", "HazardDashboard", "隐患看板"],
  ["root-cause-list", "RootCauseList", "根因分析"],
  ["root-cause-detail", "RootCauseDetail", "根因详情"],
  ["rule-config", "RuleConfig", "类型配置"],
  ["approval-template-config", "ApprovalTemplateConfig", "审批链模板"],
] as const;

const pageComponents = {
  "hazard-workbench": () => import("./views/hazard/workbench").then((m) => m.HazardWorkbench),
  "hazard-ledger": () => import("./views/hazard/ledger").then((m) => m.HazardLedger),
  "hazard-ledger-detail": () => import("./views/hazard/ledger-detail").then((m) => m.HazardLedgerDetail),
  "rectification-tasks": () => import("./views/hazard/rectification-tasks").then((m) => m.RectificationTasks),
  "rectification-form": () => import("./views/hazard/rectification-form").then((m) => m.RectificationForm),
  "rectification-progress": () => import("./views/hazard/rectification-progress").then((m) => m.RectificationProgress),
  "approval-list": () => import("./views/hazard/approval-list").then((m) => m.ApprovalList),
  "approval-detail": () => import("./views/hazard/approval-detail").then((m) => m.ApprovalDetail),
  "acceptance-list": () => import("./views/hazard/acceptance-list").then((m) => m.AcceptanceList),
  "acceptance-detail": () => import("./views/hazard/acceptance-detail").then((m) => m.AcceptanceDetail),
  "hazard-dashboard": () => import("./views/hazard/dashboard").then((m) => m.HazardDashboard),
  "root-cause-list": () => import("./views/hazard/root-cause-list").then((m) => m.RootCauseList),
  "root-cause-detail": () => import("./views/hazard/root-cause-detail").then((m) => m.RootCauseDetail),
  "rule-config": () => import("./views/hazard/rule-config").then((m) => m.RuleConfig),
  "approval-template-config": () => import("./views/hazard/approval-template-config").then((m) => m.ApprovalTemplateConfig),
} as const;

const hiddenRouteParents: Partial<Record<(typeof routeDefinitions)[number][0], string>> = {
  "hazard-ledger-detail": "hazard-ledger",
  "rectification-form": "rectification-tasks",
  "rectification-progress": "rectification-tasks",
  "approval-detail": "approval-list",
  "acceptance-detail": "acceptance-list",
  "root-cause-detail": "root-cause-list",
};

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "hazard-governance-home", meta: { title: "隐患治理" }, redirect: `${BASE}/hazard-workbench` },
    ...routeDefinitions.map(([path, _component, title]) => {
      const activeParent = hiddenRouteParents[path];
      return {
        path: `${BASE}/${path}`,
        name: path,
        meta: activeParent ? { title, hideInMenu: true, activeMenuPath: `${BASE}/${activeParent}` } : { title },
        component: pageComponents[path],
      };
    }),
  ],
  menuContribution: [
    {
      label: "隐患治理",
      iconKey: "hazard-governance",
      // 与 OUAA 的隐患治理菜单码及层级一一对应；详情、表单和进度仅供页内跳转，不进入侧栏。
      children: [
        { label: "我的待办", entry: "hazard-workbench", path: `${BASE}/hazard-workbench` },
        { label: "隐患看板", entry: "hazard-dashboard", path: `${BASE}/hazard-dashboard` },
        { label: "隐患台账", entry: "hazard-ledger", path: `${BASE}/hazard-ledger` },
        { label: "隐患任务", entry: "rectification-tasks", path: `${BASE}/rectification-tasks` },
        { label: "隐患审批", entry: "approval-list", path: `${BASE}/approval-list` },
        { label: "隐患验收", entry: "acceptance-list", path: `${BASE}/acceptance-list` },
        {
          label: "隐患配置",
          children: [
            { label: "类型配置", entry: "rule-config", path: `${BASE}/rule-config` },
            { label: "审批链模板", entry: "approval-template-config", path: `${BASE}/approval-template-config` },
          ],
        },
        { label: "根因分析", entry: "root-cause-list", path: `${BASE}/root-cause-list` },
      ],
    },
  ],
  async install(app, ctx) {
    await installHazardGovernancePcUi(ctx);
    await ctx.loadRuntimeCommon("pcMap", "index");
    await Promise.all([ctx.loadPlatform("pcUi", "platform"), ctx.loadPlatform("pcMap", "platform")]);
    installHazardGovernanceContext(ctx, await ctx.ensureClient<HazardGovernanceClient>("hazardGovernanceClient"));
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};
export default domainModule;
