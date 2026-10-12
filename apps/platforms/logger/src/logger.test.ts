import { describe, expect, test } from "bun:test";

import { createLogger } from "./logger";

describe("createLogger", () => {
  test("每个级别调用底层 console 对应方法，签名是 (message, context?)", () => {
    const calls: { level: string; args: unknown[] }[] = [];
    const fakeConsole = {
      debug: (...args: unknown[]) => calls.push({ level: "debug", args }),
      info: (...args: unknown[]) => calls.push({ level: "info", args }),
      warn: (...args: unknown[]) => calls.push({ level: "warn", args }),
      error: (...args: unknown[]) => calls.push({ level: "error", args }),
    };
    const logger = createLogger("test-scope", { console: fakeConsole });

    logger.debug("hello");
    logger.info("world", { a: 1 });
    logger.warn("careful");
    logger.error("boom", { code: 500 });

    expect(calls).toHaveLength(4);
    expect(calls[0].level).toBe("debug");
    expect(calls[1].args[1]).toEqual({ a: 1 });
    expect(calls[3].args[1]).toEqual({ code: 500 });
  });

  test("每条日志前缀包含 scope 名字", () => {
    const calls: unknown[][] = [];
    const logger = createLogger("pc-auth", {
      console: { debug: () => {}, info: (...a: unknown[]) => calls.push(a), warn: () => {}, error: () => {} },
    });
    logger.info("hi");
    expect(String(calls[0]?.[0])).toContain("pc-auth");
  });

  test("不再存在 fault 级别（旧仓遗留、语义不明，已废弃）", () => {
    const logger = createLogger("x");
    expect((logger as unknown as Record<string, unknown>).fault).toBeUndefined();
  });
});
