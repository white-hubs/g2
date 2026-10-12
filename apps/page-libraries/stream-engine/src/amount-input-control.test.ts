import { expect, test } from "bun:test";

import { LEGACY_AMOUNT_MAX, formatLegacyAmount, parseLegacyAmount } from "./amount-input-control";

test("amount formatting retains fixed precision and legacy decimal grouping", () => {
  expect(formatLegacyAmount(1234567.8, 2)).toBe("1,234,567.80");
  expect(formatLegacyAmount(-1234.5, 2)).toBe("-1,234.50");
  expect(formatLegacyAmount(undefined, 2)).toBe("0.00");
  expect(formatLegacyAmount(12.3, 3)).toBe("12.300");
  expect(formatLegacyAmount(LEGACY_AMOUNT_MAX, 2)).toBe("99,999,999,999,999.98");
});

test("amount parsing preserves numeric signs and strips currency and grouping", () => {
  expect(parseLegacyAmount("￥ 1,234,567.80")).toBe("1234567.80");
  expect(parseLegacyAmount("-1,234.567")).toBe("-1234.56");
  expect(parseLegacyAmount(undefined)).toBe("");
});
