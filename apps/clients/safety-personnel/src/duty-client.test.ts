import { describe, expect, test } from "bun:test";

import { createDutyClient } from "./duty-client";

describe("safety duty transport parity", () => {
  test("overview, details and score queries retain scope and period parameters", async () => {
    const urls: string[] = [];
    const http = {
      get: async (url: string) => {
        urls.push(url);
        return {};
      },
      post: async () => ({}),
      put: async () => ({}),
      delete: async () => undefined,
    };
    const client = createDutyClient(http);
    await client.listDutyRoleAssignments({ industryType: "INDUSTRY_TRADE" });
    await client.getDutyAssignmentOverviewStatistics({ periodType: "QUARTER", periodStartTime: "2026-07-01 00:00:00" });
    await client.listDutyAssignmentOverviewRoleGroups({ roleName: "主要负责人", keyword: "张 & 李" });
    await client.getDutyAssignment(12, { periodType: "MONTH" });
    await client.getCurrentDutyAssignment({ itemStatus: "PENDING", periodType: "YEAR" });
    await client.getDutyScoreDashboardSummary({ periodType: "QUARTER", periodValue: "2026-Q3" });
    await client.getDutyPersonalScoreReport(101, { periodType: "MONTH", periodValue: "2026-09" });
    const queries = urls.map((url) => new URL(url, "http://test"));
    expect(queries[0].searchParams.get("industryType")).toBe("INDUSTRY_TRADE");
    expect(queries[1].searchParams.get("periodStartTime")).toBe("2026-07-01 00:00:00");
    expect(queries[2].searchParams.get("keyword")).toBe("张 & 李");
    expect(queries[3].pathname).toEndWith("/duty-assignments/12");
    expect(queries[3].searchParams.get("periodType")).toBe("MONTH");
    expect(queries[4].searchParams.get("itemStatus")).toBe("PENDING");
    expect(queries[5].searchParams.get("periodValue")).toBe("2026-Q3");
    expect(queries[6].searchParams.get("periodValue")).toBe("2026-09");
  });
  test("writes preserve body and method; binary exports remain Blob", async () => {
    const calls: { method: string; url: string; body?: unknown }[] = [];
    const blob = new Blob(["ranking"], { type: "application/vnd.ms-excel" });
    const client = createDutyClient({
      get: async () => ({}),
      post: async (url, body) => {
        calls.push({ method: "POST", url, body });
        return url.endsWith("exports") ? blob : [];
      },
      put: async (url, body) => {
        calls.push({ method: "PUT", url, body });
        return {};
      },
      delete: async (url) => {
        calls.push({ method: "DELETE", url });
      },
    });
    await client.signDutyAssignment({ assignmentIds: [1, 2], confirmed: true });
    await client.deleteDutyTemplateItem(11);
    expect(calls[0]).toEqual({
      method: "POST",
      url: "/gw-bff/safety-personnel/duty-signatures",
      body: { assignmentIds: [1, 2], confirmed: true },
    });
    expect(calls[1]).toEqual({ method: "DELETE", url: "/gw-bff/safety-personnel/duty-template-items/11" });
    expect(await client.exportDutyScoreRankings({ periodType: "MONTH", periodValue: "2026-09" })).toBe(blob);
  });
});
