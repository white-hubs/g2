import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { createTopBarActionsRegistry, wireTopBarActionsRegistryToBus } from "./top-bar-actions-registry";

describe("createTopBarActionsRegistry", () => {
  test("按注册顺序排列图标贡献", () => {
    const registry = createTopBarActionsRegistry();
    registry.register({ id: "search", component: {} });
    registry.register({ id: "ai-assistant", component: {} });
    expect(registry.list().map((a) => a.id)).toEqual(["search", "ai-assistant"]);
  });

  test("同 id 再注册时替换组件（ADR-0053：AI 占位→真入口 upsert，不是独占 slot 冲突）", () => {
    const registry = createTopBarActionsRegistry();
    registry.register({ id: "ai-assistant", component: { name: "Placeholder" } });
    registry.register({ id: "ai-assistant", component: { name: "AiChatEntry" } });
    expect(registry.list()).toHaveLength(1);
    expect((registry.list()[0]!.component as { name: string }).name).toBe("AiChatEntry");
  });

  test("注册时对 component 做 markRaw，避免 reactive 数组把组件做成响应式", () => {
    const registry = createTopBarActionsRegistry();
    const component = { name: "AiChatEntry" };
    registry.register({ id: "ai-assistant", component });
    // Vue markRaw 打上的内部标记；TopBar 渲染依赖此标记跳过深层响应式。
    expect((registry.list()[0]!.component as { __v_skip?: boolean }).__v_skip).toBe(true);
  });
});

describe("wireTopBarActionsRegistryToBus", () => {
  test("订阅总线上的 chrome:register-top-bar-action 事件，收到后注册进本地 registry", () => {
    const bus = createFakeBus();
    const registry = createTopBarActionsRegistry();
    wireTopBarActionsRegistryToBus(bus, registry);
    bus.publish("chrome:register-top-bar-action", { id: "ai-assistant", component: { name: "AiChatEntry" } });
    expect(registry.list().map((a) => a.id)).toEqual(["ai-assistant"]);
  });
});
