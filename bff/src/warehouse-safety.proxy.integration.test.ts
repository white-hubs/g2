import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("warehouse safety service boundaries", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    await stop?.();
    upstream?.stop(true);
    stop = undefined;
    upstream = undefined;
  });

  test("registers every migrated route and preserves paths, queries, bodies and auth headers", async () => {
    const seen: Array<{
      method: string;
      path: string;
      query: Record<string, string>;
      body: unknown;
      authorization: string | null;
    }> = [];
    const upstreamPort = 32000 + Math.floor(Math.random() * 1000);
    upstream = Bun.serve({
      port: upstreamPort,
      hostname: "127.0.0.1",
      fetch: async (request) => {
        const url = new URL(request.url);
        seen.push({
          method: request.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          body: ["POST", "PUT"].includes(request.method) ? await request.json() : null,
          authorization: request.headers.get("authorization"),
        });
        return Response.json({ code: 200, data: { records: [], total: 0, pages: 0 } });
      },
    });
    const port = 33000 + Math.floor(Math.random() * 1000);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: { securityManagementUrl: `http://127.0.0.1:${upstream.port}` },
    });
    stop = () => app.stop();
    const base = `http://127.0.0.1:${port}/gw-bff/warehouse-safety`;
    const headers = {
      authorization: "Bearer warehouse-integration",
      tenant: "grain",
      terminal: "PC",
      "content-type": "application/json",
    };
    const requests: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [
      { method: "GET", path: "/warehouses?pageNumber=1&pageSize=20&keyword=%E4%B8%80%E5%8F%B7%E4%BB%93" },
      { method: "GET", path: "/statistics/warehouses" },
      { method: "GET", path: "/warehouses/w-1" },
      { method: "POST", path: "/warehouses", body: { code: "W-01", name: "一号仓" } },
      { method: "PUT", path: "/warehouses/w-1", body: { code: "W-01", name: "一号仓" } },
      { method: "DELETE", path: "/warehouses/w-1" },
      { method: "GET", path: "/shelves?pageNumber=1&pageSize=20" },
      { method: "GET", path: "/statistics/shelves" },
      { method: "GET", path: "/shelves/s-1" },
      { method: "POST", path: "/shelves", body: { name: "一号货架" } },
      { method: "PUT", path: "/shelves/s-1", body: { name: "一号货架" } },
      { method: "DELETE", path: "/shelves/s-1" },
      { method: "GET", path: "/forklifts?pageNumber=1&pageSize=20" },
      { method: "GET", path: "/statistics/forklifts" },
      { method: "GET", path: "/forklifts/f-1" },
      { method: "POST", path: "/forklifts", body: { code: "F-01", name: "一号叉车" } },
      { method: "PUT", path: "/forklifts/f-1", body: { code: "F-01", name: "一号叉车" } },
      { method: "DELETE", path: "/forklifts/f-1" },
      { method: "GET", path: "/events?pageNumber=1&pageSize=20" },
      { method: "GET", path: "/events/e-1" },
      { method: "GET", path: "/events/e-1/devices" },
      { method: "GET", path: "/devices?pageNumber=1&pageSize=20" },
      { method: "GET", path: "/areas/tree" },
    ];

    for (const request of requests) {
      const response = await fetch(`${base}${request.path}`, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      expect(response.status).toBe(200);
    }

    expect(seen.map(({ method, path }) => `${method} ${path}`)).toEqual(
      requests.map(({ method, path }) => `${method} /warehouse-safety${path.split("?")[0]}`),
    );
    expect(seen[0]?.query).toEqual({ pageNumber: "1", pageSize: "20", keyword: "一号仓" });
    expect(seen[3]?.body).toEqual({ code: "W-01", name: "一号仓" });
    expect(seen[9]?.body).toEqual({ name: "一号货架" });
    expect(seen[15]?.body).toEqual({ code: "F-01", name: "一号叉车" });
    expect(seen.every(({ authorization }) => authorization === "Bearer warehouse-integration")).toBe(true);
  });
});
