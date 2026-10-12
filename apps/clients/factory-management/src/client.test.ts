import { describe, expect, test } from "bun:test";

import { createFactoryManagementClient, type HttpClient } from "./client";

function recorder() {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const response = { code: 200, data: { records: [], total: 0, pages: 0 } };
  const http: HttpClient = {
    get: async (url) => {
      calls.push({ method: "GET", url });
      return response;
    },
    post: async (url, body) => {
      calls.push({ method: "POST", url, body });
      return { code: 200, data: true };
    },
    put: async (url, body) => {
      calls.push({ method: "PUT", url, body });
      return { code: 200, data: true };
    },
    delete: async (url) => {
      calls.push({ method: "DELETE", url });
      return { code: 200, data: true };
    },
  };
  return { calls, client: createFactoryManagementClient(http) };
}

describe("factory-management client", () => {
  test("loads the tenant overview with the canonical OUAA path", async () => {
    const { calls, client } = recorder();
    await client.getTenantOverview("tenant/park");
    expect(calls[0]).toEqual({ method: "GET", url: "/api/ouaa/tenant-under-tenant/tenant%2Fpark" });
  });

  test("keeps non-zero overview data from standard API envelopes", async () => {
    const http: HttpClient = {
      get: async (url) => {
        if (url.endsWith("/getRoomStatistics")) {
          return { code: 200, data: { leaseNum: 120, leaseTotal: 500 } };
        }
        if (url.endsWith("/getRoomRateList")) {
          return { code: 200, data: [{ areaName: "一号园区", num: 76 }] };
        }
        return { code: 200, data: { floorArea: 20_000, areaCovered: 30_000, remark: "园区简介" } };
      },
      post: async () => ({}),
      put: async () => ({}),
      delete: async () => ({}),
    };
    const client = createFactoryManagementClient(http);

    expect(await client.getTenantOverview("park")).toMatchObject({ floorArea: 20_000, areaCovered: 30_000 });
    expect(await client.getRoomStatistics()).toEqual({ leaseNum: 120, leaseTotal: 500 });
    expect(await client.listRoomRates()).toEqual([{ areaName: "一号园区", num: 76 }]);
  });

  test("does not mistake a raw tenant business code for an API error code", async () => {
    const http: HttpClient = {
      get: async () => ({
        id: "1527470128244015106",
        code: 58_197_260,
        name: "安全指挥调度系统",
        floorArea: 133_704,
        areaCovered: 40_222,
        remark: "成都农产品中心批发市场",
        files: [{ id: "2081569618137288706", path: "/minio/ouaa/2081569618137288706.mp4", type: "mp4" }],
      }),
      post: async () => ({}),
      put: async () => ({}),
      delete: async () => ({}),
    };

    await expect(createFactoryManagementClient(http).getTenantOverview("58197260")).resolves.toMatchObject({
      floorArea: 133_704,
      areaCovered: 40_222,
      remark: "成都农产品中心批发市场",
    });
  });

  test("uses the legacy park paging query names", async () => {
    const { calls, client } = recorder();
    await client.pageEnterprises({ pageNumber: 2, pageSize: 20, keyword: "粮库", industryTypeId: "7" });
    expect(calls[0]).toEqual({
      method: "GET",
      url: "/api/park/enterprise/page?pageNumber=2&pageSize=20&keyword=%E7%B2%AE%E5%BA%93&industryTypeId=7",
    });
  });

  test("keeps type tag in the legacy path and query", async () => {
    const { calls, client } = recorder();
    await client.pageTypes("INDUSTRY", { pageNumber: 1, pageSize: 10, keyword: "制造" });
    expect(calls[0]?.url).toBe("/api/park/type-data/INDUSTRY/list?pageNumber=1&pageSize=10&keyword=%E5%88%B6%E9%80%A0&tag=INDUSTRY");
  });

  test("uses comma-separated ids for legacy batch deletion", async () => {
    const { calls, client } = recorder();
    await client.deleteRooms(["11", "22"]);
    expect(calls[0]).toEqual({ method: "DELETE", url: "/api/park/room/batch?ids=11%2C22" });
  });

  test("keeps operation paging fields", async () => {
    const { calls, client } = recorder();
    await client.pageEstateContracts({ pageNumber: 3, pageSize: 15, period: "2026-01-01,2026-02-01", warnCondition: "GE", warnDay: 30 });
    expect(calls[0]?.url).toContain("/api/youxianqu-park/estateContract/page?");
    expect(calls[0]?.url).toContain("pageNumber=3");
    expect(calls[0]?.url).toContain("warnCondition=GE");
  });
});
