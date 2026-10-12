import { expect, test } from "bun:test";

import { type HttpClient, createRenovationClient } from "./client";

test("更新改造 Client 保持旧 /api/maintain/retrofit 路径与参数", async () => {
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
  const client = createRenovationClient(http);

  await client.pageOrders({
    pageNumber: 2,
    pageSize: 20,
    businessType: "RETROFIT",
    type: "WAITING",
    status: "ACTIVE",
    submitTime: "2024-01-01,2024-01-31",
  });
  await client.pageTickets({
    pageNumber: 1,
    pageSize: 10,
    retrofitTicketStatus: "WAITING_HANDLE",
    keyword: "空调",
    period: "2024-01-01 00:00:00,2024-01-31 23:59:59",
  });
  await client.getTicket("t/1");
  await client.deleteTicket("t1");
  await client.submitTicketAssessment({ retrofitTicketId: "t1", score: 4, description: "好", imageIdList: ["f1"] });
  await client.getReceipt("r1");
  await client.listNotifyChannels();
  await client.getTrafficConfig();
  await client.saveTrafficConfig({ channelTypes: ["SITE"], configs: [] });
  await client.listSatMsgConfigs("MAINTAIN_RETROFIT_RECEIPT_CONFIRM,MAINTAIN_RETROFIT_RECEIPT_ASSESSMENT");
  await client.createSatMsgConfigs([{ satMsgDefineCode: "MAINTAIN_RETROFIT_RECEIPT_CONFIRM", enabled: true }]);
  await client.updateSatMsgConfigs([{ satMsgDefineCode: "MAINTAIN_RETROFIT_RECEIPT_ASSESSMENT", enabled: false }]);

  expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
    "GET /api/maintain/retrofit-order/page?pageNumber=2&pageSize=20&businessType=RETROFIT&type=WAITING&status=ACTIVE&submitTime=2024-01-01%2C2024-01-31",
    "GET /api/maintain/retrofit/ticket/page?pageNumber=1&pageSize=10&retrofitTicketStatus=WAITING_HANDLE&keyword=%E7%A9%BA%E8%B0%83&period=2024-01-01+00%3A00%3A00%2C2024-01-31+23%3A59%3A59",
    "GET /api/maintain/retrofit/ticket/t%2F1",
    "DELETE /api/maintain/retrofit/ticket/t1",
    "POST /api/maintain/retrofit/ticket/assessment",
    "GET /api/maintain/retrofit/receipt/r1",
    "GET /api/maintain/retrofit/ticket/confirm-user/notify-channels",
    "GET /api/maintain/retrofit/ticket/confirm-user",
    "POST /api/maintain/retrofit/ticket/collocate-confirm-user",
    "GET /api/message/sat-msg-configs?satMsgDefineCodes=MAINTAIN_RETROFIT_RECEIPT_CONFIRM%2CMAINTAIN_RETROFIT_RECEIPT_ASSESSMENT",
    "POST /api/message/sat-msg-config",
    "PUT /api/message/sat-msg-config",
  ]);
  expect(calls.find((call) => call.url.endsWith("/ticket/assessment"))?.body).toEqual({
    retrofitTicketId: "t1",
    score: 4,
    description: "好",
    imageIdList: ["f1"],
  });
  expect(calls.find((call) => call.method === "POST" && call.url.endsWith("/sat-msg-config"))?.body).toEqual({
    params: [{ satMsgDefineCode: "MAINTAIN_RETROFIT_RECEIPT_CONFIRM", enabled: true }],
  });
});
