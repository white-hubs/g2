import { describe, expect, test } from "bun:test";

import { type KeyValueStorage } from "./remember-me";
import { AGREEMENT_ACCEPTED_STORAGE_KEY, isLoginAgreementAccepted, setLoginAgreementAccepted } from "./user-agreement";

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

describe("isLoginAgreementAccepted/setLoginAgreementAccepted", () => {
  test("本地没有缓存时默认未同意", () => {
    const storage = createMemoryStorage();
    expect(isLoginAgreementAccepted(storage)).toBe(false);
  });

  test("setLoginAgreementAccepted(true) 后可被 isLoginAgreementAccepted 读到", () => {
    const storage = createMemoryStorage();
    setLoginAgreementAccepted(storage, true);
    expect(isLoginAgreementAccepted(storage)).toBe(true);
    expect(storage.getItem(AGREEMENT_ACCEPTED_STORAGE_KEY)).toBe("true");
  });

  test("setLoginAgreementAccepted(false) 后视为未同意", () => {
    const storage = createMemoryStorage();
    setLoginAgreementAccepted(storage, true);
    setLoginAgreementAccepted(storage, false);
    expect(isLoginAgreementAccepted(storage)).toBe(false);
  });

  test("存储里是非 'true' 的任意脏值时都视为未同意，不抛错", () => {
    const storage = createMemoryStorage();
    storage.setItem(AGREEMENT_ACCEPTED_STORAGE_KEY, "yes");
    expect(isLoginAgreementAccepted(storage)).toBe(false);
  });
});
