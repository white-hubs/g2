import { expect, it } from "bun:test";

import { toChineseCurrency } from "./currency";

it("formats the amount shown below the legacy amount control", () => {
  expect(toChineseCurrency(0)).toBe("零元整");
  expect(toChineseCurrency(1234.56)).toBe("壹仟贰佰叁拾肆元伍角陆分");
  expect(toChineseCurrency(1001.05)).toBe("壹仟零壹元伍分");
  expect(toChineseCurrency(0.005)).toBe("伍毫");
  expect(toChineseCurrency("")).toBe("");
});
