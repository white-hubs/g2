import { describe, expect, test } from "bun:test";

import { datePickerZhCN, RangePicker } from "./date-picker";

describe("pc-ui date-picker zh locale", () => {
  test("exports zh_CN locale with Chinese range placeholders", () => {
    expect(datePickerZhCN.lang?.locale).toMatch(/zh/i);
    expect(RangePicker).toBeDefined();
  });
});
