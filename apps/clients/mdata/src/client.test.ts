import { createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { create, createMdataClient } from "./client";

describe("createMdataClient", () => {
  test("操作日志沿用 /api/mdata/operation/log/record/page", async () => {
    const urls: string[] = [];
    const client = createMdataClient({ get: async (url) => { urls.push(url); return { records: [], total: 0 }; } });
    await client.pageOperationLogs({ pageNumber: 1, pageSize: 10, period: "2026-09-01,2026-09-30", method: "GET" });
    expect(urls).toEqual([
      "/api/mdata/operation/log/record/page?pageNumber=1&pageSize=10&period=2026-09-01%2C2026-09-30&method=GET",
    ]);
  });
  test("getTenantMine GET /api/mdata/tenant/mine", async () => {
    const urls: string[] = [];
    const client = createMdataClient({
      get: async (url) => {
        urls.push(url);
        return [{ code: "t1", name: "租户1" }];
      },
    });
    const result = await client.getTenantMine();
    expect(urls).toEqual(["/api/mdata/tenant/mine"]);
    expect(result).toEqual([{ code: "t1", name: "租户1" }]);
  });
  test("getAreaTree GET /api/mdata/area/list（对齐旧仓区域树接口）", async () => {
    const urls: string[] = [];
    const client = createMdataClient({
      get: async (url) => {
        urls.push(url);
        return [{ id: "1", name: "区域A", children: [] }];
      },
    });
    const result = await client.getAreaTree();
    expect(urls).toEqual(["/api/mdata/area/list"]);
    expect(result).toEqual([{ id: "1", name: "区域A", children: [] }]);
  });
});

describe("create(ctx)", () => {
  test("经 loadPlatform(httpPlatform) 后可 getTenantMine", async () => {
    const urls: string[] = [];
    const ctx = createFakePlatformContext({
      loadPlatform: async () => ({
        createHttpClientForPlatform: () => ({
          get: async (url: string) => {
            urls.push(url);
            return [];
          },
        }),
      }),
    });
    const client = await create(ctx);
    await client.getTenantMine();
    expect(urls).toEqual(["/api/mdata/tenant/mine"]);
  });
});
