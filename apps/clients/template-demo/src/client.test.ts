import { expect, test } from "bun:test";

import { createTemplateDemoClient } from "./client";

test("@g2-client/template-demo listTemplateDemo hits expected path", async () => {
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
  const api = createTemplateDemoClient(http);
  await (api.listTemplateDemo as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/template/demo/list"))).toBe(true);
});
