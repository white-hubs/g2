import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("@g2-server/bff security-monitor proxy", () => {
  let stop: (() => Promise<void>) | undefined;
  let upstream: ReturnType<typeof Bun.serve> | undefined;

  afterEach(async () => {
    if (stop) await stop();
    stop = undefined;
    upstream?.stop(true);
    upstream = undefined;
  });

  test("forwards vmonitor GET/PUT/POST paths and strips the BFF prefix", async () => {
    const seen: { method: string; path: string; query: string }[] = [];
    const upstreamPort = 26000 + Math.floor(Math.random() * 500);
    upstream = Bun.serve({
      port: upstreamPort,
      fetch: (request) => {
        const url = new URL(request.url);
        seen.push({ method: request.method, path: url.pathname, query: url.search });
        return Response.json({ data: { ok: true, path: url.pathname } });
      },
    });

    const port = 24000 + Math.floor(Math.random() * 500);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
      configOverrides: { securityMonitorUrl: `http://127.0.0.1:${upstreamPort}` },
    });
    stop = () => app.stop();

    const getResponse = await fetch(
      `http://127.0.0.1:${port}/gw-bff/security-monitor/vmonitor/camera-patrol-lines?pageNumber=1&pageSize=10`,
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ ok: true, path: "/vmonitor/camera-patrol-lines" });

    const putResponse = await fetch(`http://127.0.0.1:${port}/gw-bff/security-monitor/vmonitor/camera-patrol-line/line-1/true`, {
      method: "PUT",
    });
    expect(putResponse.status).toBe(200);
    const postResponse = await fetch(`http://127.0.0.1:${port}/gw-bff/security-monitor/vmonitor/camera-patrol-record/snap-capture`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "camera-1" }),
    });
    expect(postResponse.status).toBe(200);
    expect(seen).toEqual([
      { method: "GET", path: "/vmonitor/camera-patrol-lines", query: "?pageNumber=1&pageSize=10" },
      { method: "PUT", path: "/vmonitor/camera-patrol-line/line-1/true", query: "" },
      { method: "POST", path: "/vmonitor/camera-patrol-record/snap-capture", query: "" },
    ]);
  });
});
