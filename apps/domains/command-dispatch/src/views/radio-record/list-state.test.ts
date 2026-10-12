import { describe, expect, test } from "bun:test";

import { createPageLoader, parsePageValue, recordingQuery, restorePeriod } from "./list-state";

describe("list queries and request lifecycle", () => {
  test("restores valid page numbers and rejects nonpositive, fractional and invalid URL values", () => {
    expect(parsePageValue("pageNumber", "3")).toBe(3);
    expect(parsePageValue("pageNumber", "-1")).toBe(1);
    expect(parsePageValue("pageNumber", "2.5")).toBe(1);
    expect(parsePageValue("pageSize", "bogus")).toBe(10);
    expect(parsePageValue("pageSize", "50")).toBe(50);
  });

  test("restores the date picker and sends the same period on the first request after reload", () => {
    const state = { code: "00101", period: "2026-09-01,2026-09-16", fileType: "voice", pageNumber: 3, pageSize: 20 };
    expect(restorePeriod(state.period)).toEqual(["2026-09-01", "2026-09-16"]);
    expect(recordingQuery(state)).toEqual({
      code: "00101",
      period: "2026-09-01,2026-09-16",
      fileType: "voice",
      pageNumber: 3,
      pageSize: 20,
    });
    expect(restorePeriod("2026-09-31,2026-10-01")).toBeUndefined();
    expect(restorePeriod("2026-09-16,2026-09-01")).toBeUndefined();
  });

  test("a cleared call type remains unrestricted when restored from its URL value", () => {
    expect(recordingQuery({ code: "", period: "", fileType: "all", pageNumber: 1, pageSize: 10 }).fileType).toBeNull();
  });

  test("a slow previous query cannot replace the latest results or clear its pending state", async () => {
    const state = { loading: false, error: "", records: [] as string[], total: 0 };
    const load = createPageLoader(state);
    let finishOld: ((value: { records: string[]; total: number }) => void) | undefined;
    const old = load(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    await load(async () => ({ records: ["latest"], total: 1 }));
    finishOld?.({ records: ["stale"], total: 99 });
    await old;
    expect(state).toEqual({ loading: false, error: "", records: ["latest"], total: 1 });
  });

  test("a failed request preserves existing rows, exposes the reason and ends loading", async () => {
    const state = { loading: false, error: "", records: ["existing"], total: 1 };
    const load = createPageLoader(state);
    await load(async () => {
      throw new Error("调度服务不可用");
    });
    expect(state.records).toEqual(["existing"]);
    expect(state.error).toBe("调度服务不可用");
    expect(state.loading).toBe(false);
  });
});
