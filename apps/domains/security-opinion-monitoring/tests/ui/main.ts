import type { SecurityOpinionClient } from "@g2-client/security-opinion/client";
import { createFakeDomainContext } from "@g2-composition/contract";
import { ZhConfigProvider } from "@g2-platform/pc-ui";
import { createApp, h } from "vue";
import { RouterView, createRouter, createWebHistory } from "vue-router";

import domain from "../../src/domain";

const calls: string[] = [];
const opinion = {
  id: "op-1",
  opinionId: "op-1",
  title: "安全生产正面报道",
  summary: "摘要",
  source: "新浪新闻",
  sentiment: "POSITIVE",
  collectedAt: "2026-09-22 08:30:00",
  url: "https://example.com/news",
  author: "记者",
  keywords: ["安全生产"],
  content: "安全生产工作有序开展。",
  warningLevel: "BLUE",
  warningLevelText: "蓝色",
  pushStatus: "PENDING",
  pushStatusText: "待推送",
  relatedEventId: "event-1",
};
const sparseOpinion = { ...opinion, keywords: undefined };
const client = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "then") return undefined;
      return async (...args: unknown[]) => {
        const method = String(property);
        calls.push(method);
        if (method === "pageOpinions") return { records: [opinion], total: 1 };
        if (method === "getOpinion" || method === "getAlert") return sparseOpinion;
        if (method === "listSources")
          return [{ id: "source-1", name: "新浪新闻", url: "https://news.sina.com.cn", frequency: "60", maxItems: 20, status: "running" }];
        if (method === "getKeywordRule") return { matchStrategy: "any", minMatchCount: 1, dedupStrategy: "title", collectTimeRange: "24h" };
        if (method === "listKeywords") return [{ id: "kw-1", keywordText: args[0] === "exclude" ? "谣言" : "安全生产", preset: false }];
        if (method === "listKeywordPresets") return ["事故", "应急"];
        if (method === "getStatisticsOverview") return { total: 128, negativeCount: 12, sourceCount: 8, negativeRate: 9.4 };
        if (method === "getSentimentDistribution")
          return [
            { name: "正面", value: 80 },
            { name: "负面", value: 12 },
          ];
        if (method === "getSourceDistribution") return [{ name: "新浪新闻", value: 60 }];
        if (method === "getCollectionTrend") return [{ name: "09-22 08:00", value: 25 }];
        if (method === "getKeywordRanking") return [{ name: "安全生产", value: 30 }];
        if (method === "getHotEvents") return [{ rank: 1, title: "安全生产月", channelText: "新浪新闻", score: 99 }];
        if (method === "pageTrash")
          return {
            records: [{ id: "trash-1", title: "已过滤舆情", source: "微博", filterReason: "排除词", collectedAt: "2026-09-22 07:00:00" }],
            total: 1,
          };
        if (method === "getTrashItem")
          return { id: "trash-1", title: "已过滤舆情", source: "微博", filterReason: "排除词", collectedAt: "2026-09-22 07:00:00" };
        if (method === "pageAlerts") return { records: [sparseOpinion], total: 1 };
        if (method === "listAlertChannels") return [{ channelCode: "CHANNEL_SITE", channelName: "站内信" }];
        if (method === "pageAlertReceivers")
          return { records: [{ id: "u1", userId: "u1", userName: "张安全", mobile: "13800000000", organizationName: "安全部" }], total: 1 };
        if (method === "listAlertPushRecords") return [];
        if (method === "getAlertNotificationConfig") return {};
        if (method === "pageReviewReports")
          return {
            records: [
              {
                eventId: "event-1",
                eventName: "安全生产事件",
                reportStatus: "NOT_GENERATED",
                warningLevel: "BLUE",
                alertTime: "2026-09-22 08:30:00",
              },
            ],
            total: 1,
          };
        return undefined;
      };
    },
  },
) as SecurityOpinionClient;

declare global {
  interface Window {
    apiCalls: string[];
  }
}
globalThis.apiCalls = calls;
const context = createFakeDomainContext({ loadPlatform: async () => ({}), ensureClient: async <T>() => client as T });
const router = createRouter({ history: createWebHistory(), routes: domain.routes });
const app = createApp({ render: () => h(ZhConfigProvider, null, () => h(RouterView)) });
await domain.install?.(app, context, {});
app.use(router);
await router.isReady();
app.mount("#app");
