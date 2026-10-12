import { describe, expect, test } from "bun:test";

import { type HttpClient, createGovernmentManagementClient } from "./client";

function recorder(result: unknown = { code: 200, data: { records: [], total: 0, pages: 0 } }) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return result;
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return result;
    },
    put: async (url, body) => {
      calls.push({ method: "PUT", url, body });
      return result;
    },
    delete: async (url) => {
      calls.push({ method: "DELETE", url });
      return result;
    },
  };
  return { client: createGovernmentManagementClient(http), calls };
}

describe("government-management client", () => {
  test("preserves flow paging, application and filter parameter names", async () => {
    const { client, calls } = recorder();
    await client.pageFlows({
      pageNumber: 2,
      pageSize: 15,
      type: "WAITING",
      businessType: "OFFICIAL_REGULATION",
      status: null,
      submitTime: "2026-01-01 00:00:00,2026-02-01 23:59:59",
      organizationId: "dept-1",
      username: "张三",
    });
    await client.pageAllFlows({
      pageNumber: 1,
      pageSize: 10,
      applicationCode: "OFFICIAL_MANAGEMENT",
      businessType: "OFFICIAL_SEAL",
      status: "FINISHED",
    });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/flow/process/instance/historical/page?pageNumber=2&pageSize=15&type=WAITING&businessType=OFFICIAL_REGULATION&submitTime=2026-01-01+00%3A00%3A00%2C2026-02-01+23%3A59%3A59&organizationId=dept-1&username=%E5%BC%A0%E4%B8%89",
      "/api/flow/process/instance/historical/allPage?pageNumber=1&pageSize=10&applicationCode=OFFICIAL_MANAGEMENT&businessType=OFFICIAL_SEAL&status=FINISHED",
    ]);
    await client.listOrganizations();
    expect(calls.at(-1)?.url).toBe("/api/ouaa/authenticated/organizations/list?enabled=true");
  });

  test("keeps seven statistics endpoints and detail query", async () => {
    const { client, calls } = recorder();
    const kinds = ["system", "seal", "issue", "documentReceived", "keywork", "focusWork", "focusWorkChange"] as const;
    for (const kind of kinds) {
      await client.pageStatistics(kind, { pageNumber: 1, pageSize: 10, period: "" });
    }
    await client.getStatisticDetail("system", "a/b", { pageNumber: 2, pageSize: 20, period: "2026-01-01,2026-01-31" });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/official/regulation/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/officialSeal/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/topic/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/documentReceived/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/keyWork/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/focusWork/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/focusWork/update/stat?pageNumber=1&pageSize=10&period=",
      "/api/official/regulation/stat/a%2Fb/detail?pageNumber=2&pageSize=20&period=2026-01-01%2C2026-01-31",
    ]);
  });

  test("keeps seal, category, focus reply and flow configuration methods", async () => {
    const { client, calls } = recorder();
    await client.addSeal({ sealName: "公章", sealDesc: "" });
    await client.updateCategory("a/b", { name: "重点事项", remark: "" });
    await client.replyFocusWork({ focusWorkId: "1", failReason: "延期", fileIds: "2" });
    await client.saveFlowBusiness({ formDefinitionId: "form", formFlowId: "flow", businessType: "OFFICIAL_SEAL", fieldMapList: [] });
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      "POST /api/official/officialSeal/add",
      "PUT /api/official/focusWork/category/a%2Fb",
      "POST /api/official/focusWork/fail",
      "POST /api/flow/form-flow-business",
    ]);
  });

  test("uses Blob exports", async () => {
    const file = new Blob(["xlsx"]);
    const { client, calls } = recorder(file);
    expect(await client.exportStatistics("seal", "2026-01-01,2026-01-31")).toBe(file);
    expect(await client.exportAllFlows({ applicationCode: "OFFICIAL_MANAGEMENT", status: "FINISHED" })).toBe(file);
    expect(calls).toEqual([
      { method: "POST", url: "/api/official/export/officialSeal/stat", body: { period: "2026-01-01,2026-01-31" } },
      { method: "GET", url: "/api/flow/process/instance/historical/export?applicationCode=OFFICIAL_MANAGEMENT&status=FINISHED" },
    ]);
  });
});
