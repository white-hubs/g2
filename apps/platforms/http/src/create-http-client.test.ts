import { describe, expect, test } from "bun:test";

import { createHttpClient } from "./create-http-client";
import { HttpServiceError } from "./errors";

function fakeFetch(responses: Record<string, { status: number; body: unknown }>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, init });
    const match = responses[url];
    if (!match) {
      throw new Error(`no fake response registered for ${url}`);
    }
    return new Response(JSON.stringify(match.body), { status: match.status, headers: { "content-type": "application/json" } });
  };
  return { fn, calls };
}

describe("createHttpClient", () => {
  test("成功响应直接返回解析后的 JSON body", async () => {
    const { fn } = fakeFetch({ "http://api.test/x": { status: 200, body: { ok: true } } });
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({}) });
    const result = await client.get("http://api.test/x");
    expect(result).toEqual({ ok: true });
  });

  test("每次请求前调用 getAuthHeaders 取最新值，不缓存", async () => {
    const { fn, calls } = fakeFetch({ "http://api.test/x": { status: 200, body: {} } });
    let token = "token-1";
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({ Authorization: `Bearer ${token}` }) });
    await client.get("http://api.test/x");
    token = "token-2";
    await client.get("http://api.test/x");
    const headers0 = calls[0].init?.headers as Record<string, string> | undefined;
    const headers1 = calls[1].init?.headers as Record<string, string> | undefined;
    expect(headers0?.Authorization).toBe("Bearer token-1");
    expect(headers1?.Authorization).toBe("Bearer token-2");
  });

  test("单次业务请求可选租户且不能覆盖令牌", async () => {
    const { fn, calls } = fakeFetch({ "http://api.test/x": { status: 200, body: {} } });
    const client = createHttpClient({
      fetchImpl: fn,
      getAuthHeaders: () => ({ Authorization: "Bearer token", tenant: "current" }),
    });
    await client.get("http://api.test/x", { headers: { tenant: "selected", Authorization: "Bearer other" } });
    expect(calls[0].init?.headers).toEqual({ Authorization: "Bearer token", tenant: "selected" });
  });

  test("失败响应抛出标准化异常，不吞、不触发副作用", async () => {
    const { fn } = fakeFetch({ "http://api.test/x": { status: 401, body: { code: "AUTH_EXPIRED", message: "expired" } } });
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({}) });
    await expect(client.get("http://api.test/x")).rejects.toBeInstanceOf(HttpServiceError);
  });

  test("baseUrl 配置时自动拼接相对路径", async () => {
    const { fn, calls } = fakeFetch({ "http://api.test/api/x": { status: 200, body: {} } });
    const client = createHttpClient({ fetchImpl: fn, getAuthHeaders: () => ({}), baseUrl: "http://api.test" });
    await client.get("/api/x");
    expect(calls[0].url).toBe("http://api.test/api/x");
  });

  test("附件和 Excel 响应保持为 Blob，避免二进制下载被文本解码破坏", async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const client = createHttpClient({
      fetchImpl: async () =>
        new Response(bytes, {
          status: 200,
          headers: {
            "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "content-disposition": 'attachment; filename="report.xlsx"',
          },
        }),
      getAuthHeaders: () => ({}),
    });
    const result = await client.post("http://api.test/export", {});
    expect(result).toBeInstanceOf(Blob);
    expect(Array.from(new Uint8Array(await (result as Blob).arrayBuffer()))).toEqual(Array.from(bytes));
  });
});
