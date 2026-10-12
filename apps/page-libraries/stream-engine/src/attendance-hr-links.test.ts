import { expect, test } from "bun:test";

import { attendanceLinkedValue } from "./attendance-hr-links";

test("retains old comma paths and flat linked field IDs", () => {
  const values = { rootType: "WORK", group: [{ type: "REST" }, { type: "FESTIVAL" }] };
  expect(attendanceLinkedValue("rootType", { formValues: values })).toBe("WORK");
  expect(attendanceLinkedValue("group,type", { formValues: values })).toBe("FESTIVAL");
  expect(attendanceLinkedValue("group,type", { formValues: { "group,type": "REST" } })).toBe("REST");
  expect(attendanceLinkedValue("missing,type", { formValues: values })).toBeUndefined();
});

test("prefers the current group row and preserves its cleared value", () => {
  const rootFormValues = { group: [{ type: "FESTIVAL" }] };
  expect(attendanceLinkedValue("group,type", { rootFormValues, rowChain: [{ type: "WORK" }] })).toBe("WORK");
  expect(attendanceLinkedValue("group,type", { rootFormValues, rowChain: [{ type: "WORK" }, { type: "REST" }] })).toBe("REST");
  expect(attendanceLinkedValue("group,type", { rootFormValues, rowChain: [{ type: null }] })).toBeNull();
  expect(attendanceLinkedValue("group,type", { rootFormValues, rowChain: [{}] })).toBe("FESTIVAL");
});

test("supports nested period paths and legacy default sources", () => {
  const period = ["2026-09-28 08:00:00", "2026-09-28 17:00:00"];
  expect(attendanceLinkedValue("outer,inner,period", { formValues: { outer: [{ inner: [{ period }] }] } })).toEqual(period);
  expect(
    attendanceLinkedValue(null, { schemaItems: [{ id: "type", name: "OvertimeType" }], formValues: { type: "WORK" } }, "OvertimeType"),
  ).toBe("WORK");
  expect(attendanceLinkedValue(null, { formValues: { type: "WORK" } })).toBeUndefined();
});
