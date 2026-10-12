import { describe, expect, it } from "bun:test";

import { normalizeDeviceRealtimeTargets, parseDeviceRealtimeUpdates } from "./device-realtime-updates";

const targets = [
  { deviceId: "device-1", propertyCode: "ua" },
  { deviceId: "device-2", propertyCode: "ua" },
  { deviceId: "device-2", propertyCode: "total.energy" },
];

describe("device realtime updates", () => {
  it("deduplicates and removes invalid subscription targets", () => {
    expect(normalizeDeviceRealtimeTargets([targets[0], targets[0], { deviceId: "", propertyCode: "ua" }])).toEqual([targets[0]]);
  });

  it("parses the generic monitor deviceId plus property-code payload", () => {
    expect(
      parseDeviceRealtimeUpdates(
        {
          msgType: "SUBSCRIBE_PUSH",
          content: JSON.stringify({
            msg: {
              deviceId: "device-2",
              updates: [{ key: "ua", value: 220.5, status: "WARNING", collectTime: "2026-08-27 10:00:00" }],
            },
          }),
        },
        targets,
      ),
    ).toEqual([
      {
        deviceId: "device-2",
        propertyCode: "ua",
        value: 220.5,
        status: "WARNING",
        collectTime: "2026-08-27 10:00:00",
      },
    ]);
  });

  it("parses a full deviceId.propertyCode key without truncating dotted property codes", () => {
    expect(
      parseDeviceRealtimeUpdates(
        {
          msgType: "SUBSCRIBE_PUSH",
          content: { msg: { updates: [{ key: "device-2.total.energy", value: 99 }] } },
        },
        targets,
      ),
    ).toEqual([{ deviceId: "device-2", propertyCode: "total.energy", value: 99 }]);
  });

  it("drops an ambiguous property-only update when no deviceId is present", () => {
    expect(
      parseDeviceRealtimeUpdates(
        {
          msgType: "SUBSCRIBE_PUSH",
          content: JSON.stringify({ msg: { updates: [{ key: "ua", value: 221 }] } }),
        },
        targets,
      ),
    ).toEqual([]);
  });
});
