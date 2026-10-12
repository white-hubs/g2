import { expect, test } from "bun:test";

import { createInspectionAiClient } from "./client";

test("@g2-client/inspection-ai analyzeInspectionImage hits expected path", async () => {
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
  const api = createInspectionAiClient(http);
  await (api.analyzeInspectionImage as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/inspection/image/analyze"))).toBe(true);
});
