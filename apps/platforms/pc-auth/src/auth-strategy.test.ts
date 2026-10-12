import { describe, expect, test } from "bun:test";

import { type AuthStrategy, createAuthStrategyRegistry, getEnabledStrategies, setEnabledStrategies } from "./auth-strategy";

describe("createAuthStrategyRegistry", () => {
  test("按 config.strategies 声明的 id 列表启用对应策略，未声明的策略不启用", () => {
    const standard: AuthStrategy = { id: "standard", tryLogin: async () => null };
    const casSso: AuthStrategy = { id: "cas-sso", tryLogin: async () => ({ token: "t", tenant: "" }) };
    const registry = createAuthStrategyRegistry([standard, casSso], { strategies: ["standard"] });
    expect(registry.enabled.map((s) => s.id)).toEqual(["standard"]);
  });

  test("config 未声明 strategies 时，默认只启用 standard", () => {
    const standard: AuthStrategy = { id: "standard", tryLogin: async () => null };
    const casSso: AuthStrategy = { id: "cas-sso", tryLogin: async () => null };
    const registry = createAuthStrategyRegistry([standard, casSso], {});
    expect(registry.enabled.map((s) => s.id)).toEqual(["standard"]);
  });

  test("引用了未注册的策略 id 时抛错，报出具体 id", () => {
    const standard: AuthStrategy = { id: "standard", tryLogin: async () => null };
    expect(() => createAuthStrategyRegistry([standard], { strategies: ["not-registered"] })).toThrow(/not-registered/);
  });

  test("setEnabledStrategies / getEnabledStrategies 是模块级单例，供 slot 组件读取", () => {
    const strategy: AuthStrategy = { id: "standard", tryLogin: async () => null };
    setEnabledStrategies([strategy]);
    expect(getEnabledStrategies()).toEqual([strategy]);
  });
});
