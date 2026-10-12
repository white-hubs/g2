import type { SecurityOpinionClient } from "@g2-client/security-opinion/client";
import type { DomainModule } from "@g2-composition/contract";
import {
  AlertManagementPage,
  KeywordConfigPage,
  OpinionListPage,
  RecycleBinPage,
  ReviewReportPage,
  SourceManagementPage,
  StatisticsPage,
  installSecurityOpinionPages,
} from "@g2-pages/security-opinion-monitoring";
import { defineComponent, h } from "vue";
import { RouterView } from "vue-router";

const BASE = "/d/security-opinion-monitoring";
const Layout = defineComponent({ name: "SecurityOpinionMonitoringLayout", setup: () => () => h(RouterView) });

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      component: Layout,
      children: [
        { path: "", redirect: `${BASE}/opinions` },
        { path: "opinions", name: "securityOpinionList", meta: { title: "舆情列表" }, component: OpinionListPage },
        { path: "alerts", name: "securityOpinionAlerts", meta: { title: "预警管理" }, component: AlertManagementPage },
        { path: "statistics", name: "securityOpinionStatistics", meta: { title: "统计分析" }, component: StatisticsPage },
        { path: "review-reports", name: "securityOpinionReviewReports", meta: { title: "复盘报告" }, component: ReviewReportPage },
        { path: "sources", name: "securityOpinionSources", meta: { title: "信源管理" }, component: SourceManagementPage },
        { path: "keywords", name: "securityOpinionKeywords", meta: { title: "关键词配置" }, component: KeywordConfigPage },
        { path: "recycle-bin", name: "securityOpinionRecycleBin", meta: { title: "回收站" }, component: RecycleBinPage },
      ],
    },
  ],
  menuContribution: [
    {
      label: "安全舆情",
      iconKey: "security-opinion",
      children: [
        { label: "舆情列表", entry: "securityOpinionList", path: `${BASE}/opinions` },
        { label: "预警管理", entry: "securityOpinionAlerts", path: `${BASE}/alerts` },
        {
          label: "分析报告",
          children: [
            { label: "统计分析", entry: "securityOpinionStatistics", path: `${BASE}/statistics` },
            { label: "复盘报告", entry: "securityOpinionReviewReports", path: `${BASE}/review-reports` },
          ],
        },
        {
          label: "配置管理",
          children: [
            { label: "信源管理", entry: "securityOpinionSources", path: `${BASE}/sources` },
            { label: "关键词配置", entry: "securityOpinionKeywords", path: `${BASE}/keywords` },
          ],
        },
        { label: "回收站", entry: "securityOpinionRecycleBin", path: `${BASE}/recycle-bin` },
      ],
    },
  ],
  async install(_app, context) {
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<SecurityOpinionClient>("securityOpinionClient");
    installSecurityOpinionPages(client);
  },
};

export default domainModule;
