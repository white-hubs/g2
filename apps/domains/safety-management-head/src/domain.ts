import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { DomainContext, DomainModule, MenuContributionNode } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { SafetyManagementClient } from "@g2-contract/safety-management";
import {
  AlarmConfigPage,
  AlarmDetailPage,
  AlarmPushPage,
  AlarmReportPage,
  BusinessClassificationPage,
  DepartmentReportPage,
  HeadAlarmRecordPage,
  HeadMonthlyReportPage,
  MarketAuthorizationPage,
  MarketConfigPage,
  MetricLibraryPage,
  MonthlyLinkPage,
  ReportViewerPage,
  RuleLibraryPage,
  SafetyAnalysisPage,
  type SafetyPageProps,
  SafetyReportPage,
  SecurityAnalysisReportPage,
  SecurityMonthlyReportPage,
  UserReportPage,
} from "@g2-pages/safety-management";
import { type Component, defineComponent, h } from "vue";

const BASE = "/d/safety-management-head";
let context: DomainContext | null = null;
let domainConfig: Record<string, unknown> = {};

function requireContext(): DomainContext {
  if (!context) {
    throw new Error("safety-management-head domain not installed");
  }
  return context;
}

function applicationCode(): string {
  return typeof domainConfig.applicationCode === "string" && domainConfig.applicationCode
    ? domainConfig.applicationCode
    : "SAFETY_MANAGE_HEAD";
}

function host(PageComponent: Component, title: string): Component {
  return defineComponent({
    name: `SafetyManagementHead${title}`,
    setup: () => () =>
      h(PageComponent, {
        title,
        basePath: BASE,
        applicationCode: applicationCode(),
        getClient: () => requireContext().ensureClient<SafetyManagementClient>("safetyManagementClient"),
        getFileClient: () => requireContext().ensureClient<FileClient>("fileClient"),
        getDictionaryClient: () => requireContext().ensureClient<DictionaryClient>("dictionaryClient"),
        getOuaaClient: () => requireContext().ensureClient<OuaaClient>("ouaaClient"),
      } satisfies SafetyPageProps),
  });
}

const route = (entry: string, title: string, page: Component, fullPage = false, activeMenuEntry?: string) => ({
  path: `${BASE}/${entry}`,
  name: `safety-management-head-${entry.replaceAll("/", "-")}`,
  meta: activeMenuEntry ? { title, fullPage, hideInMenu: true, activeMenuPath: `${BASE}/${activeMenuEntry}` } : { title, fullPage },
  component: host(page, title),
});

const menu: MenuContributionNode[] = [
  {
    label: "安全管理(总部)@",
    iconKey: "safety-management",
    children: [
      { label: "安全月报", entry: "monthly-report", path: `${BASE}/monthly-report` },
      {
        label: "安全报表",
        entry: "safety-report",
        path: `${BASE}/safety-report`,
      },
      {
        label: "系统配置",
        children: [
          { label: "月报链接", entry: "monthly-link", path: `${BASE}/monthly-link` },
          { label: "授权管理", entry: "auth-management", path: `${BASE}/auth-management` },
        ],
      },
      {
        label: "报警管理",
        children: [
          { label: "报警配置", entry: "config", path: `${BASE}/config` },
          { label: "报警记录", entry: "alarm-record", path: `${BASE}/alarm-record` },
          { label: "报警推送", entry: "alarm-push", path: `${BASE}/alarm-push` },
        ],
      },
      {
        label: "安全报告",
        children: [
          { label: "安全分析", entry: "security-analysis", path: `${BASE}/security-analysis` },
          { label: "报告记录", entry: "security-analysis-report", path: `${BASE}/security-analysis-report` },
          { label: "指标库", entry: "quota-base", path: `${BASE}/quota-base` },
          { label: "规则库", entry: "rule-base", path: `${BASE}/rule-base` },
          { label: "业务分类", entry: "business-classification", path: `${BASE}/business-classification` },
        ],
      },
    ],
  },
];

const domainModule: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/monthly-report` },
    route("auth", "授权管理", MarketAuthorizationPage),
    route("monthly-report", "安全月报", HeadMonthlyReportPage),
    route("monthly-link", "月报链接", MonthlyLinkPage),
    route("auth-management", "授权管理", MarketConfigPage),
    route("safety-report", "安全报表", SafetyReportPage),
    route("rule-base", "规则库", RuleLibraryPage),
    route("quota-base", "指标库", MetricLibraryPage),
    route("business-classification", "业务分类", BusinessClassificationPage),
    route("config", "报警配置", AlarmConfigPage),
    route("alarm-push", "报警推送", AlarmPushPage),
    route("alarm-record", "报警记录", HeadAlarmRecordPage),
    route("alarm-detail", "报警详情", AlarmDetailPage, false, "alarm-record"),
    route("viewreport", "报告预览", ReportViewerPage),
    route("excel-viewer", "报表预览", ReportViewerPage, true),
    route("security-analysis", "安全分析", SafetyAnalysisPage),
    route("security-analysis-report", "报告记录", SecurityAnalysisReportPage),
    route("security-monthly-report", "安全报告", SecurityMonthlyReportPage),
    route("alarm-report", "报警统计", AlarmReportPage),
    route("dept-report", "部门统计", DepartmentReportPage),
    route("user-report", "人员统计", UserReportPage),
  ],
  menuContribution: menu,
  async install(_app, ctx, config) {
    context = ctx;
    domainConfig = config ?? {};
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.ensureClient("safetyManagementClient");
    await ctx.ensureClient("fileClient");
    await ctx.ensureClient("dictionaryClient");
    await ctx.ensureClient("ouaaClient");
  },
};

export default domainModule;
