import { describe, expect, test } from "bun:test";

import { buildDetailNavigateIntent, isApplicationCodeNavigable } from "./navigate-intent";

const ALLOWED = ["DOORMANAGE", "ACCESS_CONTROL"] as const;

describe("detail navigate-intent", () => {
  test("DOORMANAGE match → navigate-intent shape", () => {
    const result = buildDetailNavigateIntent(
      {
        businessKey: "bk-1",
        applicationCode: "DOORMANAGE",
        alarmTargetKey: "dev-9",
        id: "rec-1",
      },
      ALLOWED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.intent).toEqual({
        code: "DOORMANAGE",
        params: {
          entry: "alarmDetail",
          id: "rec-1",
          businessKey: "bk-1",
          deviceId: "dev-9",
        },
      });
    }
  });

  test("FIRECONTROL mismatch → no navigate-intent", () => {
    const result = buildDetailNavigateIntent({ businessKey: "bk-2", applicationCode: "FIRECONTROL", alarmTargetKey: "dev-1" }, ALLOWED);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not-allowed");
    }
  });

  test("empty applicationCode rejected", () => {
    expect(isApplicationCodeNavigable("", ALLOWED)).toBe(false);
    expect(buildDetailNavigateIntent({ businessKey: "x", applicationCode: "" }, ALLOWED).ok).toBe(false);
  });
});
