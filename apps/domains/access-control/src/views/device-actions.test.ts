import { describe, expect, test } from "bun:test";

import { buildAssociatePayload, mapDoorTypeOptions, normalizeDevicePage, resolveControlStatus } from "./device-actions";

describe("access-control device actions", () => {
  test("mapDoorTypeOptions maps id/value and doorTypeName/label", () => {
    expect(
      mapDoorTypeOptions([
        { id: 1, doorTypeName: "闸机" },
        { value: "a", label: "门" },
      ]),
    ).toEqual([
      { value: "1", label: "闸机" },
      { value: "a", label: "门" },
    ]);
  });

  test("normalizeDevicePage accepts page or array", () => {
    expect(normalizeDevicePage({ total: 2, records: [{ id: 1 }, { id: 2 }] })).toEqual({
      total: 2,
      pages: 1,
      records: [{ id: 1 }, { id: 2 }],
    });
    expect(normalizeDevicePage([{ id: 9 }])).toEqual({ total: 1, pages: 1, records: [{ id: 9 }] });
  });

  test("buildAssociatePayload maps selected rows", () => {
    expect(
      buildAssociatePayload("TYPE_A", [
        { id: "d1", doorCode: "C1" },
        { id: "d2", code: "C2" },
      ]),
    ).toEqual([
      { deviceId: "d1", type: "TYPE_A", doorCode: "C1" },
      { deviceId: "d2", type: "TYPE_A", doorCode: "C2" },
    ]);
  });

  test("resolveControlStatus reads status/value/number", () => {
    expect(resolveControlStatus({ status: 1 })).toBe(1);
    expect(resolveControlStatus({ value: "2" })).toBe(2);
    expect(resolveControlStatus(3)).toBe(3);
    expect(resolveControlStatus(undefined)).toBe(4);
  });
});
