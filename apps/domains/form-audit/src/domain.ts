import type { FormAuditClient } from "@g2-client/form-audit/client";
import type { DomainModule } from "@g2-composition/contract";

import { installFormAuditDateApi } from "./date-runtime";
import { installFormAuditContext } from "./domain-context";
import { hostStreamEnginePage } from "./mount-stream-page";

import "./styles.less";

const BASE = "/d/form-audit";

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "form-audit-home", redirect: `${BASE}/work-order-library` },
    {
      path: `${BASE}/work-order-library`,
      name: "form-audit-work-order-library",
      meta: { title: "表单模板" },
      component: () => import("./views/work-order-library").then((module) => module.WorkOrderLibrary),
    },
    {
      path: `${BASE}/work-order-mine`,
      name: "form-audit-work-order-mine",
      meta: { title: "业务表单" },
      component: () => import("./views/work-order-list").then((module) => module.WorkOrderMine),
    },
    {
      path: `${BASE}/work-order-record`,
      name: "form-audit-work-order-record",
      meta: { title: "表单记录" },
      component: () => import("./views/work-order-list").then((module) => module.WorkOrderRecord),
    },
    {
      path: `${BASE}/work-order-statistics`,
      name: "form-audit-work-order-statistics",
      meta: { title: "表单统计" },
      component: () => import("./views/work-order-statistics").then((module) => module.WorkOrderStatistics),
    },
    {
      path: `${BASE}/personnel-statistics`,
      name: "form-audit-personnel-statistics",
      meta: { title: "个人工单统计" },
      component: () => import("./views/work-order-statistics").then((module) => module.PersonnelStatistics),
    },
    {
      path: `${BASE}/work-order-config`,
      name: "form-audit-work-order-config",
      meta: { title: "表单配置" },
      component: () => import("./views/form-config").then((module) => module.WorkOrderConfig),
    },
    {
      path: `${BASE}/form-audit-config`,
      name: "form-audit-config",
      meta: { title: "表单配置-新" },
      component: () => import("./views/form-config").then((module) => module.FormAuditConfig),
    },
    {
      path: `${BASE}/assessment-rules`,
      name: "form-audit-assessment-rules",
      meta: { title: "考核规则" },
      component: () => import("./views/assessment-rules").then((module) => module.AssessmentRules),
    },
    {
      path: `${BASE}/assessment-statistics`,
      name: "form-audit-assessment-statistics",
      meta: { title: "考核统计" },
      component: () => import("./views/assessment-statistics").then((module) => module.AssessmentStatistics),
    },
    {
      path: `${BASE}/work-order-approval`,
      name: "form-audit-work-order-approval",
      meta: { title: "业务表单", hideInMenu: true, activeMenuPath: `${BASE}/work-order-library` },
      component: () => import("./views/work-order-approval").then((module) => module.WorkOrderApproval),
    },
    {
      path: `${BASE}/mine-flow-render`,
      name: "form-audit-mine-flow-render",
      meta: { title: "业务表单详情", hideInMenu: true, activeMenuPath: `${BASE}/work-order-mine` },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuPath: `${BASE}/work-order-mine`, title: "业务表单详情" }),
    },
    {
      path: `${BASE}/record-flow-render`,
      name: "form-audit-record-flow-render",
      meta: { title: "表单记录详情", hideInMenu: true, activeMenuPath: `${BASE}/work-order-record` },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuPath: `${BASE}/work-order-record`, title: "表单记录详情" }),
    },
    {
      path: `${BASE}/approval-flow-render`,
      name: "form-audit-approval-flow-render",
      meta: { title: "表单详情", hideInMenu: true, activeMenuPath: `${BASE}/work-order-library` },
      component: () => hostStreamEnginePage("StreamEngineRender", { activeMenuPath: `${BASE}/work-order-library`, title: "表单详情" }),
    },
    {
      path: `${BASE}/work-order-design`,
      name: "form-audit-work-order-design",
      meta: { title: "表单设计", hideInMenu: true, activeMenuPath: `${BASE}/work-order-config` },
      component: () => hostStreamEnginePage("WorkOrderDesign", { activeMenuPath: `${BASE}/work-order-config`, title: "表单设计" }),
    },
    {
      path: `${BASE}/form-audit-design`,
      name: "form-audit-new-design",
      meta: { title: "表单设计", hideInMenu: true, activeMenuPath: `${BASE}/form-audit-config` },
      component: () => hostStreamEnginePage("WorkOrderDesign", { activeMenuPath: `${BASE}/form-audit-config`, title: "表单设计" }),
    },
    {
      path: `${BASE}/assessment-rules/add`,
      name: "form-audit-assessment-rules-add",
      meta: { title: "新增考核规则", hideInMenu: true, activeMenuPath: `${BASE}/assessment-rules` },
      component: () => import("./views/assessment-rule-form").then((module) => module.AssessmentRuleForm),
    },
    {
      path: `${BASE}/assessment-rules/edit/:id`,
      name: "form-audit-assessment-rules-edit",
      meta: { title: "编辑考核规则", hideInMenu: true, activeMenuPath: `${BASE}/assessment-rules` },
      component: () => import("./views/assessment-rule-form").then((module) => module.AssessmentRuleForm),
    },
    {
      path: `${BASE}/assessment-rules/detail/:id`,
      name: "form-audit-assessment-rules-detail",
      meta: { title: "考核规则详情", hideInMenu: true, activeMenuPath: `${BASE}/assessment-rules` },
      component: () => import("./views/assessment-rule-form").then((module) => module.AssessmentRuleForm),
    },
    {
      path: `${BASE}/assessment-scoring`,
      name: "form-audit-assessment-scoring",
      meta: { title: "考核评分", hideInMenu: true, activeMenuPath: `${BASE}/assessment-statistics` },
      component: () => import("./views/assessment-scoring").then((module) => module.AssessmentScoring),
    },
    {
      path: `${BASE}/assessment-scoring/detail/:id`,
      name: "form-audit-assessment-scoring-detail",
      meta: { title: "评分详情", hideInMenu: true, activeMenuPath: `${BASE}/assessment-statistics` },
      component: () => import("./views/assessment-scoring-detail").then((module) => module.AssessmentScoringDetail),
    },
  ],
  menuContribution: [
    {
      label: "表单审核",
      iconKey: "form-audit",
      children: [
        {
          label: "表单管理",
          children: [
            { label: "表单模板", entry: "work-order-library", path: `${BASE}/work-order-library` },
            { label: "业务表单", entry: "work-order-mine", path: `${BASE}/work-order-mine` },
            { label: "表单记录", entry: "work-order-record", path: `${BASE}/work-order-record` },
            { label: "表单统计", entry: "work-order-statistics", path: `${BASE}/work-order-statistics` },
            { label: "个人工单统计", entry: "personnel-statistics", path: `${BASE}/personnel-statistics` },
            { label: "表单配置", entry: "work-order-config", path: `${BASE}/work-order-config` },
            { label: "表单配置-新", entry: "form-audit-config", path: `${BASE}/form-audit-config` },
          ],
        },
        { label: "考核规则", entry: "assessment-rules", path: `${BASE}/assessment-rules` },
        { label: "考核统计", entry: "assessment-statistics", path: `${BASE}/assessment-statistics` },
      ],
    },
  ],
  async install(app, context) {
    await installFormAuditDateApi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<FormAuditClient>("formAuditClient");
    await context.ensureClient("streamEngineClient");
    installFormAuditContext(context, client);
    app.provide(Symbol.for("form-audit-context"), context);
  },
};

export default domainModule;
