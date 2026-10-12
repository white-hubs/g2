import { describe, expect, test } from "bun:test";

import { createFumigationOperationClient } from "./client";

describe("@g2-client/fumigation-operation", () => {
  const createRecorder = (getResult: unknown = {}) => {
    const urls: string[] = [];
    const http = {
      get: async (url: string) => {
        urls.push(`GET ${url}`);
        return getResult;
      },
      post: async (url: string) => {
        urls.push(`POST ${url}`);
        return {};
      },
      put: async (url: string) => {
        urls.push(`PUT ${url}`);
        return {};
      },
      delete: async (url: string) => {
        urls.push(`DELETE ${url}`);
        return {};
      },
    };
    return { api: createFumigationOperationClient(http), urls };
  };

  test("uses the fumigation BFF and preserves list filters", async () => {
    const { api, urls } = createRecorder();
    await api.listFumigationWorks({ pageNumber: 2, pageSize: 20, keyword: "一号仓", status: "EXECUTING" });
    expect(urls[0]).toContain("GET /gw-bff/security-management/fumigation/works?");
    expect(urls[0]).toContain("pageNumber=2");
    expect(urls[0]).toContain("keyword=%E4%B8%80%E5%8F%B7%E4%BB%93");
    expect(urls[0]).toContain("status=EXECUTING");
  });

  test("encodes device ids and joins requested property codes", async () => {
    const { api, urls } = createRecorder();
    await api.getFumigationDeviceProperties("sensor/01", ["PH3", "O2"]);
    expect(urls[0]).toBe("GET /gw-bff/security-management/fumigation/devices/sensor%2F01/properties?propertyCodes=PH3%2CO2");
  });

  test("normalizes dispatch map dictionary values", async () => {
    const { api } = createRecorder({
      data: [
        { code: "lnglat", variable: "116.397,39.908" },
        { code: "radius", variable: "1200" },
      ],
    });
    await expect(api.getFumigationDispatchMapConfig()).resolves.toEqual({
      center: { lng: 116.397, lat: 39.908 },
      radius: 1200,
    });
  });
});
