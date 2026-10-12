import { describe, expect, test } from "bun:test";

import { doPasswordsMatch, isPasswordStrongEnough, isValidAccountForPasswordRecovery } from "./password-reset";

describe("isValidAccountForPasswordRecovery", () => {
  test("合法手机号返回 true", () => {
    expect(isValidAccountForPasswordRecovery("13800138000")).toBe(true);
  });

  test("合法邮箱返回 true", () => {
    expect(isValidAccountForPasswordRecovery("alice@example.com")).toBe(true);
  });

  test("既不是手机号也不是邮箱、或空字符串返回 false", () => {
    expect(isValidAccountForPasswordRecovery("not-an-account")).toBe(false);
    expect(isValidAccountForPasswordRecovery("")).toBe(false);
  });
});

describe("isPasswordStrongEnough", () => {
  test("同时包含大小写字母、数字、指定特殊字符且长度达标时返回 true", () => {
    expect(isPasswordStrongEnough("Abcdefg1!")).toBe(true);
  });

  test("缺少大写/小写/数字/特殊字符任意一类时返回 false", () => {
    expect(isPasswordStrongEnough("abcdefg1!")).toBe(false);
    expect(isPasswordStrongEnough("ABCDEFG1!")).toBe(false);
    expect(isPasswordStrongEnough("Abcdefgh!")).toBe(false);
    expect(isPasswordStrongEnough("Abcdefg1")).toBe(false);
  });

  test("长度不足时返回 false", () => {
    expect(isPasswordStrongEnough("Ab1!")).toBe(false);
  });

  test("特殊字符集合外的字符（如 `]`）不计入允许字符，整体不匹配", () => {
    expect(isPasswordStrongEnough("Abcdefg1]")).toBe(false);
  });
});

describe("doPasswordsMatch", () => {
  test("两次输入相同返回 true，不同返回 false", () => {
    expect(doPasswordsMatch("Abcdefg1!", "Abcdefg1!")).toBe(true);
    expect(doPasswordsMatch("Abcdefg1!", "Abcdefg2!")).toBe(false);
  });
});
