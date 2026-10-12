import { describe, expect, test } from "bun:test";

import { shouldShowPasswordExpiredModal } from "./install-check-password";

describe("shouldShowPasswordExpiredModal", () => {
  test("密码过期且强制修改时显示", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: true, passwordForced: true }, "/index")).toBe(true);
  });

  test("密码过期但不强制、且用户本次会话已选择暂不修改时不显示", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: true, passwordForced: false, dismissedThisSession: true }, "/index")).toBe(
      false,
    );
  });

  test("不在 /index 路由时不显示（对齐旧仓仅在首页触发的行为）", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: true, passwordForced: true }, "/about")).toBe(false);
  });

  test("密码未过期时不显示", () => {
    expect(shouldShowPasswordExpiredModal({ passwordExpired: false, passwordForced: false }, "/index")).toBe(false);
  });
});
