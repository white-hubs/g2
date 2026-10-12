import { assertPlatformModule, createFakeApp, createFakePlatformContext, createFakeRouter } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { platformModule } from "./platform";

describe("pc-messaging platform module", () => {
  test("符合 PlatformModule 契约", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
  });

  test("install 时只订阅 ctx 传入的总线，不自己创建总线（跨 Platform 共享同一个总线实例）", async () => {
    const ctx = createFakePlatformContext({
      ensureClient: async <T = unknown>() => ({}) as T,
    });
    await platformModule.install?.(createFakeApp(), createFakeRouter(), ctx);
    ctx.bus.publish("terminal-message", { applicationName: "示例应用", msgContent: "你有新消息" });
    const shown = (ctx.bus as unknown as { published: { event: string; payload: unknown }[] }).published.find(
      (p) => p.event === "notification:show",
    );
    expect(shown?.payload).toMatchObject({ title: "示例应用", description: "你有新消息" });
  });

  test("install 时 ensureClient(messageClient)，预热服务面 client remote", async () => {
    const ensured: string[] = [];
    const ctx = createFakePlatformContext({
      ensureClient: async <T = unknown>(name: string) => {
        ensured.push(name);
        return {} as T;
      },
    });
    await platformModule.install?.(createFakeApp(), createFakeRouter(), ctx);
    expect(ensured).toEqual(["messageClient"]);
  });
});
