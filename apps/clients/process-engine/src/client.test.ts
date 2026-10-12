import { expect, test } from "bun:test";

import { createProcessEngineClient } from "./client";

test("@g2-client/process-engine getPermissionFormFlowGroupCount hits expected path", async () => {
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
  const api = createProcessEngineClient(http);
  await (api.getPermissionFormFlowGroupCount as (...a: unknown[]) => Promise<unknown>)("");
  expect(urls.some((u) => u.includes("/gw-bff/process-engine/form-flow-groups/permission-count"))).toBe(true);
});
