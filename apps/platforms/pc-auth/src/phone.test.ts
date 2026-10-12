import { describe, expect, test } from "bun:test";

import { isValidPhoneNumber } from "./phone";

describe("isValidPhoneNumber", () => {
  test("合法大陆手机号（1[3-9]开头共11位）返回 true", () => {
    expect(isValidPhoneNumber("13800138000")).toBe(true);
    expect(isValidPhoneNumber("15912345678")).toBe(true);
    expect(isValidPhoneNumber("19912345678")).toBe(true);
  });

  test("位数不对/开头不合法/含非数字字符返回 false", () => {
    expect(isValidPhoneNumber("1380013800")).toBe(false);
    expect(isValidPhoneNumber("138001380001")).toBe(false);
    expect(isValidPhoneNumber("12800138000")).toBe(false);
    expect(isValidPhoneNumber("1380013800a")).toBe(false);
    expect(isValidPhoneNumber("")).toBe(false);
  });
});
