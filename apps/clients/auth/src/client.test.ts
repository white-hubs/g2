import { createFakePlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { create, createAuthClient } from "./client";

describe("createAuthClient", () => {
  test("exchangeToken POST /gw-bff/auth/token 并透传 body", async () => {
    const calls: { url: string; body?: unknown }[] = [];
    const http = {
      post: async (url: string, body?: unknown) => {
        calls.push({ url, body });
        return { access_token: "t1" };
      },
    };
    const client = createAuthClient(http);
    const result = await client.exchangeToken({ grant_type: "pwd_simple_code", username: "a" });
    expect(calls).toEqual([{ url: "/gw-bff/auth/token", body: { grant_type: "pwd_simple_code", username: "a" } }]);
    expect(result).toEqual({ access_token: "t1" });
  });
});

describe("create(ctx)", () => {
  test("经 loadPlatform(httpPlatform) 后可 exchangeToken", async () => {
    const calls: string[] = [];
    const ctx = createFakePlatformContext({
      loadPlatform: async (name, exposed) => {
        expect(name).toBe("httpPlatform");
        expect(exposed).toBe("client");
        return {
          createHttpClientForPlatform: () => ({
            post: async (url: string) => {
              calls.push(url);
              return { access_token: "ok" };
            },
          }),
        };
      },
    });
    const client = await create(ctx);
    await client.exchangeToken({ grant_type: "refresh_token" });
    expect(calls).toEqual(["/gw-bff/auth/token"]);
  });
});
