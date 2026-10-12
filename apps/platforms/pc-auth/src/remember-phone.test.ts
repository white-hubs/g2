import { describe, expect, test } from "bun:test";

import type { KeyValueStorage } from "./remember-me";
import { REMEMBERED_PHONE_STORAGE_KEY, clearPhoneLogin, loadPhoneLogin, savePhoneLogin } from "./remember-phone";

function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("savePhoneLogin/loadPhoneLogin/clearPhoneLogin", () => {
  test("保存手机号后能原样读回（不加密，只是手机号，不是凭据）", () => {
    const storage = createMemoryStorage();
    savePhoneLogin(storage, "13800138000");
    expect(loadPhoneLogin(storage)).toBe("13800138000");
    expect(storage.getItem(REMEMBERED_PHONE_STORAGE_KEY)).toBe("13800138000");
  });

  test("本地没有缓存时返回 null", () => {
    const storage = createMemoryStorage();
    expect(loadPhoneLogin(storage)).toBeNull();
  });

  test("clearPhoneLogin 清除后读不到", () => {
    const storage = createMemoryStorage();
    savePhoneLogin(storage, "13800138000");
    clearPhoneLogin(storage);
    expect(loadPhoneLogin(storage)).toBeNull();
  });
});
