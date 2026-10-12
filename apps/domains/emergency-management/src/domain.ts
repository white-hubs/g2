import type { DomainModule } from "@g2-composition/contract";
import type { EmergencyManagementClient } from "@g2-contract/emergency-management";

import { DOMAIN_CONTEXT_KEY, installEmergencyManagementContext } from "./domain-context";
import { installEmergencyManagementPcUi } from "./pc-ui-runtime";

import "./assets/emergency-management-common.css";

const BASE = "/d/emergency-management";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "emergency-management-home",
      meta: { title: "预案管理" },
      redirect: `${BASE}/plan-documents`,
    },
    {
      path: `${BASE}/plan-documents`,
      name: "emergency-plan-documents",
      meta: { title: "预案文件" },
      component: () => import("./views/plan-documents/plan-documents").then((m) => m.PlanDocuments),
    },
    {
      path: `${BASE}/plan-documents/detail`,
      name: "emergency-plan-document-detail",
      meta: { title: "预案文件详情", hideInMenu: true, activeMenuPath: `${BASE}/plan-documents` },
      component: () => import("./views/plan-documents/plan-document-detail").then((m) => m.PlanDocumentDetail),
    },
    {
      path: `${BASE}/plan-generate`,
      name: "emergency-plan-generate",
      meta: { title: "预案生成" },
      component: () => import("./views/plan-generate/plan-generate").then((m) => m.PlanGenerate),
    },
    {
      path: `${BASE}/plan-rules`,
      name: "emergency-plan-rules",
      meta: { title: "预案规则" },
      component: () => import("./views/plan-rules/plan-rules").then((m) => m.PlanRules),
    },
    {
      path: `${BASE}/message-notice`,
      name: "emergency-message-notice",
      meta: { title: "消息配置" },
      component: () => import("./views/message-notice/message-notice").then((m) => m.MessageNotice),
    },
    {
      path: `${BASE}/event-types`,
      name: "emergency-event-types",
      meta: { title: "事件分类" },
      component: () => import("./views/event-types/event-types").then((m) => m.EventTypes),
    },
    {
      path: `${BASE}/file-types`,
      name: "emergency-file-types",
      meta: { title: "文件分类" },
      component: () => import("./views/file-types/file-types").then((m) => m.FileTypes),
    },
  ],
  menuContribution: [
    {
      label: "预案管理",
      iconKey: "emergency-management",
      children: [
        { label: "预案文件", entry: "plan-documents", path: `${BASE}/plan-documents` },
        { label: "预案生成", entry: "plan-generate", path: `${BASE}/plan-generate` },
        { label: "预案规则", entry: "plan-rules", path: `${BASE}/plan-rules` },
        { label: "消息配置", entry: "message-notice", path: `${BASE}/message-notice` },
        { label: "事件分类", entry: "event-types", path: `${BASE}/event-types` },
        { label: "文件分类", entry: "file-types", path: `${BASE}/file-types` },
      ],
    },
  ],
  async install(app, ctx) {
    await installEmergencyManagementPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    const client = await ctx.ensureClient<EmergencyManagementClient>("emergencyManagementClient");
    installEmergencyManagementContext(ctx, client);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domainModule;
