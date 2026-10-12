import type { DomainModule } from "@g2-composition/contract";
import type { WorkReportClient } from "@g2-contract/work-report";

import { installWorkReportContext } from "./domain-context";
import { BASE, MENUS } from "./menu-data";
import { installWorkReportPcUi } from "./pc-ui-runtime";
import { hostStreamPage } from "./stream-page-host";
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "work-report-home", meta: { title: "工作汇报" }, redirect: `${BASE}/report-list` },
    {
      path: `${BASE}/report-list`,
      name: "work-report-list",
      meta: { title: "工作汇报" },
      component: () => import("./views/report-page").then((m) => m.ReportListPage),
    },
    {
      path: `${BASE}/report-type`,
      name: "work-report-type",
      meta: { title: "汇报类型" },
      component: () => import("./views/type-page").then((m) => m.ReportTypePage),
    },
    {
      path: `${BASE}/report-flow`,
      name: "work-report-flow",
      meta: { title: "流程配置" },
      component: () => import("./views/flow-config-page").then((m) => m.FlowConfigPage),
    },
    {
      path: `${BASE}/arrange-list`,
      name: "work-report-arrangements",
      meta: { title: "工作安排" },
      component: () => import("./views/arrange-page").then((m) => m.ArrangePage),
    },
    {
      path: `${BASE}/notice-type`,
      name: "work-report-arrange-type",
      meta: { title: "安排类型" },
      component: () => import("./views/type-page").then((m) => m.ArrangeTypePage),
    },
    {
      path: `${BASE}/report-center`,
      name: "work-report-center",
      meta: { title: "汇报中心" },
      component: () => import("./views/report-page").then((m) => m.ReportCenterPage),
    },
    {
      path: `${BASE}/report-statistics`,
      name: "work-report-statistics",
      meta: { title: "工作汇报统计" },
      component: () => import("./views/statistics-page").then((m) => m.StatisticsPage),
    },
    {
      path: `${BASE}/arrange-detail`,
      name: "work-report-arrange-detail",
      meta: { title: "工作安排", hideInMenu: true, activeMenuPath: `${BASE}/arrange-list` },
      component: () => import("./views/arrange-form").then((m) => m.ArrangeFormPage),
    },
    {
      path: `${BASE}/record-index`,
      name: "work-report-statistics-records",
      meta: { title: "汇报中心", hideInMenu: true, activeMenuPath: `${BASE}/report-statistics` },
      component: () => import("./views/report-page").then((m) => m.ReportRecordsPage),
    },
    ...["report-list", "report-center", "report-statistics"].map((slug) => ({
      path: `${BASE}/${slug}/flow-render`,
      name: `work-report-${slug}-render`,
      meta: { title: "工作汇报", hideInMenu: true, activeMenuPath: `${BASE}/${slug}` },
      component: () => hostStreamPage(`${BASE}/${slug}`),
    })),
    {
      path: `${BASE}/flow-config`,
      name: "work-report-flow-alias",
      meta: { title: "流程配置", hideInMenu: true, activeMenuPath: `${BASE}/report-flow` },
      redirect: `${BASE}/report-flow`,
    },
  ],
  menuContribution: [
    { label: "工作汇报", children: MENUS.map((item) => ({ label: item.label, entry: item.entry, path: `${BASE}/${item.slug}` })) },
  ],
  async install(_app, context) {
    await installWorkReportPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    installWorkReportContext(context, await context.ensureClient<WorkReportClient>("workReportClient"));
  },
};
export default domain;
