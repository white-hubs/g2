import { expect, test } from "bun:test";

import { hasTreeChildren, renderTableEmptyValue } from "./alias-table";

test("table empty values use the shared double-dash placeholder", () => {
  expect(renderTableEmptyValue(undefined)).toBe("--");
  expect(renderTableEmptyValue(null)).toBe("--");
  expect(renderTableEmptyValue("")).toBe("--");
});

test("table empty value fallback preserves valid falsy values", () => {
  expect(renderTableEmptyValue(0)).toBe(0);
  expect(renderTableEmptyValue(false)).toBe(false);
});

test("tree expand control is only rendered for records with children", () => {
  expect(hasTreeChildren({ nextList: [{ id: "child" }] }, "nextList")).toBe(true);
  expect(hasTreeChildren({ nextList: [] }, "nextList")).toBe(false);
  expect(hasTreeChildren({ nextList: null }, "nextList")).toBe(false);
  expect(hasTreeChildren({}, "nextList")).toBe(false);
});
