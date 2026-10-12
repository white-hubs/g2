import { expect, test } from "bun:test";

import { type HttpClient, createOutsourceRepairClient } from "./client";

test("委外维修 Client 保持旧 /api/maintain/outsource 路径与参数", async () => {
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
  const client = createOutsourceRepairClient(http);

  await client.pagePersonal({
    pageNumber: 2,
    pageSize: 20,
    businessType: "OUTSOURCE_REPAIR",
    type: "WAITING",
    submitTime: "2024-01-01,2024-01-31",
  });
  await client.listModes();
  await client.createMode({ name: "包年" });
  await client.updateMode({ id: 2, name: "包月" });
  await client.deleteMode("a/b");
  await client.listCompanies();
  await client.updateCompany({ id: 3, name: "甲公司" });
  await client.pageDevices({ pageNumber: 1, pageSize: 10, applicationCode: "OUTSOURCE_REPAIR", keyword: "A B" });
  await client.importDevices(["d1", "d2"]);
  await client.batchRemoveDevices(["d1"]);
  await client.removeDevice("d1");
  await client.listNotifyChannels();
  await client.getTrafficConfig();
  await client.saveTrafficConfig({
    channelTypes: ["SITE"],
    configs: [],
    deDuplicationConfig: { switchSetting: false, duration: null, deDuplicationPeriod: null },
  });
  await client.listSatMsgConfigs("MAINTAIN_OUTSOURCE_REPAIR_DISTRIBUTED,MAINTAIN_OUTSOURCE_REPAIR_SOLVE");

  expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
    "GET /api/maintain/outsource/apply/personal?pageNumber=2&pageSize=20&businessType=OUTSOURCE_REPAIR&type=WAITING&submitTime=2024-01-01%2C2024-01-31",
    "GET /api/maintain/outsource/model/list",
    "POST /api/maintain/outsource/model",
    "PUT /api/maintain/outsource/model",
    "DELETE /api/maintain/outsource/model/a%2Fb",
    "GET /api/maintain/outsource/company/list",
    "PUT /api/maintain/outsource/company/change",
    "GET /api/maintain/outsource/device/list?pageNumber=1&pageSize=10&applicationCode=OUTSOURCE_REPAIR&keyword=A+B",
    "POST /api/maintain/outsource/device/import?deviceInstanceIds=d1&deviceInstanceIds=d2",
    "POST /api/maintain/outsource/device/batchRemove",
    "DELETE /api/maintain/outsource/device/instance/d1",
    "GET /api/maintain/outsource/receipt/confirm-user/notify-channels",
    "GET /api/maintain/outsource/receipt/confirm-user",
    "POST /api/maintain/outsource/receipt/collocate-confirm-user",
    "GET /api/message/sat-msg-configs?satMsgDefineCodes=MAINTAIN_OUTSOURCE_REPAIR_DISTRIBUTED%2CMAINTAIN_OUTSOURCE_REPAIR_SOLVE",
  ]);
  expect(calls.find((call) => call.url.endsWith("/device/batchRemove"))?.body).toEqual({ deviceInstanceIds: ["d1"] });
});

test("委外工单、维修单与流程接口保持旧路径", async () => {
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
  const client = createOutsourceRepairClient(http);

  await client.pageTickets({
    pageNumber: 2,
    pageSize: 20,
    outsourceCompanyId: "c1",
    ticketStatus: "WAIT_HANDLE",
    name: "空调 维修",
    period: "2024-01-01 00:00:00,2024-01-31 23:59:59",
  });
  await client.getTicket("t/1");
  await client.submitTicketAssessment({ outsourceRepairTicketId: "t1", score: 4, description: "好", imageIdList: ["f1"] });
  await client.getTicketAssessment("t1");
  await client.getReceipt("r1");
  await client.deleteReceipt("r1");
  await client.confirmReceipt({ applicationReceiptId: "r1", confirmResult: "CONFIRM_REPAIR", imageIdList: [] });
  await client.getReceiptEventLine("r1");
  await client.getProcessTaskForm("task1");
  await client.completeProcessTask({ taskId: "task1", outcome: "同意" });
  await client.listProcessDefinitions();
  await client.getProcessForm("event1");

  expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
    "GET /api/maintain/outsource/repair/ticket/page?pageNumber=2&pageSize=20&outsourceCompanyId=c1&ticketStatus=WAIT_HANDLE&name=%E7%A9%BA%E8%B0%83+%E7%BB%B4%E4%BF%AE&period=2024-01-01+00%3A00%3A00%2C2024-01-31+23%3A59%3A59",
    "GET /api/maintain/outsource/repair/ticket/t%2F1",
    "POST /api/maintain/outsource/repair/ticket/assessment",
    "GET /api/maintain/outsource/repair/ticket/assessment?ticketId=t1",
    "GET /api/maintain/outsource/repair/application/receipt/r1",
    "DELETE /api/maintain/outsource/repair/application/receipt/r1",
    "POST /api/maintain/outsource/repair/application/confirm",
    "GET /api/maintain/retrofit/receipt/event-line?receiptId=r1",
    "GET /api/process/form/task/task1",
    "POST /api/process/user-tasks/complete",
    "GET /api/process/process-definition/list",
    "GET /api/process/form-value/event/event1",
  ]);
  expect(calls.find((call) => call.url.endsWith("/ticket/assessment") && call.method === "POST")?.body).toEqual({
    outsourceRepairTicketId: "t1",
    score: 4,
    description: "好",
    imageIdList: ["f1"],
  });
  expect(calls.find((call) => call.url.endsWith("/user-tasks/complete"))?.body).toEqual({ taskId: "task1", outcome: "同意" });
});

test("消息配置新增走 POST、更新走 PUT，且整批包在 params 字段", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return { data: [] };
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
  const client = createOutsourceRepairClient(http);
  const configs = [{ satMsgDefineCode: "MAINTAIN_OUTSOURCE_REPAIR_CONFIRM", enabled: true }];
  await client.createSatMsgConfigs(configs);
  await client.updateSatMsgConfigs(configs);
  expect(calls).toEqual([
    { method: "POST", url: "/api/message/sat-msg-config", body: { params: configs } },
    { method: "PUT", url: "/api/message/sat-msg-config", body: { params: configs } },
  ]);
});
