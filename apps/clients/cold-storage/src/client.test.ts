import { expect, test } from "bun:test";

import { createColdStorageClient } from "./client";

test("@g2-client/cold-storage getColdStorePage hits expected path", async () => {
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
  const api = createColdStorageClient(http);
  await (api.getColdStorePage as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/api/cold-storage/stores"))).toBe(true);
});
