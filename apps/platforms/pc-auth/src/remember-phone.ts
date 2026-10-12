import type { KeyValueStorage } from "./remember-me";

/**
 * 手机号登录的"记住我"，迁移自旧仓 `login-phone.vue` 的 `cube-login-info`（只存 `phone` 字段，
 * 第 300-307、469-473 行）。与账密登录的 `remember-me.ts` 分开成独立 key/模块，因为：
 * 1. 手机号本身不是敏感凭据，不需要 `encrypt()` 加密存储（对齐旧仓行为）；
 * 2. 账密登录和手机号登录是两个独立标签页，各自维护自己的"记住我"状态更符合直觉
 *    （切换标签不会互相清掉对方记住的内容）。
 */
export const REMEMBERED_PHONE_STORAGE_KEY = "g2-pc-auth:remembered-phone";

export function savePhoneLogin(storage: KeyValueStorage, phone: string): void {
  storage.setItem(REMEMBERED_PHONE_STORAGE_KEY, phone);
}

export function loadPhoneLogin(storage: KeyValueStorage): string | null {
  return storage.getItem(REMEMBERED_PHONE_STORAGE_KEY);
}

export function clearPhoneLogin(storage: KeyValueStorage): void {
  storage.removeItem(REMEMBERED_PHONE_STORAGE_KEY);
}
