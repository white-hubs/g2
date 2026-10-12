import { expect, test } from "bun:test";

import { createHeadquartersMarketClient } from "./client";

test("@g2-client/headquarters-market getMarketConfig hits legacy dataintegrate path", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => {
      urls.push(url);
      return { marketName: "demo", url: "https://market.example" };
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
  const api = createHeadquartersMarketClient(http);
  await api.getMarketConfig("market-42");
  expect(urls).toEqual(["/api/dataintegrate/market-config/market-42"]);
});

test("@g2-client/headquarters-market getMarketConfig unwraps legacy envelope from JSON string", async () => {
  const http = {
    get: async () =>
      JSON.stringify({
        code: 200,
        data: { marketName: "demo", url: "https://market.example", account: "a", password: "b" },
      }),
    post: async () => ({}),
    put: async () => ({}),
    delete: async () => ({}),
  };
  const api = createHeadquartersMarketClient(http);
  const cfg = await api.getMarketConfig("m1");
  expect(cfg).toMatchObject({ url: "https://market.example", account: "a", password: "b" });
});
