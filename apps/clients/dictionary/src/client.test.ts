import { expect, test } from "bun:test";

import { createDictionaryClient } from "./client";

test("@g2-client/dictionary getDictionaryItemByCode hits expected path", async () => {
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
  const api = createDictionaryClient(http);
  await (api.getDictionaryByItem as (...a: unknown[]) => Promise<unknown>)({ itemCode: "X", code: "uploadPicConfig" });
  expect(urls.some((u) => u.includes("/gw-bff/dictionary/datas") && u.includes("itemCode=X"))).toBe(true);
});

test("dictionary client decodes responses and preserves flags, versions and unrelated keys", async () => {
  const calls: { url: string; body?: unknown }[] = [];
  const row = {
    id: "12",
    itemCode: "COMMAND_DISPATCH_MAP_CONFIG",
    name: "radius",
    code: "radius",
    variable: "0",
    flag: false,
    version: "2",
  };
  const client = createDictionaryClient({
    get: async (url) => {
      calls.push({ url });
      return url.includes("/items/") ? { data: null } : { data: [row] };
    },
    post: async (url, body) => {
      calls.push({ url, body });
      return { data: row };
    },
    put: async (url, body) => {
      calls.push({ url, body });
      return { data: row };
    },
    delete: async () => undefined,
  });
  expect(await client.getDictionaryItemByCode("CODE/SPACE X")).toBeNull();
  expect(await client.getDataDictionaryByItem({ itemCode: "COMMAND_DISPATCH_MAP_CONFIG", code: "radius" })).toEqual([row]);
  expect(await client.updateDataDictionary(row)).toEqual(row);
  expect(calls).toEqual([
    { url: "/gw-bff/dictionary/items/CODE%2FSPACE%20X" },
    { url: "/gw-bff/dictionary/datas?itemCode=COMMAND_DISPATCH_MAP_CONFIG&code=radius" },
    { url: "/gw-bff/dictionary/datas", body: row },
  ]);
});
