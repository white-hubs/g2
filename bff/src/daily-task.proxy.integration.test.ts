import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("@g2-server/bff daily-task proxy", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    if (stop) {
      await stop();
    }
    stop = undefined;
    upstream?.stop(true);
    upstream = undefined;
  });

  test("forwards allowlisted GET/POST paths and strips the BFF prefix", async () => {
    const seen: { method: string; path: string; query: string; body: unknown }[] = [];
    const upstreamPort = 21000 + Math.floor(Math.random() * 500);
    upstream = Bun.serve({
      port: upstreamPort,
      fetch: async (request) => {
        const url = new URL(request.url);
        seen.push({
          method: request.method,
          path: url.pathname,
          query: url.search,
          body: request.method === "POST" ? await request.json() : undefined,
        });
        return Response.json({ data: { ok: true, path: url.pathname } });
      },
    });

    const port = 22000 + Math.floor(Math.random() * 500);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: { dailyTaskUrl: `http://127.0.0.1:${upstreamPort}` },
    });
    stop = () => app.stop();

    const getResponse = await fetch(
      `http://127.0.0.1:${port}/gw-bff/daily-task-api/daily-task/configuration/queryDailyResultPage?pageNumber=1&pageSize=10`,
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ ok: true, path: "/daily-task/configuration/queryDailyResultPage" });

    const postResponse = await fetch(`http://127.0.0.1:${port}/gw-bff/daily-task-api/tag/business-tag/ref/device`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pageNumber: 1 }),
    });
    expect(postResponse.status).toBe(200);
    expect(await postResponse.json()).toEqual({ ok: true, path: "/tag/business-tag/ref/device" });
    expect(seen).toEqual([
      {
        method: "GET",
        path: "/daily-task/configuration/queryDailyResultPage",
        query: "?pageNumber=1&pageSize=10",
        body: undefined,
      },
      { method: "POST", path: "/tag/business-tag/ref/device", query: "", body: { pageNumber: 1 } },
    ]);
  });
});
