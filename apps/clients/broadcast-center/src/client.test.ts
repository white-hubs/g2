import { expect, test } from "bun:test";

import { createBroadcastCenterClient } from "./client";

test("@g2-client/broadcast-center hits expected broadcast URL prefixes", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return { records: [], total: 0 };
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
  const api = createBroadcastCenterClient(http);

  await api.broadcastTemplatePage({ pageNumber: 1, pageSize: 10 });
  await api.broadcastPlayRulePage({ pageNumber: 1, pageSize: 10 });
  await api.deleteBroadcastTemplate("tpl-1");

  expect(urls.some((u) => u.startsWith("/api/broadcast/broadcast-template/page"))).toBe(true);
  expect(urls.some((u) => u.startsWith("/api/broadcast/broadcast-play-rule/page"))).toBe(true);
  expect(urls.some((u) => u.startsWith("/api/broadcast/broadcast-template/tpl-1"))).toBe(true);
});
