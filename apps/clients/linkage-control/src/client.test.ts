import { expect, test } from "bun:test";

import { createLinkageClient, type HttpClient } from "./client";

test("联动控制列表和操作保留旧 service 的 URL、method 与参数名", async () => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const http: HttpClient = {
    get: async (url) => { calls.push({ method: "GET", url }); return { data: { records: [], total: 0, pages: 0 } }; },
    post: async (url, body) => { calls.push({ method: "POST", url, body }); return { data: true }; },
    put: async (url, body) => { calls.push({ method: "PUT", url, body }); return { data: true }; },
    delete: async (url) => { calls.push({ method: "DELETE", url }); return { data: true }; },
  };
  const client = createLinkageClient(http);
  await client.pageRules("condition", { pageNumber: 1, pageSize: 10, keyword: "温度", enabled: false });
  await client.pageRules("scene", { pageNumber: 2, pageSize: 20 });
  await client.pageEvents({ pageNumber: 1, pageSize: 10, applicationCode: "DEVICE", businessType: "DEVICE_CONDITION" });
  await client.setRuleEnabled("r1", true);
  await client.triggerScene("s1", "123456");
  await client.deleteRules(["r1", "r2"]);
  expect(calls).toEqual([
    { method: "GET", url: "/api/linkage/rule-device-conditions?pageNumber=1&pageSize=10&keyword=%E6%B8%A9%E5%BA%A6&enabled=false" },
    { method: "GET", url: "/api/linkage/rule-scenes?pageNumber=2&pageSize=20" },
    { method: "GET", url: "/api/linkage/events?pageNumber=1&pageSize=10&applicationCode=DEVICE&businessType=DEVICE_CONDITION" },
    { method: "PUT", url: "/api/linkage/rule/enabled/r1/true" },
    { method: "POST", url: "/api/linkage/rule-scene/trigger", body: { id: "s1", password: "123456" } },
    { method: "DELETE", url: "/api/linkage/rule/batch?ids=r1%2Cr2" },
  ]);
});

test("联动列表拒绝无法辨认的分页响应", async () => {
  const client = createLinkageClient({
    get: async () => ({ data: [] }), post: async () => undefined, put: async () => undefined, delete: async () => undefined,
  });
  await expect(client.pageRules("time", { pageNumber: 1, pageSize: 10 })).rejects.toThrow("联动控制列表响应格式错误");
});

test("事件详情关联旧版物联、视频和消息记录接口", async () => {
  const calls: string[] = [];
  const http: HttpClient = {
    get: async (url) => { calls.push(url); return []; },
    post: async () => undefined, put: async () => undefined, delete: async () => undefined,
  };
  const client = createLinkageClient(http);
  await client.getEventDevices("event-1");
  await client.getEventDeviceRecords("event-1");
  await client.getEventVideos("event-1");
  await client.getEventVideoRecords("event-1");
  await client.getEventVideoFiles("event-1");
  await client.getEventMessageRecords("event-1");
  expect(calls).toEqual([
    "/api/linkage/event-iot-device-pros/event-1",
    "/api/linkage/event-iot-device-pro-records/event-1",
    "/api/linkage/event-video/event-1",
    "/api/linkage/event-video-records/event-1",
    "/api/linkage/event-video-file-paths/event-1",
    "/api/message2/msg-record/targets/event-1",
  ]);
});
