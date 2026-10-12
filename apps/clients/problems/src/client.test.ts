import { expect, test } from "bun:test";

import { type HttpClient, createProblemsClient } from "./client";

test("流程、统计、配置请求沿用旧服务真实前缀和参数", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return { data: { records: [], total: 0 } };
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return { data: null };
    },
    put: async (url, body) => {
      calls.push({ method: "PUT", url, body });
      return { data: null };
    },
    delete: async (url) => {
      calls.push({ method: "DELETE", url });
      return { data: null };
    },
  };
  const client = createProblemsClient(http);
  await client.pagePersonal({ pageNumber: 2, pageSize: 20, businessType: "HIDDENDANGER", type: "WAITING" });
  await client.pageRecords({ pageNumber: 1, pageSize: 10, businessType: "HIDDENDANGER" });
  await client.pagePersonnelStatistics({ pageNumber: 1, pageSize: 10, applicationCode: "HIDDENDANGER" });
  await client.listTypes({ hiddenDangerCategoryId: "a/b" });
  await client.updateDegree({ id: "a/b", name: "严重" });
  expect(calls.map((item) => item.url)).toEqual([
    "/api/maintain/hidden/apply/personal?pageNumber=2&pageSize=20&businessType=HIDDENDANGER&type=WAITING",
    "/api/maintain/hidden/apply/all?pageNumber=1&pageSize=10&businessType=HIDDENDANGER",
    "/api/flow/getWordOrderStatisticsByUser?pageNumber=1&pageSize=10&applicationCode=HIDDENDANGER",
    "/api/maintain/hidden-danger-type/list?hiddenDangerCategoryId=a%2Fb",
    "/api/maintain/hidden-danger-level/a%2Fb",
  ]);
  expect(calls[4]?.body).toEqual({ id: "a/b", name: "严重" });
});
