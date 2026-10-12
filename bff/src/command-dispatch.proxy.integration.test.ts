import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("command dispatch service boundaries", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    await stop?.();
    stop = undefined;
    upstream?.stop(true);
    upstream = undefined;
  });

  async function start(fetchUpstream: (request: Request) => Promise<Response> | Response, configured = true, ouaaAuthenticatedBase = true) {
    upstream = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: fetchUpstream });
    const upstreamUrl = `http://127.0.0.1:${upstream.port}`;
    const port = 25000 + Math.floor(Math.random() * 3000);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: {
        dispatchUrl: configured ? `${upstreamUrl}/dispatch` : "",
        fusionCommunicateUrl: configured ? `${upstreamUrl}/fusion-communicate` : "",
        ouaaUrl: `${upstreamUrl}/ouaa${ouaaAuthenticatedBase ? "/authenticated" : ""}`,
        dictionaryUrl: `${upstreamUrl}/dictionary`,
        fileServiceUrl: `${upstreamUrl}/file`,
      },
    });
    stop = () => app.stop();
    return `http://127.0.0.1:${port}`;
  }

  test("preserves dispatch paths, query values, auth headers and mutation bodies", async () => {
    const seen: { method: string; path: string; query: Record<string, string>; body: unknown; auth: string[] }[] = [];
    const base = await start(async (request) => {
      const url = new URL(request.url);
      seen.push({
        method: request.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body: ["POST", "PUT"].includes(request.method) ? await request.json() : null,
        auth: ["authorization", "tenant", "terminal"].map((name) => request.headers.get(name) ?? ""),
      });
      return Response.json({ code: 200, data: { total: 1, records: [{ id: "9007199254740993" }] } });
    });
    const headers = { authorization: "Bearer integration", tenant: "grain", terminal: "PC", "content-type": "application/json" };
    const group = { code: "001", name: "调度 & A", type: 0, groupLevel: 0, isRecord: false };
    const device = { code: "D/1", name: "人员", password: "cGFzcw==", type: "voice", deviceLevel: 0, isRecord: false, isVideo: true };
    const requests = [
      { method: "GET", path: "/recordings?pageNumber=2&pageSize=10&code=001%2B2&period=2026-09-01%2C2026-09-02&fileType=voice" },
      { method: "GET", path: "/groups?pageNumber=1&pageSize=10&keyword=%E8%B0%83%E5%BA%A6%20%26%20A" },
      { method: "POST", path: "/groups", body: group },
      { method: "PUT", path: "/groups/9007199254740993", body: group },
      { method: "DELETE", path: "/groups/code/001" },
      { method: "GET", path: "/devices?pageNumber=1&pageSize=100&keyword=D%2F1" },
      { method: "PUT", path: "/devices/9007199254740993", body: device },
      { method: "POST", path: "/groups/001/members", body: { deviceCodes: ["D/1", "002"] } },
      { method: "GET", path: "/accounts?pageNumber=1&pageSize=10&keyword=001" },
    ];
    for (const request of requests) {
      const response = await fetch(`${base}/gw-bff/command-dispatch${request.path}`, {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ total: 1, records: [{ id: "9007199254740993" }] });
    }
    expect(seen.map(({ method, path }) => `${method} ${path}`)).toEqual([
      "GET /dispatch/dispatch-platform/file/page",
      "GET /dispatch/dispatch-device-group/page",
      "POST /dispatch/dispatch-device-group",
      "PUT /dispatch/dispatch-device-group/9007199254740993",
      "DELETE /dispatch/dispatch-device-group/code/001",
      "GET /dispatch/dispatch-device/page",
      "PUT /dispatch/dispatch-device/9007199254740993",
      "POST /dispatch/dispatch-device-group/001/add-and-delete/member",
      "GET /fusion-communicate/fusion-communicate-account/page",
    ]);
    expect(seen[0]?.query).toEqual({ pageNumber: "2", pageSize: "10", code: "001+2", period: "2026-09-01,2026-09-02", fileType: "voice" });
    expect(seen[1]?.query.keyword).toBe("调度 & A");
    expect(seen[2]?.body).toEqual(group);
    expect(seen[3]?.body).toEqual({ ...group, id: "9007199254740993" });
    expect(seen[6]?.body).toEqual({ ...device, id: "9007199254740993" });
    expect(seen[7]?.query).toEqual({ deviceCodes: "D/1,002" });
    expect(seen[7]?.body).toEqual({ code: "001", deviceCodes: "D/1,002" });
    expect(seen.every(({ auth }) => auth.join("|") === "Bearer integration|grain|PC")).toBe(true);
  });

  test("forwards the exact legacy department tree endpoint and dictionary payloads", async () => {
    const seen: { path: string; query: string; body: unknown }[] = [];
    const base = await start(async (request) => {
      const url = new URL(request.url);
      seen.push({ path: url.pathname, query: url.search, body: request.method === "PUT" ? await request.json() : null });
      return Response.json({ data: [{ id: "1", name: "部门", children: [{ id: "2", name: "子部门" }] }] });
    });
    const departments = await fetch(`${base}/gw-bff/ouaa/departments?enabled=false`);
    expect(departments.status).toBe(200);
    expect(await departments.json()).toEqual([{ id: "1", name: "部门", children: [{ id: "2", name: "子部门" }] }]);
    const payload = {
      id: "4",
      itemCode: "COMMAND_DISPATCH_MAP_CONFIG",
      code: "radius",
      name: "radius",
      variable: "0",
      version: "2",
      flag: false,
    };
    const saved = await fetch(`${base}/gw-bff/dictionary/datas`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(saved.status).toBe(200);
    expect(seen).toEqual([
      { path: "/ouaa/authenticated/organizations", query: "?enabled=false", body: null },
      { path: "/dictionary/updateDataDictionary", query: "", body: payload },
    ]);
  });

  test("uploads original multipart bytes and business key to legacy /file/file", async () => {
    let captured:
      | { path: string; key: FormDataEntryValue | null; type: string; name: string; bytes: number[]; auth: string | null }
      | undefined;
    const base = await start(async (request) => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ message: "missing file" }, { status: 400 });
      captured = {
        path: new URL(request.url).pathname,
        key: form.get("businessKey"),
        type: file.type,
        name: file.name,
        bytes: [...new Uint8Array(await file.arrayBuffer())],
        auth: request.headers.get("authorization"),
      };
      return Response.json({ data: { id: "3", path: "/images/background.png", name: "background.png" } });
    });
    const form = new FormData();
    form.append("businessKey", "mdata");
    form.append("file", new File([new Uint8Array([0, 137, 80, 255, 10])], "background.png", { type: "image/png" }));
    const response = await fetch(`${base}/gw-bff/file/upload`, { method: "POST", headers: { authorization: "Bearer upload" }, body: form });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "3", path: "/images/background.png", name: "background.png" });
    expect(captured).toEqual({
      path: "/file/file",
      key: "mdata",
      type: "image/png",
      name: "background.png",
      bytes: [0, 137, 80, 255, 10],
      auth: "Bearer upload",
    });
  });

  test("department tree includes authenticated when OUAA is configured at its service root", async () => {
    let path = "";
    const base = await start(
      (request) => {
        path = new URL(request.url).pathname;
        return Response.json({ data: [] });
      },
      true,
      false,
    );
    const response = await fetch(`${base}/gw-bff/ouaa/departments?enabled=true`);
    expect(response.status).toBe(200);
    expect(path).toBe("/ouaa/authenticated/organizations");
  });

  test("clearing group membership forwards an empty list and rejects malformed codes", async () => {
    const captured: { query?: string | null; body?: unknown } = {};
    const base = await start(async (request) => {
      captured.query = new URL(request.url).searchParams.get("deviceCodes");
      captured.body = await request.json();
      return Response.json({ data: true });
    });
    const response = await fetch(`${base}/gw-bff/command-dispatch/groups/001/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCodes: [] }),
    });
    expect(response.status).toBe(200);
    expect(captured.query).toBe("");
    expect(captured.body).toEqual({ code: "001", deviceCodes: "" });
    const malformed = await fetch(`${base}/gw-bff/command-dispatch/groups/001/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceCodes: "001,002" }),
    });
    expect(malformed.status).toBe(400);
  });

  test("business failure envelopes are not successful saves", async () => {
    const base = await start(() => Response.json({ code: 500, message: "保存失败", data: null }));
    const response = await fetch(`${base}/gw-bff/command-dispatch/groups`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "001", name: "组", type: 0, groupLevel: 0, isRecord: false }),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ code: 500, message: "保存失败", data: null });
  });

  test("preserves upstream errors and rejects unavailable dispatch configuration", async () => {
    const base = await start(() => Response.json({ message: "没有权限", detail: "upstream denied" }, { status: 403 }));
    const response = await fetch(`${base}/gw-bff/command-dispatch/groups?pageNumber=1&pageSize=10`);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "没有权限", detail: "upstream denied" });
  });

  test("missing upstream configuration is an explicit service error", async () => {
    let calls = 0;
    const base = await start(() => {
      calls += 1;
      return Response.json({ data: [] });
    }, false);
    const response = await fetch(`${base}/gw-bff/command-dispatch/accounts?pageNumber=1&pageSize=10`);
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("fusionCommunicateUrl");
    expect(calls).toBe(0);
  });
});
