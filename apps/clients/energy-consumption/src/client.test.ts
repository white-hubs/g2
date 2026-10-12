import { expect, test } from "bun:test";

import { createEnergyConsumptionClient } from "./client";

function createCaptureHttp(): { http: Parameters<typeof createEnergyConsumptionClient>[0]; urls: string[] } {
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

test("@g2-client/energy-consumption ClassifySettingsPage hits /api/energymanagement collect-config page", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEnergyConsumptionClient(http);
  await api.ClassifySettingsPage();
  expect(urls.some((u) => u.includes("/api/energymanagement/energy-collect-config/page"))).toBe(true);
});

test("@g2-client/energy-consumption deviceList hits meter-device/page", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEnergyConsumptionClient(http);
  await api.deviceList({ pageNumber: 1, pageSize: 10, keyword: "", instrumentType: undefined, deviceAreaId: undefined, total: 0 });
  expect(urls.some((u) => u.includes("GET /api/energymanagement/meter-device/page"))).toBe(true);
});

test("@g2-client/energy-consumption alarmRecords hits /api/alarm", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEnergyConsumptionClient(http);
  await api.alarmRecords({ applicationCode: "energy", pageNumber: 1, pageSize: 10 });
  expect(urls.some((u) => u.includes("GET /api/alarm/alarm-records"))).toBe(true);
});

test("@g2-client/energy-consumption getChargeConfig hits energy-charge-config", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEnergyConsumptionClient(http);
  await api.getChargeConfig({ instrumentType: "electricity_meter" });
  expect(urls.some((u) => u.includes("GET /api/energymanagement/energy-charge-config"))).toBe(true);
  expect(urls.some((u) => u.includes("instrumentType=electricity_meter"))).toBe(true);
});

test("@g2-client/energy-consumption classifyExport posts export path", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEnergyConsumptionClient(http);
  await api.classifyExport({ period: "2024-01" });
  expect(urls.some((u) => u.includes("POST /api/energymanagement/energy-daily-usage/export"))).toBe(true);
});

test("@g2-client/energy-consumption AreaProjectTree hits area-project/tree", async () => {
  const { http, urls } = createCaptureHttp();
  const api = createEnergyConsumptionClient(http);
  await api.AreaProjectTree({ instrumentType: "electricity_meter" });
  expect(urls.some((u) => u.includes("GET /api/energymanagement/area-project/tree"))).toBe(true);
});
