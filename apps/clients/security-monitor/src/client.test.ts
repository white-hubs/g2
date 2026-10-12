import { expect, test } from "bun:test";

import { SecurityMonitorClient } from "./client";

function fakeHttp() {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  return {
    calls,
    http: {
      get: async (url: string) => (calls.push({ method: "GET", url }), {}),
      post: async (url: string, body?: unknown) => (calls.push({ method: "POST", url, body }), {}),
      put: async (url: string, body?: unknown) => (calls.push({ method: "PUT", url, body }), {}),
      delete: async (url: string, init?: RequestInit) => (
        calls.push({ method: "DELETE", url, body: init?.body ? JSON.parse(String(init.body)) : undefined }),
        {}
      ),
    },
  };
}

test("security-monitor patrol requests use the absolute BFF path", async () => {
  const { calls, http } = fakeHttp();
  const client = new SecurityMonitorClient(http);

  await client.listPatrolLines({ pageNumber: 1, pageSize: 10, name: "" });
  await client.togglePatrolLine("line-1", true);
  await client.capturePatrolSnapshot({ deviceId: "camera-1" });
  await client.exportPatrolStatistics({ period: "2026-08-01,2026-08-24" });

  expect(calls).toEqual([
    {
      method: "GET",
      url: "/gw-bff/security-monitor/vmonitor/camera-patrol-lines?pageNumber=1&pageSize=10",
    },
    {
      method: "PUT",
      url: "/gw-bff/security-monitor/vmonitor/camera-patrol-line/line-1/true",
      body: undefined,
    },
    {
      method: "POST",
      url: "/gw-bff/security-monitor/vmonitor/camera-patrol-record/snap-capture",
      body: { deviceId: "camera-1" },
    },
    {
      method: "POST",
      url: "/gw-bff/security-monitor/vmonitor/camera-patrol-line-statistics/list/export",
      body: { period: "2026-08-01,2026-08-24" },
    },
  ]);
});

test("monitoring permission requests preserve the legacy vmonitor contract", async () => {
  const { calls, http } = fakeHttp();
  const client = new SecurityMonitorClient(http);

  await client.listDeviceAuthorizations({ pageNumber: 1, pageSize: 9999, applicationCode: "SECURITY_MONITORING" });
  await client.listUserDeviceAuthorizations({ pageNumber: 1, pageSize: 500, keyword: "张" });
  await client.assignDeviceAuthorization({ securityDeviceId: ["device-1"], userList: [{ userId: "user-1", userName: "张三" }] });
  await client.removeDeviceAuthorization("user-1", "device-1");
  await client.clearUserDeviceAuthorizations(["user-1"]);
  await client.clearDeviceUserAuthorizations(["device-1"]);

  expect(calls).toEqual([
    {
      method: "GET",
      url: "/gw-bff/security-monitor/vmonitor/security/device/auth/getPage?pageNumber=1&pageSize=1000&applicationCode=SECURITY_MONITORING",
    },
    {
      method: "GET",
      url: "/gw-bff/security-monitor/vmonitor/security/user/device/auth/getPage?pageNumber=1&pageSize=500&keyword=%E5%BC%A0",
    },
    {
      method: "POST",
      url: "/gw-bff/security-monitor/vmonitor/security/device/auth/insert",
      body: { securityDeviceId: ["device-1"], userList: [{ userId: "user-1", userName: "张三" }] },
    },
    {
      method: "DELETE",
      url: "/gw-bff/security-monitor/vmonitor/security/device/auth/delete?userId=user-1&securityDeviceId=device-1",
      body: undefined,
    },
    {
      method: "DELETE",
      url: "/gw-bff/security-monitor/vmonitor/security/auth/batch/delete/users",
      body: { userIds: ["user-1"] },
    },
    {
      method: "DELETE",
      url: "/gw-bff/security-monitor/vmonitor/security/auth/batch/delete/devices",
      body: { deviceIds: ["device-1"] },
    },
  ]);
});

test("video paging is capped at the backend maximum", async () => {
  const { calls, http } = fakeHttp();
  const client = new SecurityMonitorClient(http);
  await client.listVideoDevices({ pageNumber: 1, pageSize: 9999 });
  await client.listVideoCollections({ pageNumber: 1, pageSize: 9999 });
  expect(calls.map((call) => call.url)).toEqual([
    "/gw-bff/security-monitor/vmonitor/multiple-video/devices?pageNumber=1&pageSize=1000",
    "/gw-bff/security-monitor/vmonitor/multiple-video-collects?pageNumber=1&pageSize=1000",
  ]);
});
