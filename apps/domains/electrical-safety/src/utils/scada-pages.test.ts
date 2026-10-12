import { createElectricalSafetyClient } from "@g2-client/electrical-safety/client";
import { createFakeDomainContext } from "@g2-composition/contract";
import { beforeAll, describe, expect, it } from "bun:test";

import * as scadaCoreFixture from "../../../../platforms/pc-scada/vendor/core";
import { installElectricalSafetyScada } from "../pc-scada-runtime";
import {
  fetchDeviceScadaPageByProduct,
  fetchElectricalCenterPage,
  fetchFacilityRoomPages,
  fetchMultiDevicePages,
  filterPagesByScope,
  parseElectricalCenterRef,
  parseLegacySceneScopeFromPageContent,
  toDeviceScadaPageSummary,
  toFacilityRoomPageSummary,
  toMultiDevicePageSummary,
  toScadaPageSummary,
} from "./scada-pages";

beforeAll(async () => {
  const context = createFakeDomainContext({
    loadRuntimeCommon: async <T>(_name: string, exposed: string): Promise<T> => (exposed === "core" ? scadaCoreFixture : {}) as T,
  });
  await installElectricalSafetyScada(context);
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("scada page parsing", () => {
  it("reads only legacy scene scopes for transitional business binding", () => {
    expect(parseLegacySceneScopeFromPageContent(JSON.stringify({ sceneScope: "facilityRoom" }))).toBe("facilityRoom");
    expect(parseLegacySceneScopeFromPageContent(JSON.stringify({ page: { sceneScope: "electricalCenter" } }))).toBe("electricalCenter");
    expect(parseLegacySceneScopeFromPageContent(JSON.stringify({ sceneScope: "multiDevice" }))).toBeUndefined();
    expect(parseLegacySceneScopeFromPageContent("{}")).toBeUndefined();
    expect(parseLegacySceneScopeFromPageContent("not-json")).toBeUndefined();
  });

  it("keeps only electrical facility-room pages for binding", () => {
    const pages = [
      toScadaPageSummary({ id: "c", name: "中心" }, JSON.stringify({ sceneScope: "electricalCenter" })),
      toScadaPageSummary({ id: "r", name: "一号配电房" }, JSON.stringify({ sceneScope: "facilityRoom" })),
      toScadaPageSummary({ id: "d", name: "设备页" }, JSON.stringify({ sceneScope: "device" })),
    ];
    expect(filterPagesByScope(pages, "facilityRoom")).toEqual([{ id: "r", name: "一号配电房", sceneScope: "facilityRoom" }]);
  });

  it("accepts electrical-center lookup payload and rejects empty results", () => {
    expect(parseElectricalCenterRef({ id: "page-1", name: "园区电气中心" })).toEqual({
      id: "page-1",
      name: "园区电气中心",
    });
    expect(parseElectricalCenterRef(null)).toBeNull();
    expect(parseElectricalCenterRef({})).toBeNull();
  });

  it("derives multi-device pages and exposes required binding elements", () => {
    const summary = toMultiDevicePageSummary(
      { id: "center-page", name: "园区电气中心" },
      JSON.stringify({
        sceneScope: "singleDevice",
        elements: [
          {
            id: "room-a",
            type: "product-property-panel",
            label: "图元 A",
            propertyBindName: "一号配电房",
            deviceBinding: "required",
          },
          { id: "room-b", label: "图元 B", deviceBinding: "required" },
          { id: "decorator", label: "装饰", deviceBinding: "off" },
        ],
      }),
    );

    expect(summary).toEqual({
      id: "center-page",
      name: "园区电气中心",
      sceneScope: "multiDevice",
      bindableElements: [
        { id: "room-a", name: "一号配电房", type: "product-property-panel" },
        { id: "room-b", name: "图元 B" },
      ],
    });
  });

  it("accepts bindable new pages and only the facility-room legacy page", () => {
    expect(
      toFacilityRoomPageSummary(
        { id: "single", name: "单设备" },
        JSON.stringify({ elements: [{ id: "device-panel", label: "设备面板", deviceBinding: "required" }] }),
      ),
    ).toEqual({
      id: "single",
      name: "单设备",
      sceneScope: "singleDevice",
      bindableElements: [{ id: "device-panel", name: "设备面板" }],
    });
    expect(
      toFacilityRoomPageSummary(
        { id: "legacy-center", name: "旧中心" },
        JSON.stringify({ sceneScope: "electricalCenter", elements: [{ id: "a", deviceBinding: "required" }] }),
      ),
    ).toBeNull();
    expect(toFacilityRoomPageSummary({ id: "decorative", name: "装饰页" }, JSON.stringify({ elements: [] }))).toBeNull();
  });

  it("matches only single-device pages bound to the requested product", () => {
    expect(
      toDeviceScadaPageSummary(
        { id: "device-page", name: "电气传感器" },
        JSON.stringify({
          product: { id: "electric-sensor", name: "电气传感器" },
          elements: [{ id: "meter" }, { id: "label" }, { id: "meter" }, { id: "" }],
        }),
        "electric-sensor",
      ),
    ).toEqual({
      id: "device-page",
      name: "电气传感器",
      sceneScope: "singleDevice",
      elementIds: ["meter", "label"],
    });
    expect(
      toDeviceScadaPageSummary(
        { id: "other", name: "其他产品" },
        JSON.stringify({ product: { id: "other-product" }, elements: [] }),
        "electric-sensor",
      ),
    ).toBeNull();
    expect(
      toDeviceScadaPageSummary(
        { id: "multi", name: "多设备" },
        JSON.stringify({
          product: { id: "electric-sensor" },
          elements: [
            { id: "a", deviceBinding: "required" },
            { id: "b", deviceBinding: "required" },
          ],
        }),
        "electric-sensor",
      ),
    ).toBeNull();
  });
});

describe("scada page fetch", () => {
  it("returns the configured electrical-center page", async () => {
    const fetcher = async (input: string | URL | Request) => {
      expect(String(input)).toBe("/scada/api/pages/electrical-center");
      return jsonResponse({ id: "center-1", name: "电气中心" });
    };
    await expect(fetchElectricalCenterPage(scadaClient(fetcher))).resolves.toEqual({ id: "center-1", name: "电气中心" });
  });

  it("treats a missing electrical-center page as unbound", async () => {
    const fetcher = async () => jsonResponse(null);
    await expect(fetchElectricalCenterPage(scadaClient(fetcher))).resolves.toBeNull();
  });

  it("lists bindable new pages and legacy facility-room pages after hydrating content", async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/scada/api/pages/") {
        return jsonResponse([
          { id: "room-1", name: "一号房" },
          { id: "single-1", name: "单设备页" },
          { id: "multi-1", name: "多设备页" },
          { id: "device-1", name: "设备页" },
        ]);
      }
      if (url === "/scada/api/pages/room-1") {
        return jsonResponse({ content: JSON.stringify({ sceneScope: "facilityRoom" }) });
      }
      if (url === "/scada/api/pages/device-1") {
        return jsonResponse({ content: JSON.stringify({ sceneScope: "device" }) });
      }
      if (url === "/scada/api/pages/single-1") {
        return jsonResponse({ content: JSON.stringify({ elements: [{ id: "a", deviceBinding: "required" }] }) });
      }
      if (url === "/scada/api/pages/multi-1") {
        return jsonResponse({
          content: JSON.stringify({
            elements: [
              { id: "a", deviceBinding: "required" },
              { id: "b", deviceBinding: "required" },
            ],
          }),
        });
      }
      return jsonResponse({}, 404);
    };
    await expect(fetchFacilityRoomPages(scadaClient(fetcher))).resolves.toEqual([
      { id: "room-1", name: "一号房", sceneScope: "facilityRoom" },
      {
        id: "single-1",
        name: "单设备页",
        sceneScope: "singleDevice",
        bindableElements: [{ id: "a", name: "a" }],
      },
      {
        id: "multi-1",
        name: "多设备页",
        sceneScope: "multiDevice",
        bindableElements: [
          { id: "a", name: "a" },
          { id: "b", name: "b" },
        ],
      },
    ]);
  });

  it("lists only pages derived as multi-device for electrical-center binding", async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/scada/api/pages/") {
        return jsonResponse([
          { id: "multi-1", name: "多设备页" },
          { id: "single-1", name: "单设备页" },
        ]);
      }
      if (url === "/scada/api/pages/multi-1") {
        return jsonResponse({
          content: JSON.stringify({
            elements: [
              { id: "a", deviceBinding: "required" },
              { id: "b", deviceBinding: "required" },
            ],
          }),
        });
      }
      if (url === "/scada/api/pages/single-1") {
        return jsonResponse({ content: JSON.stringify({ elements: [{ id: "a", deviceBinding: "required" }] }) });
      }
      return jsonResponse({}, 404);
    };

    await expect(fetchMultiDevicePages(scadaClient(fetcher))).resolves.toEqual([
      {
        id: "multi-1",
        name: "多设备页",
        sceneScope: "multiDevice",
        bindableElements: [
          { id: "a", name: "a" },
          { id: "b", name: "b" },
        ],
      },
    ]);
  });

  it("finds the first single-device page matching the device product", async () => {
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/scada/api/pages/") {
        return jsonResponse([
          { id: "other", name: "其他产品" },
          { id: "matched", name: "电气传感器" },
        ]);
      }
      if (url === "/scada/api/pages/other") {
        return jsonResponse({ content: JSON.stringify({ product: { id: "other-product" }, elements: [] }) });
      }
      if (url === "/scada/api/pages/matched") {
        return jsonResponse({
          content: JSON.stringify({
            page: {
              product: { id: "electric-sensor" },
              elements: [{ id: "meter" }, { id: "status" }],
            },
          }),
        });
      }
      return jsonResponse({}, 404);
    };

    await expect(fetchDeviceScadaPageByProduct("electric-sensor", scadaClient(fetcher))).resolves.toEqual({
      id: "matched",
      name: "电气传感器",
      sceneScope: "singleDevice",
      elementIds: ["meter", "status"],
    });
    await expect(fetchDeviceScadaPageByProduct("missing", scadaClient(fetcher))).resolves.toBeNull();
  });
});

function scadaClient(fetcher: (url: string) => Promise<Response>) {
  const unsupported = async (): Promise<never> => {
    throw new Error("测试不允许写请求");
  };
  return createElectricalSafetyClient({
    get: async (url) => {
      const response = await fetcher(url);
      if (!response.ok) {
        throw Object.assign(new Error("请求失败"), { status: response.status });
      }
      return response.json();
    },
    post: unsupported,
    put: unsupported,
    delete: unsupported,
  });
}
