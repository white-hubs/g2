import { expect, test } from "bun:test";

import { createVideoMonitorClient } from "./client";

test("@g2-client/video-monitor createCameraAuth hits expected path", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return {};
    },
    post: async (url: string) => {
      urls.push(url);
      return {};
    },
    put: async (url: string) => {
      urls.push(url);
      return {};
    },
    delete: async (url: string) => {
      urls.push(url);
      return {};
    },
  };
  const api = createVideoMonitorClient(http);
  await (api.createCameraAuth as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/video-monitor/camera-auths"))).toBe(true);
});

test("@g2-client/video-monitor preserves permission and AI inspection API paths", async () => {
  const calls: { method: string; url: string }[] = [];
  const http = {
    get: async (url: string) => (calls.push({ method: "GET", url }), {}),
    post: async (url: string) => (calls.push({ method: "POST", url }), {}),
    put: async (url: string) => (calls.push({ method: "PUT", url }), {}),
    patch: async (url: string) => (calls.push({ method: "PATCH", url }), {}),
    delete: async (url: string) => (calls.push({ method: "DELETE", url }), {}),
  };
  const api = createVideoMonitorClient(http);
  await api.listAuthGroup({ pageNumber: 1, pageSize: 10 });
  await api.getCameraAuth("auth-1");
  await api.listAiInspectionPlans({ pageNumber: 1, pageSize: 10 });
  await api.patchAiInspectionPlan("plan-1", { base: {} });
  await api.listAiInspectionTasks({ pageNumber: 1, pageSize: 10 });
  await api.listAiInspectionEvents({ taskId: "task-1" });

  expect(calls).toEqual([
    { method: "GET", url: "/gw-bff/video-monitor/camera-auths?pageNumber=1&pageSize=10" },
    { method: "GET", url: "/gw-bff/video-monitor/camera-auths/auth-1" },
    { method: "GET", url: "/gw-bff/video-monitor/camera-ai-inspection-plans?pageNumber=1&pageSize=10" },
    { method: "PATCH", url: "/gw-bff/video-monitor/camera-ai-inspection-plan/plan-1" },
    { method: "GET", url: "/gw-bff/video-monitor/camera-ai-inspection-tasks?pageNumber=1&pageSize=10" },
    { method: "GET", url: "/gw-bff/video-monitor/camera-ai-inspection-events?taskId=task-1" },
  ]);
});
