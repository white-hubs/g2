import { describe, expect, test } from "bun:test";

import {
  DEFAULT_SKIN_PRIMARY,
  LEGACY_SKIN_COLOR_KEY,
  SKIN_STORAGE_KEY,
  primaryColorFromSkinEvent,
  readStoredPrimaryColor,
} from "./skin-primary";

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe("readStoredPrimaryColor", () => {
  test("优先读 legacy skinColor.primaryColor", () => {
    const storage = memoryStorage({
      [LEGACY_SKIN_COLOR_KEY]: JSON.stringify({ primaryColor: "#00BA8B", btnPrimaryBg: "#00BA8B" }),
      [SKIN_STORAGE_KEY]: "kaihe-blue",
    });
    expect(readStoredPrimaryColor(storage)).toBe("#00BA8B");
  });

  test("无 skinColor 时按 g2-pc-skin 预设映射", () => {
    const storage = memoryStorage({ [SKIN_STORAGE_KEY]: "sunset" });
    expect(readStoredPrimaryColor(storage)).toBe("#fa8c16");
  });

  test("无存储时回落开河蓝", () => {
    expect(readStoredPrimaryColor(memoryStorage())).toBe(DEFAULT_SKIN_PRIMARY);
  });
});

describe("primaryColorFromSkinEvent", () => {
  test("接受非空字符串 detail", () => {
    expect(primaryColorFromSkinEvent("#00BA8B")).toBe("#00BA8B");
    expect(primaryColorFromSkinEvent("  #fa8c16  ")).toBe("#fa8c16");
  });

  test("拒绝非字符串", () => {
    expect(primaryColorFromSkinEvent(null)).toBeNull();
    expect(primaryColorFromSkinEvent({ primaryColor: "#00BA8B" })).toBeNull();
  });
});
