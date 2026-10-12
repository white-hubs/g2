import { expect, test } from "bun:test";

import { createRiskManagementClient } from "./client";

test("风险源台账及配置接口保留旧 /api 业务前缀", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return { records: [], total: 0 };
    },
    post: async (url: string) => {
      urls.push(url);
      return {};
    },
    put: async () => ({}),
    delete: async () => ({}),
  };
  const client = createRiskManagementClient(http);
  await client.pageRiskLedger({ pageNumber: 1, pageSize: 10 });
  await client.getRiskTypes({ itemCode: "risk-source-type" });
  await client.getMessageConfigs({ label: "RISK_SOURCE_OVERDUE" });
  expect(urls[0]).toBe("/api/property/risk/source/ledger/page?pageNumber=1&pageSize=10");
  expect(urls[1]).toBe("/api/dictionary/getCascadeDictionaryItem?itemCode=risk-source-type");
  expect(urls[2]).toBe("/api/bracing/message/getConfigInfo?label=RISK_SOURCE_OVERDUE");
});
