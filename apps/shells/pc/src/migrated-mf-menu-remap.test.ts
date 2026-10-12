import { describe, expect, test } from "bun:test";

import {
  isAccessControlPortalPath,
  remapAccessControlPortalPath,
  remapGenericEquipmentMonitorPortalPath,
  remapMigratedMfPortalPath,
} from "./migrated-mf-menu-remap";

describe("migrated-mf-menu-remap (retired)", () => {
  test("does not remap legacy portal paths", () => {
    expect(isAccessControlPortalPath("/portal/accessControl/roomHome")).toBe(false);
    expect(remapAccessControlPortalPath("/portal/accessControl/roomHome")).toBeUndefined();
    expect(remapGenericEquipmentMonitorPortalPath("/portal/genericEquipmentMonitor/alarmRecord", "/d/access-control")).toBeUndefined();
    expect(remapMigratedMfPortalPath("/portal/genericEquipmentMonitor/alarmRecord", "/d/access-control")).toBeUndefined();
  });
});
