import { describe, expect, test } from "bun:test";

import {
  BUILT_IN_THEMES,
  applyTheme,
  contrastRatio,
  createCustomTheme,
  createTheme,
  getTheme,
  readThemeLibrary,
  removeBuiltInThemeOverride,
  removeCustomTheme,
  saveBuiltInThemeOverride,
  restoreTheme,
  saveCustomTheme,
  subscribeTheme,
  validateTheme,
} from "./index";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function themeDocument(): { doc: Document; properties: Map<string, string>; events: Event[] } {
  const properties = new Map<string, string>();
  const events: Event[] = [];
  const target = new EventTarget() as unknown as Window;
  target.addEventListener("g2:theme-change", (event) => events.push(event));
  const doc = {
    documentElement: {
      style: { setProperty: (key: string, value: string) => properties.set(key, value) },
    },
    defaultView: target,
  } as unknown as Document;
  return { doc, properties, events };
}

describe("theme contract", () => {
  test("内置亮暗主题使用同一完整 Token 模型", () => {
    expect(BUILT_IN_THEMES).toHaveLength(4);
    expect(validateTheme(BUILT_IN_THEMES[0])).toEqual([]);
    expect(validateTheme(BUILT_IN_THEMES[1])).toEqual([]);
    expect(BUILT_IN_THEMES[0].tokens.buttonText).toBe("#ffffff");
    expect(BUILT_IN_THEMES[0].tokens.navigationText).toBe("#ffffff");
    expect(BUILT_IN_THEMES[0].tokens).toMatchObject({
      pageBg: "#f5f7fa",
      pageLayoutBg: "#ffffff",
      surfaceBg: "#f5f7fa",
      navigationBg: "#1890ff",
      navigationActiveBg: "#bae7ff",
      navigationActiveText: "#1890ff",
      sideMenuBg: "#f7fbff",
      sideMenuText: "#334155",
    });
    expect(BUILT_IN_THEMES[1].tokens).toMatchObject({
      primary: "#5aa4ff",
      pageBg: "#071426",
      pageLayoutBg: "#1b2737",
      surfaceBg: "#071426",
      text: "#edf5ff",
      border: "#29425f",
      buttonText: "#ffffff",
      navigationText: "#edf5ff",
      navigationBg: "#071426",
      navigationActiveBg: "#103a67",
      navigationActiveText: "#edf5ff",
      sideMenuBg: "#0b1c33",
      sideMenuText: "#d7e7fa",
    });
    expect(BUILT_IN_THEMES[2]).toMatchObject({
      id: "warm-orange",
      name: "暖阳橙",
      mode: "light",
      tokens: {
        primary: "#f08a24",
        pageBg: "#fff7ed",
        pageLayoutBg: "#ffffff",
        surfaceBg: "#fff7ed",
        secondarySurfaceBg: "#fff0dc",
        navigationBg: "#f08a24",
        sideMenuBg: "#fff9f2",
      },
    });
    expect(BUILT_IN_THEMES[3]).toMatchObject({
      id: "forest-green",
      name: "森林绿",
      mode: "light",
      tokens: {
        primary: "#22a06b",
        pageBg: "#f2fbf6",
        pageLayoutBg: "#ffffff",
        surfaceBg: "#f2fbf6",
        secondarySurfaceBg: "#e7f8ee",
        navigationBg: "#22a06b",
        sideMenuBg: "#f5fcf8",
      },
    });
  });

  test("写入 CSS Token、兼容色板、缓存并发布事件", () => {
    const { doc, properties, events } = themeDocument();
    const theme = createTheme("custom", "自定义绿", "#00ba8b");
    let received = "";
    const cancel = subscribeTheme((next) => {
      received = next.id;
    }, doc.defaultView!);
    applyTheme(theme, { document: doc, storage: memoryStorage() });
    cancel();
    expect(properties.get("--g2-color-primary")).toBe("#00ba8b");
    expect(properties.get("--g2-color-page-layout-bg")).toBe("#ffffff");
    expect(properties.get("--g2-color-button-text")).toBe(theme.tokens.buttonText);
    expect(properties.get("--g2-color-navigation-text")).toBe(theme.tokens.navigationText);
    expect(properties.get("--g2-color-side-menu-bg")).toBe(theme.tokens.sideMenuBg);
    expect(properties.get("--g2-color-side-menu-text")).toBe(theme.tokens.sideMenuText);
    expect(properties.get("--cube-theme-var--primary-6")).toBe("#00ba8b");
    expect(received).toBe("custom");
    expect(events).toHaveLength(1);
    expect(getTheme().id).toBe("custom");
  });

  test("仅拒绝非法颜色，允许用户保存任意合法的文字与背景组合", () => {
    const theme = createTheme("bad", "bad", "#1677ff");
    theme.tokens.primary = "blue";
    theme.tokens.text = "#ffffff";
    theme.tokens.pageBg = "#ffffff";
    expect(validateTheme(theme)).toContain("invalid primary");
    expect(validateTheme(theme)).not.toContain("insufficient contrast: text/pageBg");
    expect(contrastRatio("#000000", "#1677ff")).toBeGreaterThan(4.5);
  });

  test("缓存主题可在下一次启动前恢复", () => {
    const storage = memoryStorage();
    const first = themeDocument();
    applyTheme(createTheme("persisted", "缓存主题", "#fa8c16"), { document: first.doc, storage });
    const second = themeDocument();
    expect(restoreTheme({ document: second.doc, storage }).id).toBe("persisted");
    expect(second.properties.get("--g2-color-primary")).toBe("#fa8c16");
  });

  test("旧缓存保留容器背景，同时补齐独立的 PageLayout 卡片背景", () => {
    const storage = memoryStorage();
    const legacyLight = createTheme("legacy-light", "旧浅色主题", "#1890ff", "light", {
      pageBg: "#f5f7fa",
      surfaceBg: "#f5f7fa",
    });
    delete (legacyLight.tokens as Partial<typeof legacyLight.tokens>).pageLayoutBg;
    storage.setItem("g2-ui-theme-v1", JSON.stringify(legacyLight));
    const lightDocument = themeDocument();
    const restoredLight = restoreTheme({ document: lightDocument.doc, storage });
    expect(restoredLight.tokens.surfaceBg).toBe("#f5f7fa");
    expect(restoredLight.tokens.pageLayoutBg).toBe("#ffffff");
    expect(lightDocument.properties.get("--g2-color-page-layout-bg")).toBe("#ffffff");

    const legacyDark = createTheme("legacy-dark", "旧深色主题", "#5aa4ff", "dark", {
      pageBg: "#071426",
      surfaceBg: "#071426",
    });
    delete (legacyDark.tokens as Partial<typeof legacyDark.tokens>).pageLayoutBg;
    storage.setItem("g2-ui-theme-v1", JSON.stringify(legacyDark));
    const darkDocument = themeDocument();
    const restoredDark = restoreTheme({ document: darkDocument.doc, storage });
    expect(restoredDark.tokens.surfaceBg).toBe("#071426");
    expect(restoredDark.tokens.pageLayoutBg).toBe("#1b2737");
    expect(darkDocument.properties.get("--g2-color-page-layout-bg")).toBe("#1b2737");
  });

  test("自定义主题可保存、读取和删除，内置主题不可删除", () => {
    const storage = memoryStorage();
    const custom = createCustomTheme("custom-green", "我的绿色", "#00ba8b", "dark", {
      pageBg: "#101820",
      surfaceBg: "#18242d",
      secondarySurfaceBg: "#20354a",
      text: "#f5f5f5",
      border: "#334155",
      buttonText: "#000000",
      navigationText: "#000000",
      sideMenuBg: "#123456",
      sideMenuText: "#f0f0f0",
    });
    expect(saveCustomTheme(custom, storage).map((theme) => theme.id)).toContain("custom-green");
    expect(readThemeLibrary(storage).find((theme) => theme.id === "custom-green")?.tokens.surfaceBg).toBe("#18242d");
    expect(readThemeLibrary(storage).find((theme) => theme.id === "custom-green")?.tokens.navigationText).toBe("#000000");
    expect(readThemeLibrary(storage).find((theme) => theme.id === "custom-green")?.tokens.sideMenuActiveBg).toBe("#0d5c66");
    expect(readThemeLibrary(storage).find((theme) => theme.id === "custom-green")?.tokens.sideMenuActiveText).toBe("#f0f0f0");
    expect(readThemeLibrary(storage).find((theme) => theme.id === "custom-green")?.tokens.tableHeaderBg).toBe("#20354a");
    expect(() => removeCustomTheme("kaihe-blue", storage)).toThrow("built-in themes cannot be deleted");
    expect(removeCustomTheme("custom-green", storage).map((theme) => theme.id)).not.toContain("custom-green");
  });

  test("开河蓝与夜幕黑可保存本地颜色覆盖并恢复默认色板", () => {
    const storage = memoryStorage();
    const edited = createCustomTheme("midnight", "夜幕黑", "#5aa4ff", "dark", {
      pageBg: "#071426",
      surfaceBg: "#0d2039",
      secondarySurfaceBg: "#102743",
      text: "#edf5ff",
      border: "#29425f",
      buttonText: "#ffffff",
      navigationText: "#edf5ff",
      sideMenuBg: "#0b1c33",
      sideMenuText: "#d7e7fa",
    });
    edited.tokens.primary = "#6bb5ff";

    expect(saveBuiltInThemeOverride(edited, storage).find((theme) => theme.id === "midnight")?.tokens.primary).toBe("#6bb5ff");
    expect(readThemeLibrary(storage).find((theme) => theme.id === "midnight")?.createdBy).toBe("local-user");
    expect(removeBuiltInThemeOverride("midnight", storage).find((theme) => theme.id === "midnight")?.tokens.primary).toBe("#5aa4ff");
  });

  test("旧主题会补齐按钮和导航文字，手动覆盖不受对比度限制", () => {
    const storage = memoryStorage();
    const legacy = createTheme("legacy", "旧主题", "#1677ff");
    delete (legacy.tokens as Partial<typeof legacy.tokens>).buttonText;
    delete (legacy.tokens as Partial<typeof legacy.tokens>).navigationText;
    delete (legacy.tokens as Partial<typeof legacy.tokens>).sideMenuBg;
    delete (legacy.tokens as Partial<typeof legacy.tokens>).sideMenuText;
    storage.setItem("g2-ui-theme-v1", JSON.stringify(legacy));
    const restored = restoreTheme({ document: themeDocument().doc, storage });
    expect(restored.tokens.buttonText).toBe("#000000");
    expect(restored.tokens.navigationText).toBe("#000000");

    const invalid = createTheme("invalid-copy", "错误文字", "#1677ff");
    invalid.tokens.buttonText = "#ffffff";
    invalid.tokens.navigationText = "#ffffff";
    expect(validateTheme(invalid)).toEqual([]);
  });
});
