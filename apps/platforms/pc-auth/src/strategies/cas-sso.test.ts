import type { AuthClient } from "@g2-contract/auth";
import type { HttpClient } from "@g2-platform/http/client";
import { describe, expect, test } from "bun:test";

import { createCasSsoStrategy } from "./cas-sso";

function createFakeHttpClient(
  overrides: Partial<HttpClient> = {},
): HttpClient & { calls: { method: string; url: string; body?: unknown }[] } {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  return {
    calls,
    get: overrides.get ?? (async (url: string) => (calls.push({ method: "GET", url }), undefined)),
    post:
      overrides.post ??
      (async (url: string, body?: unknown) => {
        calls.push({ method: "POST", url, body });
        return undefined;
      }),
    put: overrides.put ?? (async () => undefined),
    delete: overrides.delete ?? (async () => undefined),
  };
}

function createFakeAuth(exchangeToken: AuthClient["exchangeToken"]): Pick<AuthClient, "exchangeToken"> & {
  calls: unknown[];
} {
  const calls: unknown[] = [];
  return {
    calls,
    exchangeToken: async (body) => {
      calls.push(body);
      return exchangeToken(body);
    },
  };
}

describe("createCasSsoStrategy", () => {
  test("query 里既没有 code 也没有 ticket 时，不发请求，返回 null", async () => {
    const http = createFakeHttpClient();
    const auth = createFakeAuth(async () => ({ access_token: "x" }));
    const strategy = createCasSsoStrategy({ auth, http });
    const result = await strategy.tryLogin({ query: new URLSearchParams() });
    expect(result).toBeNull();
    expect(http.calls).toEqual([]);
    expect(auth.calls).toEqual([]);
  });

  test("query 里有 code 时，经 auth.exchangeToken 用 ms_accesstoken_code 换取 token", async () => {
    const http = createFakeHttpClient();
    const auth = createFakeAuth(async () => ({ access_token: "tok-1", tenants: ["tenant-a", "tenant-b"] }));
    const strategy = createCasSsoStrategy({ auth, http });
    const result = await strategy.tryLogin({ query: new URLSearchParams("code=abc") });
    expect(result).toEqual({ token: "tok-1", tenant: "tenant-a" });
    expect(auth.calls).toEqual([expect.objectContaining({ grant_type: "ms_accesstoken_code", code: "abc" })]);
    expect(http.calls).toEqual([]);
  });

  test("query 里有 ticket 时，GET /third-auth/getLoginToken 换取 token", async () => {
    const http = createFakeHttpClient({
      get: async () => ({ access_token: "tok-2", tenants: [] }),
    });
    const auth = createFakeAuth(async () => ({ access_token: "should-not" }));
    const strategy = createCasSsoStrategy({ auth, http });
    const result = await strategy.tryLogin({ query: new URLSearchParams("ticket=xyz") });
    expect(result).toEqual({ token: "tok-2", tenant: "" });
    expect(auth.calls).toEqual([]);
  });

  test("code 优先于 ticket", async () => {
    const http = createFakeHttpClient({
      get: async () => ({ access_token: "tok-should-not-happen", tenants: [] }),
    });
    const auth = createFakeAuth(async () => ({ access_token: "tok-3", tenants: [] }));
    const strategy = createCasSsoStrategy({ auth, http });
    await strategy.tryLogin({ query: new URLSearchParams("code=abc&ticket=xyz") });
    expect(auth.calls).toHaveLength(1);
    expect(http.calls).toEqual([]);
  });
});
