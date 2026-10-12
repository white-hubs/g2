import { expect, test } from "bun:test";

import { createSecureEduClient } from "./client";
test("普通模式与总部模式共用 Client，但保持普通统计、规则、发布接口原契约", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      return { records: [], total: 0 };
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      return url.includes("download=true") ? new Blob(["xlsx"]) : { success: 1, fail: 0 };
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ method: "PUT", url, body });
    },
    delete: async (url: string) => {
      calls.push({ method: "DELETE", url });
    },
  };
  const client = createSecureEduClient(http).market;
  await client.page("training-count", { pageNumber: 2, pageSize: 20, cultivateTarget: "STAFF", period: "2026-10-08" });
  await client.page("exam-count", { organizationId: "department-1", passed: false });
  await client.detail("paper-question-rule", "rule/1");
  await client.save("paper-question-rule", { ruleName: "单选", items: [] }, "1");
  await client.setPublished("training-task", "1", true);
  await client.setPublished("exam-task", "2", false);
  await client.taskPaper("task-1", "paper-2");
  await client.taskPaper("task-3", "paper-4", true);
  await client.export("training-details", { cultivateTaskId: "1", userSignStatus: "UNSIGNED" });
  expect(calls.map((item) => item.url)).toEqual([
    "/gw-bff/secure-edu/api/safety-education/cultivate-task/page/extendStat?pageNumber=2&pageSize=20&cultivateTarget=STAFF&period=2026-10-08",
    "/gw-bff/secure-edu/api/safety-education/exam-task-statistics/page?organizationId=department-1&passed=false",
    "/gw-bff/secure-edu/api/safety-education/exam-question-rule/detail/rule%2F1",
    "/gw-bff/secure-edu/api/safety-education/exam-question-rule/change",
    "/gw-bff/secure-edu/api/safety-education/cultivate-task/1/update/PUBLISHED",
    "/gw-bff/secure-edu/api/safety-education/exam-task/withdraw/2",
    "/gw-bff/secure-edu/api/safety-education/exam-task/task-1/paper/paper-2",
    "/gw-bff/secure-edu/api/safety-education/headquarters/exam-task/task-3/paper/paper-4",
    "/gw-bff/secure-edu/api/safety-education/cultivate-task-user/export?download=true",
  ]);
  expect(calls[3]?.body).toEqual({ ruleName: "单选", items: [], id: "1" });
});
test("数组规则列表正常归一化；消息使用原 message 服务；考题上传保持 multipart", async () => {
  const calls: { url: string; body?: unknown }[] = [];
  const http = {
    get: async (url: string) => {
      calls.push({ url });
      return [{ id: "1", ruleName: "规则" }];
    },
    post: async (url: string, body?: unknown) => {
      calls.push({ url, body });
      return { success: 1 };
    },
    put: async (url: string, body?: unknown) => {
      calls.push({ url, body });
    },
    delete: async () => undefined,
  };
  const client = createSecureEduClient(http).market;
  expect((await client.page("paper-question-rule", {})).total).toBe(1);
  await client.messages();
  await client.saveMessages([], false);
  await client.importQuestions(new Blob(["excel"]));
  expect(calls[0]?.url).toBe("/gw-bff/secure-edu/api/safety-education/exam-question-rule/list");
  expect(calls[1]?.url).toBe("/api/message/sat-msg-configs?satMsgDefineCodes=EXAM_TASK_PUBLISHED%2CCULTIVATE_TASK_PUBLISHED");
  expect(calls[2]).toEqual({ url: "/api/message/sat-msg-config", body: { params: [] } });
  const upload = calls[3]?.body;
  expect(upload).toBeInstanceOf(FormData);
  if (!(upload instanceof FormData)) {
    throw new TypeError("考题上传必须保持 FormData");
  }
  expect(upload.get("file")).toBeInstanceOf(Blob);
});
