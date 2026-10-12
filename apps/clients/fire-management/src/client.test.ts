import { expect, test } from "bun:test";

import { createFireManagementClient } from "./client";

test("@g2-client/fire-management listFireDevices hits expected path", async () => {
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
    patch: async (url: string) => {
      urls.push(url);
      return {};
    },
    delete: async (url: string) => {
      urls.push(url);
      return {};
    },
  };
  const api = createFireManagementClient(http);
  await api.listFireDevices({ pageNumber: 1, pageSize: 10 });
  expect(urls.some((u) => u.includes("/api/fire-device/list"))).toBe(true);
});

test("@g2-client/fire-management listFireHosts and p2 overview hit securitymanagement", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return { data: { records: [], total: 0 } };
    },
    post: async (url: string) => {
      urls.push(url);
      return {};
    },
    put: async (url: string) => {
      urls.push(url);
      return {};
    },
    patch: async (url: string) => {
      urls.push(url);
      return {};
    },
    delete: async (url: string) => {
      urls.push(url);
      return {};
    },
  };
  const api = createFireManagementClient(http);
  await api.listFireHosts({ pageNumber: 1, pageSize: 10, keyword: "host" });
  await api.listFireHostOverviews({ pageNumber: 1, pageSize: 10 });
  expect(urls.some((u) => u.includes("/api/securitymanagement/getFireManageDevicePage"))).toBe(true);
  expect(urls.some((u) => u.includes("/api/securitymanagement/fireManage/p2/hosts/overview/page"))).toBe(true);
});
