import { describe, expect, test } from "bun:test";

import { isBenignRuntimeNoise, normalizeErrorText } from "./benign-runtime-noise";

describe("isBenignRuntimeNoise", () => {
  test("识别 ResizeObserver loop 噪声", () => {
    expect(isBenignRuntimeNoise("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isBenignRuntimeNoise(new Error("ResizeObserver loop limit exceeded"))).toBe(true);
    expect(isBenignRuntimeNoise({ message: "ResizeObserver loop completed with undelivered notifications." })).toBe(true);
  });

  test("CSSStyleDeclaration 索引写入是 Chrome/Vue 已知噪声，不当成微应用加载失败", () => {
    const message = "Failed to set an indexed property [0] on 'CSSStyleDeclaration': Indexed property setter is not supported.";
    expect(isBenignRuntimeNoise(message)).toBe(true);
    expect(isBenignRuntimeNoise(new TypeError(message))).toBe(true);
    expect(isBenignRuntimeNoise({ reason: new TypeError(message) })).toBe(true);
  });

  test("真实错误不视为噪声", () => {
    expect(isBenignRuntimeNoise("Cannot read properties of null (reading 'code')")).toBe(false);
    expect(isBenignRuntimeNoise(new Error("boom"))).toBe(false);
  });
});

describe("normalizeErrorText", () => {
  test("从 ErrorEvent 形状取 message", () => {
    expect(normalizeErrorText({ message: "x" })).toBe("x");
    expect(normalizeErrorText({ reason: new Error("y") })).toBe("y");
  });
});
