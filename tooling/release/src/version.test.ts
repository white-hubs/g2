import { describe, expect, test } from "bun:test";

import { releaseVersion } from "./version";

describe("releaseVersion", () => {
  test("formats UTC date and short sha", () => {
    const now = new Date("2026-07-22T15:30:00.000Z");
    expect(releaseVersion(now, "b32db5b")).toBe("20260722.b32db5b");
  });

  test("pads month and day", () => {
    const now = new Date("2026-01-05T00:00:00.000Z");
    expect(releaseVersion(now, "abc")).toBe("20260105.abc");
  });

  test("supports an explicit version for immutable local releases", () => {
    const now = new Date("2026-01-05T00:00:00.000Z");
    expect(releaseVersion(now, "abc", "20260105.abc.local-1")).toBe("20260105.abc.local-1");
  });

  test("rejects unsafe explicit versions", () => {
    const now = new Date("2026-01-05T00:00:00.000Z");
    expect(() => releaseVersion(now, "abc", "../escape")).toThrow("RELEASE_VERSION");
  });
});
