import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("@g2-server/bff health", () => {
  let stop: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (stop) {
      await stop();
      stop = undefined;
    }
  });

  test("GET /health 返回 ok 与服务名", async () => {
    const port = 18080 + Math.floor(Math.random() * 1000);
    const app = await createBffApp({
      port,
      hostname: "127.0.0.1",
      enableSignalHandlers: false,
    });
    stop = () => app.stop();

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; service: string };
    expect(body.status).toBe("ok");
    expect(body.service).toBe("@g2-server/bff");
  });
});
