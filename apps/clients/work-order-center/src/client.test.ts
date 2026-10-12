import { describe, expect, test } from "bun:test";

import { createWorkOrderCenterClient } from "./client";

function recorder() {
  const calls: { body?: unknown; method: string; url: string }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      if (url.includes("/export")) {
        return new Blob([]);
      }
      return { records: [], total: 0, pages: 0 };
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ body, method: "POST", url });
      return true;
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ body, method: "PUT", url });
      return true;
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
      return true;
    },
  };
  return { calls, client: createWorkOrderCenterClient(http) };
}

describe("@g2-client/work-order-center", () => {
  test("工单删除列表保留旧服务 allPage 路径和参数名", async () => {
    const { calls, client } = recorder();
    await client.pageWorkOrders({ pageNumber: 2, pageSize: 20, businessType: "FAULT", username: "张三" });
    expect(calls).toEqual([
      {
        method: "GET",
        url: "/api/flow/process/instance/historical/allPage?pageNumber=2&pageSize=20&businessType=FAULT&username=%E5%BC%A0%E4%B8%89",
      },
    ]);
  });

  test("批量删除按旧接口 POST 工单实例 ID 数组", async () => {
    const { calls, client } = recorder();
    await client.deleteWorkOrders(["process-1", "process-2"]);
    expect(calls).toEqual([
      {
        body: ["process-1", "process-2"],
        method: "POST",
        url: "/api/flow/form/instance/form-flows/delete",
      },
    ]);
  });

  test("统计查询、导出和工单类型保留旧服务路径", async () => {
    const { calls, client } = recorder();
    await client.pageStatistics({
      pageNumber: 1,
      pageSize: 10,
      businessType: "FIRE",
      period: "2026-09-01 00:00:00,2026-09-29 23:59:59",
    });
    await client.exportStatistics({ businessType: "FIRE" });
    await client.listBusinessTypes();
    expect(calls.map((item) => item.url)).toEqual([
      "/api/flow/statistics/group/businessType?pageNumber=1&pageSize=10&businessType=FIRE&period=2026-09-01+00%3A00%3A00%2C2026-09-29+23%3A59%3A59",
      "/api/flow/statistics/group/businessType/export?businessType=FIRE",
      "/api/flow/form-business/type/list",
    ]);
  });
});
