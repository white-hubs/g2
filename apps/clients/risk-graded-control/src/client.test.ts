import { expect, test } from "bun:test";

import { createRiskGradedControlClient } from "./client";

test("@g2-client/risk-graded-control preserves BFF URLs and HTTP verbs", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return {};
    },
    post: async (url: string) => {
      urls.push(url);
      return {};
    },
    put: async (url: string) => {
      urls.push(url);
      return {};
    },
    patch: async (url: string) => {
      urls.push(url);
      return {};
    },
    delete: async (url: string) => {
      urls.push(url);
      return {};
    },
  };
  const api = createRiskGradedControlClient(http);
  await api.pageUnitTypes({ pageNumber: 2, pageSize: 20 });
  await api.patchAssessmentMethod("method-1", { enabled: true });
  await api.exportUnits({ keyword: "测试" });
  await api.getPropertyDetailedPage({ pageNumber: 1, pageSize: 20 });
  await api.pageReviewReports({ pageNumber: 3, pageSize: 10 });
  await api.syncMeasureExecutionBatch([{ id: "m-1" }]);
  await api.getMapServiceConfig("gdMap");
  await api.getMapServiceConfig("TD_MAP");

  expect(urls).toContain("/gw-bff/risk-graded-control/unit-types?pageNumber=2&pageSize=20");
  expect(urls).toContain("/gw-bff/risk-graded-control/assessment-methods/method-1");
  expect(urls).toContain("/gw-bff/risk-graded-control/units/export?keyword=%E6%B5%8B%E8%AF%95");
  expect(urls).toContain("/api/property/property/detailed/getPropertyDetailedPage?pageNumber=1&pageSize=20");
  expect(urls).toContain("/gw-bff/risk-graded-control/review-reports?pageNumber=3&pageSize=10&pageNum=3");
  expect(urls).toContain("/gw-bff/risk-graded-control/measure-execution-sync-batches");
  expect(urls).toContain("/api/dictionary/getDataDictionaryByItem?itemCode=THIRD_SERVICE&code=gdMap");
  expect(urls).toContain("/api/dictionary/getDataDictionaryByItem?itemCode=THIRD_SERVICE&code=TD_MAP");
});

test("@g2-client/risk-graded-control posts syncMeasureExecutionBatch payload", async () => {
  const bodies: unknown[] = [];
  const http = {
    get: async () => ({}),
    post: async (_url: string, body?: unknown) => {
      bodies.push(body);
      return {};
    },
    put: async () => ({}),
    patch: async () => ({}),
    delete: async () => ({}),
  };
  const api = createRiskGradedControlClient(http);
  const payload = [{ id: "m-1" }];
  await api.syncMeasureExecutionBatch(payload);
  const reportPayload = { reportName: "年度评审报告" };
  await api.recheckReviewReport("report-1", reportPayload);
  await api.submitReviewReport("report-1", reportPayload);
  expect(bodies).toEqual([payload, reportPayload, reportPayload]);
});

test("@g2-client/risk-graded-control preserves deployed BFF pagination data", async () => {
  const page = {
    total: 1,
    pages: 1,
    records: [{ id: "unit-type-1", code: "WAREHOUSE", name: "仓储区域" }],
  };
  const http = {
    get: async () => page,
    post: async () => ({}),
    put: async () => ({}),
    patch: async () => ({}),
    delete: async () => ({}),
  };
  const api = createRiskGradedControlClient(http);

  expect(await api.pageUnitTypes({ pageNumber: 1, pageSize: 20 })).toEqual(page);
});

test("@g2-client/risk-graded-control unwraps legacy message envelopes", async () => {
  const http = {
    get: async (url: string) => {
      if (url.includes("getConfigInfo")) {
        return { code: 200, data: [{ sceneCode: "RISK_LEVEL_UPGRADE_WARNING" }] };
      }
      if (url.endsWith("sat-msg-channels")) {
        return {
          code: 200,
          data: [
            { channelCode: "SITE", channelName: "站内信" },
            { channelCode: "SMS", channelName: "短信" },
          ],
        };
      }
      return { code: 200, data: { channelCodes: ["SITE"] } };
    },
    post: async () => ({}),
    put: async () => ({}),
    patch: async () => ({}),
    delete: async () => ({}),
  };
  const api = createRiskGradedControlClient(http);

  expect(await api.getMessageConfig({ businessType: "RISK_WARNING" })).toEqual([{ sceneCode: "RISK_LEVEL_UPGRADE_WARNING" }]);
  expect(await api.sceneNotificationMethod("RISK_LEVEL_UPGRADE_WARNING")).toEqual([{ label: "站内信", value: "SITE" }]);
});
