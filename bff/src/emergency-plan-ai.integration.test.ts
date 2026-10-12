import { afterEach, describe, expect, test } from "bun:test";

import { createBffApp } from "./create-app";

describe("@g2-server/bff emergency plan AI compatibility", () => {
  let stop: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await stop?.();
    stop = undefined;
  });

  test("保留 ghcloud 的预案任务拆解路由并对无效请求返回 400", async () => {
    const port = await reservePort();
    const app = await createBffApp({ port, hostname: "127.0.0.1", enableSignalHandlers: false });
    stop = () => app.stop();

    const response = await fetch(`http://127.0.0.1:${port}/gw-bff/emergency/plan-ai/tasks/decompose`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceType: "RICH_TEXT", planContext: { name: "" } }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error?: string };
    expect(JSON.parse(body.error || ("{}" as string))).toMatchObject({ code: "INVALID_PARAM", message: "预案名称不能为空" });
  });
});

async function reservePort(): Promise<number> {
  const server = Bun.serve({ port: 0, fetch: () => new Response() });
  const { port } = server;
  await server.stop();
  return port;
}
