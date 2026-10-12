import { expect, test } from "bun:test";

import { createElectronicPatrolClient, type HttpClient } from "./client";

test("电子巡更客户端保留旧系统真实接口和参数", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return { data: { records: [], total: 0 } };
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return { data: true };
    },
    put: async (url, body) => {
      calls.push({ method: "PUT", url, body });
      return { data: true };
    },
    delete: async (url) => {
      calls.push({ method: "DELETE", url });
      return { data: true };
    },
  };
  const client = createElectronicPatrolClient(http);
  await client.pagePlans({ pageNumber: 1, pageSize: 10, executeData: "07:00-09:00", status: "ENABLE" });
  await client.pageTasks({ pageNumber: 2, pageSize: 20, taskState: "FINISHED", admin: false });
  await client.removeTasks(["a", "b"]);
  await client.pageRouteStatistics({ pageNumber: 1, pageSize: 10, period: "2026-09-01,2026-09-29" });
  expect(calls).toEqual([
    {
      method: "GET",
      url: "/api/maintain/electron/getPalnPage?pageNumber=1&pageSize=10&executeData=07%3A00-09%3A00&status=ENABLE",
    },
    { method: "GET", url: "/api/maintain/electron/task/queryTaskPage?pageNumber=2&pageSize=20&taskState=FINISHED&admin=false" },
    { method: "PUT", url: "/api/maintain/electron/task/remove-batch", body: { taskIdList: ["a", "b"] } },
    { method: "GET", url: "/api/maintain/electron/statistics/patrolRoute?pageNumber=1&pageSize=10&period=2026-09-01%2C2026-09-29" },
  ]);
});

test("任务详情自身的 data 巡更点字段不会被重复解包", async () => {
  const detail = { id: "task-1", taskName: "巡更任务", executePeriod: ["08:00-10:00"], data: [{ id: "point-1" }] };
  const clientFor = (response: unknown) =>
    createElectronicPatrolClient({
      get: async () => response,
      post: async () => ({ data: true }),
      put: async () => ({ data: true }),
      delete: async () => ({ data: true }),
    });

  await expect(clientFor(detail).getTask("task-1")).resolves.toEqual(detail);
  await expect(clientFor({ code: 200, data: detail }).getTask("task-1")).resolves.toEqual(detail);
});
