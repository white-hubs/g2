import { expect, test } from "bun:test";

import { createMetadataClient } from "./client";

test("@g2-client/metadata listAllArea hits expected path", async () => {
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
  const api = createMetadataClient(http);
  await (api.listAllArea as (...a: unknown[]) => Promise<unknown>)();
  expect(urls.some((u) => u.includes("/gw-bff/metadata/areas/list-all"))).toBe(true);
});
