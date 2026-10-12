import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("secure education service boundaries", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    await stop?.();
    upstream?.stop(true);
    stop = undefined;
    upstream = undefined;
  });

  async function start(handler: (request: Request) => Promise<Response> | Response, configured = true): Promise<string> {
    upstream = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: handler });
    const port = 25000 + Math.floor(Math.random() * 3000);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: { secureEduUrl: configured ? `http://127.0.0.1:${upstream.port}` : "" },
    });
    stop = () => app.stop();
    return `http://127.0.0.1:${port}`;
  }

  test("forwards legacy headquarters, configuration and market queries with auth", async () => {
    const seen: { method: string; path: string; query: Record<string, string>; body: unknown; auth: string | null }[] = [];
    const base = await start(async (request) => {
      const url = new URL(request.url);
      seen.push({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: ["POST", "PUT"].includes(request.method) ? await request.json() : null,
        auth: request.headers.get("authorization"),
      });
      return Response.json({ code: 200, data: { records: [], total: 0 } });
    });
    const headers = { authorization: "Bearer secure-edu", tenant: "head", terminal: "PC", "content-type": "application/json" };

    const training = await fetch(
      `${base}/gw-bff/secure-edu/api/safety-education/headquarters/cultivate-task/page?pageNumber=1&pageSize=10&keyword=%E5%AE%89%E5%85%A8`,
      { headers },
    );
    const theme = await fetch(`${base}/gw-bff/secure-edu/api/safety-education/theme`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "安全教育", remark: "总部" }),
    });
    const market = await fetch(`${base}/gw-bff/secure-edu/api/dataintegrate/market-config/list`, { headers });

    expect(training.status).toBe(200);
    expect(theme.status).toBe(200);
    expect(market.status).toBe(200);
    expect(seen).toEqual([
      {
        method: "GET",
        path: "/api/safety-education/headquarters/cultivate-task/page",
        query: { pageNumber: "1", pageSize: "10", keyword: "安全" },
        body: null,
        auth: "Bearer secure-edu",
      },
      {
        method: "POST",
        path: "/api/safety-education/theme",
        query: {},
        body: { name: "安全教育", remark: "总部" },
        auth: "Bearer secure-edu",
      },
      { method: "GET", path: "/api/dataintegrate/market-config/list", query: {}, body: null, auth: "Bearer secure-edu" },
    ]);
  });

  test("rejects paths outside the source-derived allowlist and reports missing upstream configuration", async () => {
    const base = await start(() => Response.json({ data: {} }), false);
    const unconfigured = await fetch(`${base}/gw-bff/secure-edu/api/safety-education/theme/page`);
    const disallowed = await fetch(`${base}/gw-bff/secure-edu/api/ouaa/authenticated/organizations/list`);

    expect(unconfigured.status).toBe(503);
    expect(await unconfigured.text()).toContain("secureEduUrl");
    expect(disallowed.status).toBe(400);
  });

  test("streams record exports and question templates without leaking the BFF download marker", async () => {
    const seen: { method: string; path: string; query: Record<string, string>; body: unknown; auth: string | null }[] = [];
    const base = await start(async (request) => {
      const url = new URL(request.url);
      seen.push({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: request.method === "POST" ? await request.json() : null,
        auth: request.headers.get("authorization"),
      });
      return new Response(new Uint8Array([0x50, 0x4b, 0x03, 0x04]), {
        headers: {
          "content-disposition": 'attachment; filename="secure-edu.xlsx"',
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    });
    const headers = { authorization: "Bearer secure-edu", "content-type": "application/json" };
    const exported = await fetch(`${base}/gw-bff/secure-edu/api/safety-education/headquarters/exam-user/records/export?download=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({ period: "4" }),
    });
    const template = await fetch(`${base}/gw-bff/secure-edu/api/safety-education/exam-question-bank/template?download=true`, { headers });

    expect(exported.status).toBe(200);
    expect(exported.headers.get("content-disposition")).toContain("secure-edu.xlsx");
    expect([...new Uint8Array(await exported.arrayBuffer())]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(template.status).toBe(200);
    expect([...new Uint8Array(await template.arrayBuffer())]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(seen).toEqual([
      {
        method: "POST",
        path: "/api/safety-education/headquarters/exam-user/records/export",
        query: {},
        body: { period: "4" },
        auth: "Bearer secure-edu",
      },
      {
        method: "GET",
        path: "/api/safety-education/exam-question-bank/template",
        query: {},
        body: null,
        auth: "Bearer secure-edu",
      },
    ]);
  });

  test("forwards question Excel imports as multipart form data", async () => {
    const base = await start(async (request) => {
      const form = await request.formData();
      const file = form.get("file");
      expect(file).toBeInstanceOf(File);
      expect((file as File).name).toBe("questions.xlsx");
      expect(await (file as File).text()).toBe("question rows");
      expect(request.headers.get("authorization")).toBe("Bearer secure-edu");
      return Response.json({ code: 200, data: { success: 2, fail: 0, importErrorList: [] } });
    });
    const form = new FormData();
    form.append(
      "file",
      new File(["question rows"], "questions.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    );
    const response = await fetch(`${base}/gw-bff/secure-edu/api/safety-education/exam-question-bank/import`, {
      method: "POST",
      headers: { authorization: "Bearer secure-edu" },
      body: form,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: 2, fail: 0, importErrorList: [] });
  });
});
