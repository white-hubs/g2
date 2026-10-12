import { describe, expect, test } from "bun:test";

import type { KeyValueStorage } from "./remember-me";
import { SYSTEM_TITLE_STORAGE_KEY, loadSystemTitle, resolveSystemTitle, saveSystemTitle } from "./system-title-cache";

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

describe("system-title-cache", () => {
  test("save 后再 load 能读回标题", () => {
    const storage = createMemoryStorage();
    saveSystemTitle(storage, "华威集团-ghy");
    expect(storage.getItem(SYSTEM_TITLE_STORAGE_KEY)).toBe("华威集团-ghy");
    expect(loadSystemTitle(storage)).toBe("华威集团-ghy");
  });

  test("空串或空白不写入缓存", () => {
    const storage = createMemoryStorage();
    saveSystemTitle(storage, "  ");
    expect(loadSystemTitle(storage)).toBeNull();
  });

  test("resolve 优先用本地缓存，其次固定配置，最后 fallback", () => {
    const storage = createMemoryStorage();
    expect(resolveSystemTitle(storage, { configured: "nginx-title", fallback: "default" })).toBe("nginx-title");

    saveSystemTitle(storage, "cached-title");
    expect(resolveSystemTitle(storage, { configured: "nginx-title", fallback: "default" })).toBe("cached-title");

    expect(resolveSystemTitle(createMemoryStorage(), { fallback: "default" })).toBe("default");
  });
});
