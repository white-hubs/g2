import { describe, expect, test } from "bun:test";

import { setBootstrapStatus, traceAsync } from "./bootstrap-trace";

function createFakeLogger() {
  const calls: { level: string; message: string }[] = [];
  return {
    calls,
    logger: {
      info: (message: string) => {
        calls.push({ level: "info", message });
      },
      warn: (message: string) => {
        calls.push({ level: "warn", message });
      },
      error: (message: string) => {
        calls.push({ level: "error", message });
      },
    },
  };
}

describe("traceAsync", () => {
  test("正常完成时打 start/done，不 warn", async () => {
    const { logger, calls } = createFakeLogger();
    const timers: { ms: number; fn: () => void }[] = [];
    let now = 0;
    const statuses: { title: string; detail?: string; kind?: string }[] = [];

    const result = await traceAsync("compose", async () => "ok", {
      logger,
      warnAfterMs: 1000,
      timeoutMs: 5000,
      now: () => now,
      schedule: (fn, ms) => {
        timers.push({ ms, fn });
        return timers.length;
      },
      clearSchedule: () => undefined,
      onStatus: (status) => statuses.push(status),
    });

    expect(result).toBe("ok");
    expect(calls.map((c) => c.level)).toEqual(["info", "info"]);
    expect(calls[0]?.message).toContain("start: compose");
    expect(calls[1]?.message).toContain("done: compose");
    expect(statuses).toEqual([{ title: "正在启动…", detail: "compose", kind: "loading" }]);
  });

  test("超过 warnAfter 仍未完成时打 warn（卡住可观测）", async () => {
    const { logger, calls } = createFakeLogger();
    const timers: { ms: number; fn: () => void }[] = [];
    let now = 0;
    let release!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const statuses: { title: string; detail?: string; kind?: string }[] = [];

    const traced = traceAsync("load chrome.topBar", () => pending, {
      logger,
      warnAfterMs: 1000,
      timeoutMs: 0,
      now: () => now,
      schedule: (fn, ms) => {
        timers.push({ ms, fn });
        return timers.length;
      },
      clearSchedule: () => undefined,
      onStatus: (status) => statuses.push(status),
    });

    const warnTimer = timers.find((t) => t.ms === 1000);
    expect(warnTimer).toBeTruthy();
    now = 1000;
    warnTimer!.fn();
    expect(calls.some((c) => c.level === "warn" && c.message.includes("still pending"))).toBe(true);
    expect(statuses.at(-1)).toMatchObject({
      title: "仍在加载，请稍候…",
      kind: "waiting",
      detail: expect.stringContaining("load chrome.topBar"),
    });

    release("slot");
    await expect(traced).resolves.toBe("slot");
  });

  test("超过 timeout 则 reject 并 error", async () => {
    const { logger, calls } = createFakeLogger();
    const timers: { ms: number; fn: () => void }[] = [];
    let now = 0;
    const statuses: { title: string; detail?: string; kind?: string }[] = [];

    const traced = traceAsync("load chrome.topBar", () => new Promise(() => undefined), {
      logger,
      warnAfterMs: 0,
      timeoutMs: 2000,
      now: () => now,
      schedule: (fn, ms) => {
        timers.push({ ms, fn });
        return timers.length;
      },
      clearSchedule: () => undefined,
      onStatus: (status) => statuses.push(status),
    });

    const timeoutTimer = timers.find((t) => t.ms === 2000);
    now = 2000;
    timeoutTimer!.fn();
    await expect(traced).rejects.toThrow(/bootstrap timeout.*chrome\.topBar/);
    expect(calls.some((c) => c.level === "error")).toBe(true);
    expect(statuses.at(-1)).toEqual({ title: "启动超时", detail: "load chrome.topBar", kind: "error" });
  });
});

describe("setBootstrapStatus", () => {
  test("无 DOM 时写入 data 属性与友好标题文本", () => {
    const root = { dataset: {} as Record<string, string>, textContent: "" };
    setBootstrapStatus({ title: "正在启动…", detail: "chrome", kind: "loading" }, root as unknown as HTMLElement);
    expect(root.textContent).toBe("正在启动…");
    expect(root.dataset.bootstrapStatus).toBe("正在启动… chrome");
    expect(root.dataset.bootstrapKind).toBe("loading");
  });
});
