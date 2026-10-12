import { expect, test } from "bun:test";

import { createAccessControlClient } from "./client";

test("@g2-client/access-control getEnterpriseDirectory hits expected path", async () => {
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
  const api = createAccessControlClient(http);
  await (api.getEnterpriseDirectory as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/access-control/enterprise-directory"))).toBe(true);
});

test("@g2-client/access-control getDoorType / getDoorDevicePage match BFF paths (absorbs legacy service surface)", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return {};
    },
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  };
  const api = createAccessControlClient(http);
  await api.getDoorType({ applicationCode: "ACCESS_CONTROL" });
  await api.getDoorDevicePage({
    pageSize: 10,
    pageNumber: 1,
    type: "",
    doorArea: "",
    keyword: "",
    applicationCode: "ACCESS_CONTROL",
  });
  expect(urls[0]).toContain("/gw-bff/access-control/door-types");
  expect(urls[0]).toContain("applicationCode=ACCESS_CONTROL");
  expect(urls[1]).toContain("/gw-bff/access-control/door-device-page");
  expect(urls[1]).toContain("applicationCode=ACCESS_CONTROL");
});
