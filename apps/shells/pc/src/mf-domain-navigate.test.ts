import { describe, expect, test } from "bun:test";

import {
  buildMfDomainIntentIndex,
  buildMfDomainMenuOwningIndex,
  buildMfDomainPathIndex,
  intentCodesFromRemoteConfig,
  navigateCodesFromRemoteConfig,
  resolveMfDomainNavigatePath,
} from "./mf-domain-navigate";

describe("mf domain navigate", () => {
  test("buildMfDomainPathIndex indexes name and /d/{code}", () => {
    const index = buildMfDomainPathIndex([{ name: "accessControl", basePath: "/d/access-control" }]);
    expect(index.get("accessControl")).toBe("/d/access-control");
    expect(index.get("access-control")).toBe("/d/access-control");
  });

  test("buildMfDomainPathIndex indexes navigateCodes (OUAA codes like DOORMANAGE)", () => {
    const index = buildMfDomainPathIndex([
      {
        name: "accessControl",
        basePath: "/d/access-control",
        navigateCodes: ["DOORMANAGE", "ACCESS_CONTROL"],
      },
    ]);
    expect(index.get("DOORMANAGE")).toBe("/d/access-control");
    expect(index.get("ACCESS_CONTROL")).toBe("/d/access-control");
  });

  test("daily inspection OUAA code resolves to the migrated /d domain", () => {
    const index = buildMfDomainMenuOwningIndex([
      {
        name: "dailyInspection",
        basePath: "/d/daily-inspection",
        navigateCodes: ["INSPECTION"],
      },
    ]);

    expect(resolveMfDomainNavigatePath("INSPECTION", { entry: "inspect-task" }, index)).toBe("/d/daily-inspection/inspect-task");
  });

  test("navigateCodesFromRemoteConfig reads string list", () => {
    expect(navigateCodesFromRemoteConfig({ navigateCodes: ["DOORMANAGE", "  ACCESS_CONTROL "] })).toEqual(["DOORMANAGE", "ACCESS_CONTROL"]);
    expect(navigateCodesFromRemoteConfig({ navigateCodes: [1, ""] })).toEqual([]);
    expect(navigateCodesFromRemoteConfig(undefined)).toEqual([]);
  });

  test("intent-only code resolves navigate-intent but does not own sidebar strip", () => {
    const remotes = [
      {
        name: "accessControl",
        basePath: "/d/access-control",
        navigateCodes: ["DOORMANAGE"],
        intentCodes: ["DOORMANAGE", "ACCESS_CONTROL", "INTENT_ONLY"],
      },
    ];
    const menuIndex = buildMfDomainMenuOwningIndex(remotes);
    const intentIndex = buildMfDomainIntentIndex(remotes);
    expect(menuIndex.get("INTENT_ONLY")).toBeUndefined();
    expect(intentIndex.get("INTENT_ONLY")).toBe("/d/access-control");
    expect(resolveMfDomainNavigatePath("INTENT_ONLY", { entry: "alarmDetail" }, intentIndex)).toBe("/d/access-control/alarmDetail");
  });

  test("intentCodesFromRemoteConfig falls back to navigateCodes when absent", () => {
    expect(intentCodesFromRemoteConfig({ navigateCodes: ["DOORMANAGE"] })).toEqual(["DOORMANAGE"]);
    expect(intentCodesFromRemoteConfig({ intentCodes: ["X"], navigateCodes: ["Y"] })).toEqual(["X"]);
  });

  test("resolveMfDomainNavigatePath appends entry / appCode", () => {
    const index = buildMfDomainPathIndex([{ name: "accessControl", basePath: "/d/access-control" }]);
    expect(resolveMfDomainNavigatePath("access-control", undefined, index)).toBe("/d/access-control");
    expect(resolveMfDomainNavigatePath("access-control", { entry: "devices" }, index)).toBe("/d/access-control/devices");
    expect(resolveMfDomainNavigatePath("access-control", { appCode: "AC1" }, index)).toBe("/d/access-control/AC1");
    expect(resolveMfDomainNavigatePath("missing", undefined, index)).toBeUndefined();
  });

  test("resolveMfDomainNavigatePath appends query for alarm detail deep link", () => {
    const index = buildMfDomainIntentIndex([{ name: "accessControl", basePath: "/d/access-control", intentCodes: ["DOORMANAGE"] }]);
    expect(
      resolveMfDomainNavigatePath("DOORMANAGE", { entry: "alarmDetail", query: { id: "a1", businessKey: "bk1", deviceId: "d1" } }, index),
    ).toBe("/d/access-control/alarmDetail?id=a1&businessKey=bk1&deviceId=d1");
  });
});
