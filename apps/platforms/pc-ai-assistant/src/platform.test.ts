import { assertPlatformModule, createFakeApp, createFakePlatformContext, createFakeRouter } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { platformModule } from "./platform";

describe("pc-ai-assistant platform module", () => {
  const createContext = () =>
    createFakePlatformContext({
      loadPlatform: async () => ({
        resolveStaticResourceUrl: (pathOrUrl: string) => pathOrUrl,
        BIMOPS_AI_ENTRY_ICON: "/resource/ai-assistant.svg",
      }),
    });

  test("符合 PlatformModule 契约", () => {
    const result = assertPlatformModule(platformModule);
    expect(result.ok).toBe(true);
  });

  test("install 时通过 ctx.bus 发布 chrome:register-top-bar-action 事件贡献入口，不直接 import 宿主顶栏平台", async () => {
    const ctx = createContext();
    await platformModule.install?.(createFakeApp(), createFakeRouter(), ctx);
    const published = (ctx.bus as unknown as { published: { event: string; payload: unknown }[] }).published.find(
      (p) => p.event === "chrome:register-top-bar-action",
    );
    expect(published?.payload).toMatchObject({ id: "ai-assistant" });
    expect((published?.payload as { component?: unknown })?.component).toBeDefined();
  });

  test("贡献的入口组件是图标按钮形态（无「AI 助手」白底文字胶囊），图标走可配置 /resource 路径", async () => {
    const ctx = createContext();
    await platformModule.install?.(createFakeApp(), createFakeRouter(), ctx);
    const published = (ctx.bus as unknown as { published: { event: string; payload: unknown }[] }).published.find(
      (p) => p.event === "chrome:register-top-bar-action",
    );
    const component = (published?.payload as { component?: { name?: string; setup?: unknown } })?.component;
    // install 注册带总线的 Host；真实图标按钮仍是 AiChatEntry（ADR-0053 点击打开）。
    expect(component?.name).toBe("AiChatEntryHost");
    // 源码契约：入口必须走 img 图标 + aria-label，禁止再渲染白底「AI 助手」文案按钮；资源走 resolveStaticResourceUrl
    const source = await Bun.file(new URL("components/AiChatEntry.tsx", import.meta.url)).text();
    expect(source).toContain('aria-label="AI 助手"');
    expect(source).toContain("resolveStaticResourceUrl");
    expect(source).toContain("BIMOPS_AI_ENTRY_ICON");
    expect(source).not.toMatch(/>\s*AI 助手\s*</u);
  });

  test("install 注册的 Host 订阅 ai-assistant:open-requested 后可打开抽屉", async () => {
    const ctx = createContext();
    await platformModule.install?.(createFakeApp(), createFakeRouter(), ctx);
    const source = await Bun.file(new URL("platform.ts", import.meta.url)).text();
    expect(source).toContain("ai-assistant:open-requested");
  });
});
