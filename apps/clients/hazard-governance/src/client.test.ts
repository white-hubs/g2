import { describe, expect, test } from "bun:test";

import { createHazardGovernanceClient } from "./client";

function createRecorder() {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return {};
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      return {};
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ method: "PUT", url, body });
      return {};
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
      return {};
    },
  };
  return { calls, api: createHazardGovernanceClient(http) };
}

describe("@g2-client/hazard-governance", () => {
  test("分类树使用旧服务的真实接口路径", async () => {
    const { api, calls } = createRecorder();
    await api.getHazardCategoryTree();
    expect(calls).toEqual([{ method: "GET", url: "/api/hazard-governance/categories/tree" }]);
  });

  test("看板时间筛选参数会传递到三个统计接口", async () => {
    const { api, calls } = createRecorder();
    const params = { timeRange: "MONTH", startTime: "2026-09-01", endTime: "2026-09-28" };
    await Promise.all([
      api.getHazardDashboardSummary(params),
      api.getHazardDashboardCharts(params),
      api.getHazardDashboardRankings({ ...params, dimension: "DEPARTMENT" }),
    ]);
    expect(calls.map((call) => call.url)).toEqual([
      "/api/hazard-governance/hazards/dashboard/summary?timeRange=MONTH&startTime=2026-09-01&endTime=2026-09-28",
      "/api/hazard-governance/hazards/dashboard/charts?timeRange=MONTH&startTime=2026-09-01&endTime=2026-09-28",
      "/api/hazard-governance/hazards/dashboard/rankings?timeRange=MONTH&startTime=2026-09-01&endTime=2026-09-28&dimension=DEPARTMENT",
    ]);
  });

  test("路径参数编码并保持旧服务请求方法", async () => {
    const { api, calls } = createRecorder();
    await api.approveHazardApprovalTask("task/100", { opinion: "同意" });
    expect(calls).toEqual([
      {
        method: "POST",
        url: "/api/hazard-governance/approval-tasks/task%2F100/approve",
        body: { opinion: "同意" },
      },
    ]);
  });
});
