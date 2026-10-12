import { createFakePlatformContext } from "@g2-composition/contract";
import { expect, test } from "bun:test";

import { create, createCommandDispatchClient } from "./client";

test("client encodes query and route values and sends a code array for membership", async () => {
  const seen: { url: string; body?: unknown }[] = [];
  const http = {
    get: async (url: string) => {
      seen.push({ url });
      return { total: 0, records: [] };
    },
    post: async (url: string, body?: unknown) => {
      seen.push({ url, body });
    },
    put: async (url: string, body?: unknown) => {
      seen.push({ url, body });
    },
    delete: async (url: string) => {
      seen.push({ url });
    },
  };
  const client = createCommandDispatchClient(http);
  expect(await client.pageRecordings({ pageNumber: 1, pageSize: 10, code: "A&B+中", fileType: null })).toEqual({ total: 0, records: [] });
  await client.setGroupMembers("group/1", ["001", "002"]);
  await client.setGroupMembers("group/1", []);
  await client.deleteGroup("group/1");
  expect(seen).toEqual([
    { url: "/gw-bff/command-dispatch/recordings?pageNumber=1&pageSize=10&code=A%26B%2B%E4%B8%AD" },
    { url: "/gw-bff/command-dispatch/groups/group%2F1/members", body: { deviceCodes: ["001", "002"] } },
    { url: "/gw-bff/command-dispatch/groups/group%2F1/members", body: { deviceCodes: [] } },
    { url: "/gw-bff/command-dispatch/groups/code/group%2F1" },
  ]);
});

test("client rejects malformed lists instead of reporting an empty success", async () => {
  const client = createCommandDispatchClient({
    get: async () => ({ message: "missing records" }),
    post: async () => undefined,
    put: async () => undefined,
    delete: async () => undefined,
  });
  await expect(client.pageGroups({ pageNumber: 1, pageSize: 10 })).rejects.toThrow("分页响应");
});

test("federation create resolves the HTTP platform and preserves errors", async () => {
  const failure = new Error("forbidden");
  const ctx = createFakePlatformContext({
    loadPlatform: async () => ({
      createHttpClientForPlatform: () => ({
        get: async () => {
          throw failure;
        },
        post: async () => undefined,
        put: async () => undefined,
        delete: async () => undefined,
      }),
    }),
  });
  const client = await create(ctx);
  await expect(client.pageAccounts({ pageNumber: 1, pageSize: 10 })).rejects.toBe(failure);
});
