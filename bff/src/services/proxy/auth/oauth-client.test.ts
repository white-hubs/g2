import { describe, expect, test } from "bun:test";

import {
  buildOAuthUpstreamHeaders,
  isBlockedOAuthGrantType,
  normalizeOAuthTokenRequestBody,
  parseOAuthClientMap,
  resolveOAuthClient,
} from "./oauth-client";

describe("oauth-client", () => {
  test("parseOAuthClientMap parses id/secret aliases", () => {
    const map = parseOAuthClientMap(
      '{"inner_terminal":{"id":"inner_terminal","secret":"sec1"},"client_1":{"clientId":"client_1","clientSecret":"sec2"}}',
    );
    expect(map.inner_terminal).toEqual({ clientId: "inner_terminal", clientSecret: "sec1" });
    expect(map.client_1).toEqual({ clientId: "client_1", clientSecret: "sec2" });
  });

  test("resolveOAuthClient prefers x-oauth-client header", () => {
    const def = { clientId: "client_2", clientSecret: "default" };
    const map = { inner_terminal: { clientId: "inner_terminal", clientSecret: "inner" } };
    expect(resolveOAuthClient({ "x-oauth-client": "inner_terminal" }, def, map)).toEqual(map.inner_terminal);
    expect(resolveOAuthClient({}, def, map)).toEqual(def);
  });

  test("normalizeOAuthTokenRequestBody supports existing request body shapes", () => {
    const form = new FormData();
    form.set("grant_type", "pwd_simple_code");
    form.set("username", "alice");

    expect(normalizeOAuthTokenRequestBody(form)).toEqual({
      grant_type: "pwd_simple_code",
      username: "alice",
    });
    expect(normalizeOAuthTokenRequestBody("grant_type=pwd&username=bob")).toEqual({
      grant_type: "pwd",
      username: "bob",
    });
    expect(normalizeOAuthTokenRequestBody({ grant_type: "refresh_token", refresh_token: "token" })).toEqual({
      grant_type: "refresh_token",
      refresh_token: "token",
    });
  });

  test("buildOAuthUpstreamHeaders forwards client headers and strips BFF-only keys", () => {
    expect(
      buildOAuthUpstreamHeaders({
        terminal: "bimops-manage-app",
        tenant: "tenant-1",
        authorization: "Bearer old",
        "x-oauth-client": "inner_terminal",
        host: "localhost",
        "content-length": "100",
        "Content-Type": "multipart/form-data",
      }),
    ).toEqual({
      terminal: "bimops-manage-app",
      tenant: "tenant-1",
      authorization: "Bearer old",
      "content-type": "application/x-www-form-urlencoded",
    });
  });

  test("isBlockedOAuthGrantType blocks client credentials only", () => {
    expect(isBlockedOAuthGrantType("client_credentials")).toBe(true);
    expect(isBlockedOAuthGrantType(" CLIENT_CREDENTIALS ")).toBe(true);
    expect(isBlockedOAuthGrantType("pwd")).toBe(false);
    expect(isBlockedOAuthGrantType("refresh_token")).toBe(false);
  });
});
