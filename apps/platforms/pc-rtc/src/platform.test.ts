import { assertPlatformModule, createFakeApp, createFakePlatformContext, createFakeRouter } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { platformModule } from "./platform";

describe("pc-rtc platform module", () => {
  test("符合 PlatformModule 契约", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
  });

  test("install 时只订阅 ctx 传入的总线，不自己创建总线（跨 Platform 共享同一个总线实例）", async () => {
    const ctx = createFakePlatformContext();
    await platformModule.install?.(createFakeApp(), createFakeRouter(), ctx);
    ctx.bus.publish("rtc-call-received", { name: "张三" });
    const incoming = (ctx.bus as unknown as { published: { event: string; payload: unknown }[] }).published.find(
      (p) => p.event === "rtc:incoming-call",
    );
    expect(incoming?.payload).toMatchObject({ name: "张三" });
  });
});
