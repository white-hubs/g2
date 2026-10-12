import { describe, expect, test } from "bun:test";

import { decrypt } from "./crypto";
import {
  type KeyValueStorage,
  REMEMBERED_LOGIN_STORAGE_KEY,
  clearRememberedLogin,
  isRememberPasswordEnabled,
  loadRememberedLogin,
  saveRememberedLogin,
} from "./remember-me";

/**
 * bun:test 运行环境没有全局 `localStorage`（不是 jsdom），所以这里用一个最小的内存实现
 * 代替真实的 `Storage`，只要满足 `getItem`/`setItem`/`removeItem` 接口即可——
 * `LoginPage.vue` 在真实浏览器/jsdom 里会传入 `window.localStorage`。
 */
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

describe("saveRememberedLogin/loadRememberedLogin/clearRememberedLogin", () => {
  test("默认关闭记住密码时只持久化账号，不写密码字段", () => {
    const storage = createMemoryStorage();
    saveRememberedLogin(storage, { account: "alice", password: "S3cret!pwd" }, { rememberPassword: false });

    const raw = storage.getItem(REMEMBERED_LOGIN_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { account: string; password?: string };
    expect(parsed.account).toBe("alice");
    expect(parsed.password).toBeUndefined();
    expect(loadRememberedLogin(storage)).toEqual({ account: "alice", password: "" });
  });

  test("开启记住密码时写入密文密码，加载可回填明文", () => {
    const storage = createMemoryStorage();
    saveRememberedLogin(storage, { account: "alice", password: "S3cret!pwd" }, { rememberPassword: true });

    const raw = storage.getItem(REMEMBERED_LOGIN_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { account: string; password: string };
    expect(parsed.account).toBe("alice");
    expect(parsed.password).not.toBe("S3cret!pwd");
    expect(decrypt(parsed.password)).toBe("S3cret!pwd");
    expect(loadRememberedLogin(storage)).toEqual({ account: "alice", password: "S3cret!pwd" });
  });

  test("下次加载时能正确回填账号和明文密码（内部用 decrypt 还原）", () => {
    const storage = createMemoryStorage();
    saveRememberedLogin(storage, { account: "bob", password: "hunter2" }, { rememberPassword: true });

    const loaded = loadRememberedLogin(storage);

    expect(loaded).toEqual({ account: "bob", password: "hunter2" });
  });

  test("本地没有缓存时返回 null", () => {
    const storage = createMemoryStorage();
    expect(loadRememberedLogin(storage)).toBeNull();
  });

  test("缓存格式不合法（不是合法 JSON，或缺账号）时返回 null，不抛错", () => {
    const storage = createMemoryStorage();
    storage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, "not-json");
    expect(loadRememberedLogin(storage)).toBeNull();

    storage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, JSON.stringify({ password: "only-password" }));
    expect(loadRememberedLogin(storage)).toBeNull();
  });

  test("仅有账号的缓存可以加载（密码为空串）", () => {
    const storage = createMemoryStorage();
    storage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, JSON.stringify({ account: "only-account" }));
    expect(loadRememberedLogin(storage)).toEqual({ account: "only-account", password: "" });
  });

  test("取消勾选/登出后调用 clearRememberedLogin 清除本地缓存", () => {
    const storage = createMemoryStorage();
    saveRememberedLogin(storage, { account: "carol", password: "pw" }, { rememberPassword: true });
    expect(loadRememberedLogin(storage)).not.toBeNull();

    clearRememberedLogin(storage);

    expect(storage.getItem(REMEMBERED_LOGIN_STORAGE_KEY)).toBeNull();
    expect(loadRememberedLogin(storage)).toBeNull();
  });

  test("isRememberPasswordEnabled 默认关闭，仅显式 true/1 开启", () => {
    expect(isRememberPasswordEnabled(undefined)).toBe(false);
    expect(isRememberPasswordEnabled("false")).toBe(false);
    expect(isRememberPasswordEnabled("true")).toBe(true);
    expect(isRememberPasswordEnabled("1")).toBe(true);
    expect(isRememberPasswordEnabled(true)).toBe(true);
  });
});
