import { expect, test } from "bun:test";

import { cascaderPathLabels, servicePeriodValue, validateServicePeriod } from "./legacy-special-controls";

test("legacy CascaderInput retains the configured path and custom field names", () => {
  const options = [{ code: "parent", title: "父级", nodes: [{ code: "child", title: "子级" }] }];
  const fields = { label: "title", value: "code", children: "nodes" };
  expect(cascaderPathLabels(options, ["parent", "child"], fields)).toEqual(["父级", "子级"]);
  expect(cascaderPathLabels(options, ["parent", "unknown"], fields)).toEqual(["父级", "unknown"]);
  expect(cascaderPathLabels([], [])).toEqual([]);
});

test("ServicePeriod keeps its legacy limited/date object shape", () => {
  expect(servicePeriodValue(null)).toEqual({ radioValue: "limited", date: "" });
  expect(servicePeriodValue({ radioValue: "unlimited", date: "2027-01-01" })).toEqual({ radioValue: "unlimited", date: "2027-01-01" });
});

test("ServicePeriod requires a date only for on-site personnel", () => {
  expect(validateServicePeriod(null, "OTHER")).toBeUndefined();
  expect(validateServicePeriod({ radioValue: "unlimited", date: "" }, "ZCRY")).toBe("驻场人员必须选择有期限");
  expect(validateServicePeriod({ radioValue: "limited", date: "" }, "ZCRY")).toBe("请选择期限时间");
  expect(validateServicePeriod({ radioValue: "limited", date: "2027-01-01" }, "ZCRY")).toBeUndefined();
  expect(validateServicePeriod({ radioValue: "unlimited", date: "" }, { value: "ZCRY" })).toBeUndefined();
});
