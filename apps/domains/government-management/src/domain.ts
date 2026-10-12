import type { DomainModule } from "@g2-composition/contract";
import type { GovernmentManagementClient } from "@g2-contract/government-management";

import { installGovernmentContext } from "./domain-context";
import { APPROVAL_PAGES, BASE, STATISTIC_PAGES, menuPath } from "./menu-data";
import { hostGovernmentStreamPage } from "./mount-stream-page";
import { installGovernmentManagementPcUi } from "./pc-ui-runtime";

const approval = (slug: string) => APPROVAL_PAGES.find((item) => item.slug === slug);
const stat = (slug: string) => STATISTIC_PAGES.find((item) => item.slug === slug);
const item = (label: string, entry: string, slug: string) => ({ label, entry, path: menuPath(slug) });

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "government-management-home", redirect: menuPath("systemSolicitatioList") },
    ...APPROVAL_PAGES.map((config) => ({
      path: menuPath(config.slug),
      name: `government-${config.slug}`,
      meta: { title: config.title },
      component: () => import("./views/approval-page").then((module) => module.createApprovalPage(config)),
    })),
    ...STATISTIC_PAGES.map((config) => ({
      path: menuPath(config.slug),
      name: `government-${config.slug}`,
      meta: { title: config.title },
      component: () => import("./views/statistics-page").then((module) => module.createStatisticsPage(config)),
    })),
    ...[
      ["sealManageList", "印章管理", "seal"],
      ["eventTypeList", "事项分类", "category"],
    ].map(([slug, title, kind]) => ({
      path: menuPath(slug),
      name: `government-${slug}`,
      meta: { title },
      component: () => import("./views/catalog-page").then((module) => module.createCatalogPage(kind === "seal" ? "seal" : "category")),
    })),
    ...[
      ["eventApprovalList", "事项审批", "approval"],
      ["eventExchangeList", "事项变更", "exchange"],
      ["eventHandleApprovalList", "事项处理审批", "handleApproval"],
    ].map(([slug, title, kind]) => ({
      path: menuPath(slug),
      name: `government-${slug}`,
      meta: { title },
      component: () =>
        import("./views/focus-flow-page").then((module) => module.createFocusFlowPage(kind as "approval" | "exchange" | "handleApproval")),
    })),
    {
      path: menuPath("eventHandleList"),
      name: "government-eventHandleList",
      meta: { title: "事项处理" },
      component: () => import("./views/focus-handle-page").then((module) => module.createFocusHandlePage(false)),
    },
    {
      path: menuPath("eventHandleListSH"),
      name: "government-eventHandleListSH",
      meta: { title: "事项处理(上海)" },
      component: () => import("./views/focus-handle-page").then((module) => module.createFocusHandlePage(true)),
    },
    {
      path: menuPath("flowConfig"),
      name: "government-flowConfig",
      meta: { title: "流程配置" },
      component: () => import("./views/flow-config-page").then((module) => module.FlowConfigPage),
    },
    {
      path: menuPath("approval-record"),
      name: "government-approval-record",
      meta: { title: "行政审批记录" },
      component: () => import("./views/all-flow-page").then((module) => module.AllFlowPage),
    },
    ...STATISTIC_PAGES.filter((config) => config.detailKey).map((config) => ({
      path: `${menuPath(config.slug)}/detail`,
      name: `government-${config.slug}-detail`,
      meta: { title: `${config.title}详情`, hideInMenu: true, activeMenuPath: menuPath(config.slug) },
      component: () => import("./views/statistics-detail-page").then((module) => module.createStatisticsDetailPage(config)),
    })),
    ...[
      ...APPROVAL_PAGES.map((config) => ({ slug: config.slug, title: config.title })),
      ...[
        ["eventApprovalList", "事项审批"],
        ["eventExchangeList", "事项变更"],
        ["eventHandleApprovalList", "事项处理审批"],
        ["eventHandleList", "事项处理"],
        ["eventHandleListSH", "事项处理(上海)"],
        ["approval-record", "行政审批记录"],
      ].map(([slug, title]) => ({ slug, title })),
    ].map(({ slug, title }) => ({
      path: `${menuPath(slug)}/flow-render`,
      name: `government-${slug}-flow-render`,
      meta: { title, hideInMenu: true, activeMenuPath: menuPath(slug) },
      component: () => hostGovernmentStreamPage(title, menuPath(slug)),
    })),
    ...[
      ["eventHandleList", "事项处理"],
      ["eventHandleListSH", "事项处理(上海)"],
    ].map(([slug, title]) => ({
      path: `${menuPath(slug)}/detail`,
      name: `government-${slug}-detail`,
      meta: { title: `${title}详情`, hideInMenu: true, activeMenuPath: menuPath(slug) },
      component: () => import("./views/focus-detail-page").then((module) => module.createFocusDetailPage(slug === "eventHandleListSH")),
    })),
  ],
  menuContribution: [
    {
      label: "行政管理",
      iconKey: "government-management",
      children: [
        {
          label: "制度审批",
          entry: "zdsp",
          children: [
            item("制度征求", approval("systemSolicitatioList")!.entry, "systemSolicitatioList"),
            item("制度统计", stat("systemStatistics")!.entry, "systemStatistics"),
          ],
        },
        {
          label: "招标管理",
          entry: "zbsp",
          children: [
            item("招标审议", "TENDER_REVIEW", "tender-review"),
            item("招标审批", "TENDER_APPROVAL", "tender-approval"),
            item("招标确认", "TENDER_CONFIRMATION", "tender-confirmation"),
          ],
        },
        {
          label: "用印管理",
          entry: "yygk",
          children: [
            item("用印申请", "yysq", "useSealApprovalList"),
            item("印章管理", "yzgl", "sealManageList"),
            item("借章申请", "SEAL_BORROWING", "seal-borrowing"),
            item("申请统计", "sqtj", "useSealStatistics"),
          ],
        },
        {
          label: "议题预报",
          entry: "ytyb",
          children: [item("议题申请", "ytsq", "issueApprovalList"), item("议题预报统计", "yyybtj", "issueStatistics")],
        },
        { label: "文件传阅", entry: "yjcy", children: [item("传阅申请", "cysq", "documentApprovalList")] },
        {
          label: "来文处理",
          entry: "lwcl",
          children: [item("来文申请", "lwsq", "documentReceivedList"), item("来文统计", "lwtj", "documentReceivedStatistics")],
        },
        {
          label: "档位测试",
          entry: "bmgz",
          children: [item("测试审批", "bmgzzd", "departmentWorkList"), item("部门统计", "bmtj", "departmentWorkStatistics")],
        },
        {
          label: "督办管理",
          entry: "gbgl",
          children: [
            item("事项分类", "sxfl", "eventTypeList"),
            item("事项审批", "sxsp", "eventApprovalList"),
            item("审批统计", "sxtj", "approvalStatistics"),
            item("事项处理", "sxcl", "eventHandleList"),
            item("事项处理审批", "sxclsp", "eventHandleApprovalList"),
            item("事项处理(上海)", "sxclsh", "eventHandleListSH"),
            item("事项变更", "sxbg", "eventExchangeList"),
            item("变更统计", "bgtj", "exchangeStatistics"),
          ],
        },
        { label: "事项催办", entry: "sxcb", children: [item("催办申请", "cbsq", "matterUrgeApprovalList")] },
        item("流程配置", "lcpz", "flowConfig"),
        item("行政审批记录", "gdzx", "approval-record"),
      ],
    },
  ],
  async install(_app, context) {
    await installGovernmentManagementPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<GovernmentManagementClient>("governmentManagementClient");
    installGovernmentContext(context, client);
  },
};

export default domainModule;
