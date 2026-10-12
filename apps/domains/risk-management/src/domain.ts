import type { RiskManagementClient } from "@g2-client/risk-management/client";
import type { DomainModule } from "@g2-composition/contract";

import { DOMAIN_CONTEXT_KEY, installRiskManagementContext } from "./domain-context";
import { installRiskManagementPcUi } from "./pc-ui-runtime";

const BASE = "/d/risk-management";
const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "risk-management-home", meta: { title: "用气安全与危化品管控" }, redirect: `${BASE}/risk-type` },
    {
      path: `${BASE}/risk-type`,
      name: "risk-type",
      meta: { title: "风险源分类" },
      component: () => import("./views/risk-type").then((m) => m.RiskTypePage),
    },
    {
      path: `${BASE}/risk-ledger`,
      name: "risk-ledger",
      meta: { title: "风险源管理" },
      component: () => import("./views/risk-ledger").then((m) => m.RiskLedgerPage),
    },
    {
      path: `${BASE}/risk-ledger/create`,
      name: "risk-ledger-create",
      meta: { title: "新增风险源", hideInMenu: true, activeMenuPath: `${BASE}/risk-ledger` },
      component: () => import("./views/risk-ledger").then((m) => m.RiskLedgerFormPage),
    },
    {
      path: `${BASE}/risk-ledger/edit`,
      name: "risk-ledger-edit",
      meta: { title: "编辑风险源", hideInMenu: true, activeMenuPath: `${BASE}/risk-ledger` },
      component: () => import("./views/risk-ledger").then((m) => m.RiskLedgerFormPage),
    },
    {
      path: `${BASE}/risk-ledger/detail`,
      name: "risk-ledger-detail",
      meta: { title: "风险源详情", hideInMenu: true, activeMenuPath: `${BASE}/risk-ledger` },
      component: () => import("./views/risk-ledger").then((m) => m.RiskLedgerDetailPage),
    },
    {
      path: `${BASE}/risk-message`,
      name: "risk-message",
      meta: { title: "消息配置" },
      component: () => import("./views/risk-message").then((m) => m.RiskMessagePage),
    },
  ],
  // 顺序严格对应 OUAA：fxyfl → FXYGL → xxpz；详情与表单仅用于页内跳转。
  menuContribution: [
    { label: "风险源分类", iconKey: "risk-management", entry: "risk-type", path: `${BASE}/risk-type` },
    { label: "风险源管理", iconKey: "risk-management", entry: "risk-ledger", path: `${BASE}/risk-ledger` },
    { label: "消息配置", iconKey: "risk-management", entry: "risk-message", path: `${BASE}/risk-message` },
  ],
  async install(app, context) {
    await installRiskManagementPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    installRiskManagementContext(context, await context.ensureClient<RiskManagementClient>("riskManagementClient"));
    app.provide(DOMAIN_CONTEXT_KEY, context);
  },
};
export default domainModule;
