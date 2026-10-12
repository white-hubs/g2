import { describe, expect, test } from "bun:test";

import { buildStorageArchiveDescription, formatStorageValue, getOpText, parseStorageArchiveSnapshot } from "./storage-archive";

describe("storage archive description", () => {
  test("parse snapshot and build message", () => {
    const alarm = {
      applicationCode: "RESERVE_MONITORING",
      alarmTargetName: "1号仓",
      alarmSnapshot: JSON.stringify({
        currentVolume: 100,
        volumeThreshold: 80,
        volumeOp: "GE",
        volumeAlarm: true,
      }),
    };
    const snapshot = parseStorageArchiveSnapshot(alarm);
    expect(snapshot?.volumeAlarm).toBe(true);
    const desc = buildStorageArchiveDescription(alarm);
    expect(desc).toContain("1号仓");
    expect(desc).toContain("容积");
  });

  test("formatStorageValue and getOpText", () => {
    expect(formatStorageValue(undefined)).toBe("--");
    expect(formatStorageValue(1.23456)).toBe("1.235");
    expect(getOpText("ge")).toBe("≥");
  });
});
