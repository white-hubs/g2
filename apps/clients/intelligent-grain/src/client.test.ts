import { expect, test } from "bun:test";

import { createIntelligentGrainClient } from "./client";

test("@g2-client/intelligent-grain getIntelligentGrainDashboard hits expected path", async () => {
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
  const api = createIntelligentGrainClient(http);
  await (api.getIntelligentGrainDashboard as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/api/intelligent-grain/dashboard/overview"))).toBe(true);
});
