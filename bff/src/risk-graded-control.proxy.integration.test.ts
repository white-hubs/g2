import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("risk graded control service boundaries", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    await stop?.();
    upstream?.stop(true);
    stop = undefined;
    upstream = undefined;
  });

  async function start(handler: (request: Request) => Promise<Response> | Response, configured = true): Promise<string> {
    const upstreamPort = 22000 + Math.floor(Math.random() * 2000);
    upstream = Bun.serve({ port: upstreamPort, hostname: "127.0.0.1", fetch: handler });
    const port = 28000 + Math.floor(Math.random() * 2000);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: { riskControlUrl: configured ? `http://127.0.0.1:${upstream.port}` : "" },
    });
    stop = () => app.stop();
    return `http://127.0.0.1:${port}`;
  }

  test("forwards list queries, mutation bodies and cube auth headers", async () => {
    const seen: Array<{
      method: string;
      path: string;
      query: Record<string, string>;
      body: unknown;
      auth: string[];
    }> = [];
    const base = await start(async (request) => {
      const url = new URL(request.url);
      seen.push({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: ["POST", "PATCH"].includes(request.method) ? await request.json() : null,
        auth: ["authorization", "tenant", "terminal"].map((name) => request.headers.get(name) ?? ""),
      });
      return Response.json({ code: 200, data: { records: [], total: 0, pages: 0 } });
    });
    const headers = {
      authorization: "Bearer risk-control",
      tenant: "grain",
      terminal: "PC",
      "content-type": "application/json",
    };

    const unitTypes = await fetch(`${base}/gw-bff/risk-graded-control/unit-types?pageNumber=1&pageSize=20&keyword=%E5%8D%95%E5%85%83`, {
      headers,
    });
    const area = await fetch(`${base}/gw-bff/risk-graded-control/areas`, {
      method: "POST",
      headers,
      body: JSON.stringify({ code: "A-01", name: "储罐区", departmentId: "dept-1" }),
    });
    const warning = await fetch(`${base}/gw-bff/risk-graded-control/warning-records/warning-1`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ disposeResult: "closed", disposeDesc: "现场已处置" }),
    });

    expect(unitTypes.status).toBe(200);
    expect(await unitTypes.json()).toEqual({ records: [], total: 0, pages: 0 });
    expect(area.status).toBe(200);
    expect(warning.status).toBe(200);
    expect(seen).toEqual([
      {
        method: "GET",
        path: "/risk-control/unit-types",
        query: { pageNumber: "1", pageSize: "20", keyword: "单元" },
        body: null,
        auth: ["Bearer risk-control", "grain", "PC"],
      },
      {
        method: "POST",
        path: "/risk-control/areas",
        query: {},
        body: { code: "A-01", name: "储罐区", departmentId: "dept-1" },
        auth: ["Bearer risk-control", "grain", "PC"],
      },
      {
        method: "PATCH",
        path: "/risk-control/warning-records/warning-1",
        query: {},
        body: { disposeResult: "closed", disposeDesc: "现场已处置" },
        auth: ["Bearer risk-control", "grain", "PC"],
      },
    ]);
  });

  test("streams exports from the exact legacy risk-control path", async () => {
    let captured: { path: string; query: Record<string, string>; auth: string | null } | undefined;
    const base = await start((request) => {
      const url = new URL(request.url);
      captured = {
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        auth: request.headers.get("authorization"),
      };
      return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
        headers: {
          "content-disposition": 'attachment; filename="risk-units.xlsx"',
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    });

    const response = await fetch(`${base}/gw-bff/risk-graded-control/units/export?riskLevel=major`, {
      headers: { authorization: "Bearer export" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("risk-units.xlsx");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(captured).toEqual({
      path: "/risk-control/units/export",
      query: { riskLevel: "major" },
      auth: "Bearer export",
    });
  });

  test("reports a missing risk-control upstream instead of returning a fake empty page", async () => {
    let calls = 0;
    const base = await start(() => {
      calls += 1;
      return Response.json({ code: 200, data: { records: [], total: 0, pages: 0 } });
    }, false);

    const response = await fetch(`${base}/gw-bff/risk-graded-control/unit-types?pageNumber=1&pageSize=20`);

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("riskControlUrl");
    expect(calls).toBe(0);
  });
});
