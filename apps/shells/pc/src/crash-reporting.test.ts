import { describe, expect, test } from "bun:test";

import { installCrashReporting } from "./crash-reporting";

describe("installCrashReporting", () => {
  test("window.onerror 触发时调用 logger.error", () => {
    const calls: unknown[][] = [];
    const fakeLogger = { error: (...args: unknown[]) => calls.push(args), debug: () => {}, info: () => {}, warn: () => {} };
    const fakeTarget = { onerror: null as unknown, onunhandledrejection: null as unknown };
    installCrashReporting(fakeTarget as unknown as Window, fakeLogger);
    (fakeTarget.onerror as (message: string) => boolean | void)("boom");
    expect(calls[0][0]).toBe("uncaught error");
    expect(calls[0][1]).toMatchObject({ message: "boom" });
  });

  test("ResizeObserver loop 噪声不记 error，并 return true 抑制", () => {
    const calls: unknown[][] = [];
    const fakeLogger = { error: (...args: unknown[]) => calls.push(args), debug: () => {}, info: () => {}, warn: () => {} };
    const fakeTarget = { onerror: null as unknown, onunhandledrejection: null as unknown };
    installCrashReporting(fakeTarget as unknown as Window, fakeLogger);
    const suppressed = (fakeTarget.onerror as (message: string) => boolean | void)(
      "ResizeObserver loop completed with undelivered notifications.",
    );
    expect(suppressed).toBe(true);
    expect(calls).toEqual([]);
  });

  test("unhandledrejection 触发时调用 logger.error", () => {
    const calls: unknown[][] = [];
    const fakeLogger = { error: (...args: unknown[]) => calls.push(args), debug: () => {}, info: () => {}, warn: () => {} };
    const fakeTarget = { onerror: null as unknown, onunhandledrejection: null as unknown };
    installCrashReporting(fakeTarget as unknown as Window, fakeLogger);
    (fakeTarget.onunhandledrejection as (event: { reason: unknown }) => void)({ reason: "rejected" });
    expect(calls[0][0]).toBe("unhandled promise rejection");
    expect(calls[0][1]).toMatchObject({ reason: "rejected" });
  });
});
