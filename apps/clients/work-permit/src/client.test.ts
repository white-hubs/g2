import { expect, test } from "bun:test";

import { createWorkPermitClient } from "./client";

test("@g2-client/work-permit listWorkPermitTypes hits expected path", async () => {
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
  const api = createWorkPermitClient(http);
  await (api.listWorkPermitTypes as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/work-permit/work-permit-types"))).toBe(true);
});
