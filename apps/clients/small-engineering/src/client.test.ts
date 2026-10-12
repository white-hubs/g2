import { expect, test } from "bun:test";

import { type HttpClient, createSmallEngineeringClient } from "./client";

test("小散工程 Client 保持旧 loose-works 与消息接口的路径和载荷", async () => {
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
  const client = createSmallEngineeringClient(http);
  await client.projectStatistics({ keyword: "测试" });
  await client.listProjectNodes({ pageNumber: 1, pageSize: 10 });
  await client.listProjectApplies({ businessType: "PROJECT_APPLY", type: "WAITING", pageNumber: 1, pageSize: 10 });
  await client.listSchedules({ pageNumber: 2, pageSize: 20, status: "UNDERWAY" });
  await client.getScheduleDetail("a/b");
  await client.saveSchedule({ projectName: "新工程" });
  await client.deleteSchedules(["one", "two"]);
  await client.listTemporaryPatrols({ pageNumber: 1, pageSize: 10 });
  await client.getTemporaryPatrol("r/1");
  await client.getMessageConfig({ businessType: "SMALL_ENGINEERING", label: "巡查任务" });
  await client.saveMessageConfig({ businessType: "SMALL_ENGINEERING", sceneConfigDTOS: [] });
  expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
    "GET /api/loose-works/project/statistics?keyword=%E6%B5%8B%E8%AF%95",
    "GET /api/loose-works/project/apply/nodeList?pageNumber=1&pageSize=10",
    "GET /api/loose-works/project/apply/list?businessType=PROJECT_APPLY&type=WAITING&pageNumber=1&pageSize=10",
    "GET /api/loose-works/project/schedule/list?pageNumber=2&pageSize=20&status=UNDERWAY",
    "GET /api/loose-works/project/schedule/detail/a%2Fb",
    "POST /api/loose-works/project/schedule/save",
    "POST /api/loose-works/project/schedule/delete",
    "GET /api/loose-works/project/inspect/record/page?pageNumber=1&pageSize=10",
    "GET /api/loose-works/project/inspect/record/detail?id=r%2F1",
    "GET /api/bracing/message/getConfigInfo?businessType=SMALL_ENGINEERING&label=%E5%B7%A1%E6%9F%A5%E4%BB%BB%E5%8A%A1",
    "POST /api/bracing/message/addConfig",
  ]);
  expect(calls.find((call) => call.url.endsWith("/project/schedule/delete"))?.body).toEqual(["one", "two"]);
});
