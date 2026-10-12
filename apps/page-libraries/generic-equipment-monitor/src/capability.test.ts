import { describe, expect, test } from "bun:test";

import { hasCapability, type GemCapabilityCodes } from "./capability";
import { GEM_ACTION_KEYS, GEM_PAGE_KEYS } from "./page-keys";

const codes: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.alarmRecord]: "HOST_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "HOST_ALARM_DETAIL",
  },
  action: {
    [GEM_ACTION_KEYS.exportAlarm]: "HOST_ALARM_EXPORT",
  },
};

describe("hasCapability", () => {
  test("码表缺键时视为未开放", () => {
    expect(hasCapability(codes, ["HOST_ALARM"], "page", GEM_PAGE_KEYS.overView)).toBe(false);
  });

  test("用户持有映射后的 functionCode 时放行", () => {
    expect(hasCapability(codes, new Set(["HOST_ALARM"]), "page", GEM_PAGE_KEYS.alarmRecord)).toBe(true);
  });

  test("用户无对应 code 时拒绝", () => {
    expect(hasCapability(codes, ["OTHER"], "action", GEM_ACTION_KEYS.exportAlarm)).toBe(false);
  });
});
