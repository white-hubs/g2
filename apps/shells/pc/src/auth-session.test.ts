import { beforeEach, describe, expect, test } from "bun:test";

import {
  AUTH_SESSION_STORAGE_KEY,
  DEFAULT_AUTH_PERSISTENCE_LEVEL,
  type KeyValueStorage,
  clearPersistedAuth,
  loadPersistedAuth,
  persistAuth,
} from "./auth-session";

function memoryStorage(): KeyValueStorage {
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

describe("auth-session", () => {
  let local: KeyValueStorage;
  let session: KeyValueStorage;

  beforeEach(() => {
    local = memoryStorage();
    session = memoryStorage();
  });

  test("默认级别是 local", () => {
    expect(DEFAULT_AUTH_PERSISTENCE_LEVEL).toBe("local");
  });

  test("persistAuth 默认写入 local，并清除 session", () => {
    session.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: "old", tenant: "t0" }));
    persistAuth({ local, session }, { token: "tok", tenant: "tn" });
    expect(local.getItem(AUTH_SESSION_STORAGE_KEY)).toBe(JSON.stringify({ token: "tok", tenant: "tn" }));
    expect(session.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  test("persistAuth 可持久化 refreshToken（组织切换）", () => {
    persistAuth({ local, session }, { token: "tok", tenant: "tn", refreshToken: "rt" });
    expect(loadPersistedAuth({ local, session })).toEqual({
      auth: { token: "tok", tenant: "tn", refreshToken: "rt" },
      level: "local",
    });
  });

  test("persistAuth(session) 写入 session，并清除 local", () => {
    local.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: "old", tenant: "t0" }));
    persistAuth({ local, session }, { token: "tok", tenant: "tn" }, "session");
    expect(session.getItem(AUTH_SESSION_STORAGE_KEY)).toBe(JSON.stringify({ token: "tok", tenant: "tn" }));
    expect(local.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  test("loadPersistedAuth 能从 local 恢复", () => {
    persistAuth({ local, session }, { token: "tok", tenant: "tn" }, "local");
    expect(loadPersistedAuth({ local, session })).toEqual({
      auth: { token: "tok", tenant: "tn" },
      level: "local",
    });
  });

  test("loadPersistedAuth 能从 session 恢复", () => {
    persistAuth({ local, session }, { token: "tok", tenant: "tn" }, "session");
    expect(loadPersistedAuth({ local, session })).toEqual({
      auth: { token: "tok", tenant: "tn" },
      level: "session",
    });
  });

  test("两级同时有值时以 local 为准并清掉 session", () => {
    local.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: "local-tok", tenant: "L" }));
    session.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: "session-tok", tenant: "S" }));
    expect(loadPersistedAuth({ local, session })).toEqual({
      auth: { token: "local-tok", tenant: "L" },
      level: "local",
    });
    expect(session.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  test("非法 JSON / 缺 token 时视为无缓存", () => {
    local.setItem(AUTH_SESSION_STORAGE_KEY, "{");
    expect(loadPersistedAuth({ local, session })).toBeNull();
    local.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ tenant: "tn" }));
    expect(loadPersistedAuth({ local, session })).toBeNull();
    local.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: "", tenant: "tn" }));
    expect(loadPersistedAuth({ local, session })).toBeNull();
  });

  test("clearPersistedAuth 清除两级", () => {
    persistAuth({ local, session }, { token: "a", tenant: "b" }, "local");
    persistAuth({ local, session }, { token: "c", tenant: "d" }, "session");
    // session 写入后 local 已被清；再手动补一份 local 验证双清
    local.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ token: "a", tenant: "b" }));
    clearPersistedAuth({ local, session });
    expect(local.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(session.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});
