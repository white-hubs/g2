import { expect, test } from "bun:test";

import { createEmergencyDispatchClient } from "./client";

function createCaptureHttp(): { http: Parameters<typeof createEmergencyDispatchClient>[0]; urls: string[] } {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(`GET ${url}`);
      return {};
    },
    post: async (url: string, body?: unknown) => {
      urls.push(`POST ${url}`);
      void body;
      return {};
    },
    put: async (url: string, body?: unknown) => {
      urls.push(`PUT ${url}`);
      void body;
      return {};
    },
    delete: async (url: string) => {
      urls.push(`DELETE ${url}`);
      return {};
    },
  };
  return { http, urls };
}

test("@g2-client/emergency-dispatch pageResourceRefs hits /api/emergency path", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEmergencyDispatchClient(http);
  await api.pageResourceRefs({ pageNumber: 1, pageSize: 10, refType: "DEVICE" });
  expect(urls.some((u) => u.includes("/api/emergency/resource-refs/page"))).toBe(true);
});

test("@g2-client/emergency-dispatch createResourceRef posts payload body", async () => {
  const urls: string[] = [];
  let postedBody: unknown;
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return {};
    },
    post: async (url: string, body?: unknown) => {
      urls.push(url);
      postedBody = body;
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
  const api = createEmergencyDispatchClient(http);
  const payload = [{ refType: "DEVICE", refId: "d-1" }];
  await api.createResourceRef(payload);
  expect(urls.some((u) => u.includes("/api/emergency/resource-refs"))).toBe(true);
  expect(postedBody).toEqual(payload);
});

test("@g2-client/emergency-dispatch pageEvacuationRoutes hits /api/emergency path", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEmergencyDispatchClient(http);
  await api.pageEvacuationRoutes({ pageNumber: 1, pageSize: 10, areaId: "a-1" });
  expect(urls.some((u) => u.includes("GET /api/emergency/evacuation-routes/page"))).toBe(true);
  expect(urls.some((u) => u.includes("areaId=a-1"))).toBe(true);
});

test("@g2-client/emergency-dispatch updateEvacuationRouteDevices hits devices path", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEmergencyDispatchClient(http);
  await api.updateEvacuationRouteDevices("route-1", { deviceIds: ["d-1"] });
  expect(urls.some((u) => u.includes("PUT /api/emergency/evacuation-routes/route-1/devices"))).toBe(true);
});

test("@g2-client/emergency-dispatch getAreaTree hits mdata area list", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEmergencyDispatchClient(http);
  await api.getAreaTree();
  expect(urls.some((u) => u.includes("GET /api/mdata/area/list"))).toBe(true);
});

test("@g2-client/emergency-dispatch listAreaPlaneMapsByAreaId hits /api/emergency path", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEmergencyDispatchClient(http);
  await api.listAreaPlaneMapsByAreaId("area-1");
  expect(urls.some((u) => u.includes("GET /api/emergency/area-plane-maps/area/area-1"))).toBe(true);
});
