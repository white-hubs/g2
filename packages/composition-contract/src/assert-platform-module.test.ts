import { describe, expect, test } from "bun:test";

import { assertPlatformModule } from "./assert-platform-module";

describe("assertPlatformModule", () => {
  test("接受只有 install 的模块", () => {
    const result = assertPlatformModule({ install: async () => {} });
    expect(result.ok).toBe(true);
  });

  test("接受只有 slots 的模块", () => {
    const result = assertPlatformModule({ slots: { "chrome.topBar": {} } });
    expect(result.ok).toBe(true);
  });

  test("接受空对象（label/slots/install 全部可选）", () => {
    const result = assertPlatformModule({});
    expect(result.ok).toBe(true);
  });

  test("拒绝非对象输入", () => {
    const result = assertPlatformModule(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("must be an object");
    }
  });

  test("拒绝 slots 字段类型错误（非对象）", () => {
    const result = assertPlatformModule({ slots: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("slots");
    }
  });

  test("拒绝 install 字段类型错误（非函数）", () => {
    const result = assertPlatformModule({ install: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toContain("install");
    }
  });
});
