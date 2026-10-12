import { GEM_PAGE_KEYS } from "@g2-pages/generic-equipment-monitor/contract";
import { describe, expect, test } from "bun:test";

import { resolveSecurityMonitorGemHostPath } from "./page-key-routes";

describe("resolveSecurityMonitorGemHostPath", () => {
  test("maps shared pages back to legacy security monitor entries", () => {
    expect(resolveSecurityMonitorGemHostPath({ page: GEM_PAGE_KEYS.alarmRecord })).toBe("/d/security-monitor/alarmRecord");
    expect(resolveSecurityMonitorGemHostPath({ page: GEM_PAGE_KEYS.alarmConfigList })).toBe("/d/security-monitor/alarmRulesList");
  });

  test("keeps detail parameters", () => {
    expect(resolveSecurityMonitorGemHostPath({ page: GEM_PAGE_KEYS.alarmDetail, params: { id: "42" } })).toBe(
      "/d/security-monitor/alarmDetail?id=42",
    );
  });
});
