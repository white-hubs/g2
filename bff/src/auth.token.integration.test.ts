import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("@g2-server/bff auth token", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    if (stop) {
      await stop();
      stop = undefined;
    }
    upstream?.stop(true);
    upstream = undefined;
  });

  test("POST /gw-bff/auth/token 注入 OAuth client 并代理到 ouaa /oauth2/token", async () => {
    const seen: { url: string; body: string; contentType: string | null }[] = [];
    upstream = Bun.serve({
      port: 0,
      fetch: async (req) => {
        const url = new URL(req.url);
        seen.push({
          url: url.pathname,
          body: await req.text(),
          contentType: req.headers.get("content-type"),
        });
        return Response.json({
          access_token: "tok-1",
          token_type: "bearer",
          expires_in: 3600,
        });
      },
    });

    const port = 19000 + Math.floor(Math.random() * 1000);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: {
        ouaaUrl: `http://127.0.0.1:${upstream.port}`,
        oauthClientId: "client_test",
        oauthClientSecret: "secret_test",
      },
    });
    stop = () => app.stop();

    const res = await fetch(`http://127.0.0.1:${port}/gw-bff/auth/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grant_type: "pwd_simple_code", username: "u1", password: "p1" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { access_token: string };
    expect(json.access_token).toBe("tok-1");
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe("/oauth2/token");
    const params = new URLSearchParams(seen[0]!.body);
    expect(params.get("grant_type")).toBe("pwd_simple_code");
    expect(params.get("username")).toBe("u1");
    expect(params.get("client_id")).toBe("client_test");
    expect(params.get("client_secret")).toBe("secret_test");
  });
});
