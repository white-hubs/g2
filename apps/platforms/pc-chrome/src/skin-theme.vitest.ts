import { THEME_STORAGE_KEY, createCustomTheme } from "@g2-platform/theme-contract";
import { afterEach, describe, expect, test } from "vitest";

import { SKIN_PRESETS, applyCustomTheme, applySkinTheme, readStoredSkinKey, restoreSkinTheme } from "./skin-theme";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
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

afterEach(() => {
  document.body.className = "";
  document.documentElement.style.cssText = "";
  document.querySelector("#g2-skin-theme-style")?.remove();
});

describe("applySkinTheme", () => {
  test("切换夜幕黑时写入夜幕黑主色和子应用所需的 cube-theme-var 色板", () => {
    applySkinTheme("midnight", { storage: memoryStorage() });

    const root = getComputedStyle(document.documentElement);
    expect(root.getPropertyValue("--g2-color-primary").trim()).toBe("#5aa4ff");
    expect(root.getPropertyValue("--g2-color-page-bg").trim()).toBe("#071426");
    expect(root.getPropertyValue("--g2-color-surface-bg").trim()).toBe("#071426");
    expect(root.getPropertyValue("--g2-color-navigation-text").trim()).toBe("#edf5ff");
    expect(root.getPropertyValue("--g2-color-navigation-bg").trim()).toBe("#071426");
    expect(root.getPropertyValue("--g2-color-navigation-active-bg").trim()).toBe("#103a67");
    expect(root.getPropertyValue("--cube-theme-var--primary-color").trim().replace(/\s+/gu, "")).toBe("rgb(90,164,255)");
    expect(root.getPropertyValue("--cube-theme-var--primary-6").trim()).toBe("#5aa4ff");
    expect(root.getPropertyValue("--ant-primary-color").trim().replace(/\s+/gu, "")).toBe("rgb(90,164,255)");
    expect(document.body.classList.contains("g2-skin-midnight")).toBe(true);
    expect(document.body.classList.contains("g2-skin-kaihe-blue")).toBe(false);
  });

  test("持久化 skin key，并写 legacy skinColor 供遗留子应用读取", () => {
    const storage = memoryStorage();
    applySkinTheme("midnight", { storage });

    expect(readStoredSkinKey(storage)).toBe("midnight");
    expect(JSON.parse(storage.getItem("skinColor") ?? "null")).toEqual({
      primaryColor: "#5aa4ff",
      btnPrimaryBg: "#5aa4ff",
    });
  });

  test("应用自定义主题时清除默认主题 class，主题状态与默认主题互斥", () => {
    const theme = createCustomTheme("custom-night", "我的夜幕", "#5aa4ff", "dark", {
      pageBg: "#071426",
      surfaceBg: "#0d2039",
      text: "#edf5ff",
      border: "#29425f",
      buttonText: "#071426",
      navigationText: "#edf5ff",
    });

    applyCustomTheme(theme, { storage: memoryStorage() });

    expect(document.body.classList.contains("g2-skin-kaihe-blue")).toBe(false);
    expect(document.body.classList.contains("g2-skin-midnight")).toBe(false);
    expect(getComputedStyle(document.documentElement).getPropertyValue("--g2-color-page-bg").trim()).toBe("#071426");
    expect(getComputedStyle(document.documentElement).getPropertyValue("--g2-color-button-text").trim()).toBe("#071426");
  });

  test("恢复已保存的自定义主题时，同步 body 浮层的运行时主色", () => {
    const storage = memoryStorage();
    const theme = createCustomTheme("custom-orange", "我的橙色", "#d46b08", "light", {
      pageBg: "#fff7ed",
      surfaceBg: "#fff7ed",
    });
    storage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));

    restoreSkinTheme({ storage });

    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(getComputedStyle(document.documentElement).getPropertyValue("--g2-color-primary").trim()).toBe("#d46b08");
    expect(css).toContain("--g2-color-primary: #d46b08;");
  });

  test("未知 key 回落到默认开河蓝", () => {
    applySkinTheme("not-a-skin", { storage: memoryStorage() });

    expect(getComputedStyle(document.documentElement).getPropertyValue("--g2-color-primary").trim()).toBe(SKIN_PRESETS[0]!.color);
    expect(document.body.classList.contains("g2-skin-kaihe-blue")).toBe(true);
  });

  test("注入子应用桥接样式，使 .primary-color / 微应用 ant-btn-primary 跟随主题变量", () => {
    applySkinTheme("midnight", { storage: memoryStorage() });
    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain(".primary-color");
    expect(css).toContain("#main-content .ant-btn-primary");
    expect(css).toContain("#LegacyProblemsApp .ant-btn-primary");
    expect(css).toContain("var(--cube-theme-var--primary-color)");
    expect(css).toContain(".ant-btn-color-primary.ant-btn-variant-solid");
    expect(css).toContain("#main-content,");
    expect(css).toContain("#pc-layout-container {\n  background-color: var(--g2-color-page-layout-bg, #ffffff);");
    expect(css).toContain("#main-content .ant-card");
    expect(css).toContain("#main-content .ant-table-thead > tr > th");
    expect(css).toContain("#main-content .ant-input");
  });

  test("桥接覆盖 Switch / Radio.Button(solid) / Checkbox（旧仓 global.less 关键控件）", () => {
    applySkinTheme("midnight", { storage: memoryStorage() });
    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain("#LegacyPersonalApp .ant-switch-checked");
    expect(css).toContain(".ant-radio-group-solid .ant-radio-button-wrapper-checked");
    expect(css).toContain(".ant-checkbox-checked .ant-checkbox-inner");
  });

  test("桥接覆盖划词选中与详情小节标题类", () => {
    applySkinTheme("midnight", { storage: memoryStorage() });
    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain("::selection");
    expect(css).toContain(".g2-skin-section-title");
  });

  test("桥接覆盖 MF 内容区与 body 浮层（Select/Dropdown/DatePicker/Modal）", () => {
    applySkinTheme("midnight", { storage: memoryStorage() });
    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain(".shell-pc-content .ant-btn-primary");
    expect(css).toContain("#pc-layout-container .ant-btn-primary");
    expect(css).toContain(".ant-select-dropdown .ant-select-item-option-selected");
    expect(css).toContain(".ant-modal-root .ant-btn-primary");
    expect(css).toContain(".ant-modal-root .ant-modal-mask");
    expect(css).toContain("background-color: rgba(0, 0, 0, 0.45) !important;");
    expect(css).toContain(".ant-modal-root .ant-modal-content");
    expect(css).toContain("var(--g2-color-elevated-bg");
    expect(css).toContain(".ant-picker-cell-in-view.ant-picker-cell-selected");
    expect(css).toContain(".ant-picker-dropdown :is(.ant-picker-panel-container");
    expect(css).toContain(".ant-picker-time-panel-column > li.ant-picker-time-panel-cell");
    expect(css).toContain(".ant-menu-item-selected");
    expect(css).toContain(".ant-table-tbody > tr.ant-table-row-selected > td");
  });

  test("link 跟肤排除 danger，危险删除按钮保持错误色", () => {
    applySkinTheme("kaihe-blue", { storage: memoryStorage() });
    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain(".shell-pc-content .ant-btn-link:not(.ant-btn-dangerous)");
    expect(css).toContain(".shell-pc-content .ant-btn-link.ant-btn-dangerous");
    expect(css).toContain("var(--ant-color-error");
    expect(css).not.toMatch(/\.shell-pc-content \.ant-btn-link \{/u);
  });

  test("allowClear/showCount 的 affix-wrapper 内层 input 聚焦时去掉边框，避免双框", () => {
    applySkinTheme("kaihe-blue", { storage: memoryStorage() });
    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain(
      "#pc-layout-container .ant-input-affix-wrapper:not(.ant-input-textarea-affix-wrapper) :is(input.ant-input, input.ant-input:focus, input.ant-input-focused)",
    );
    expect(css).toContain(
      ".ant-modal-root .ant-input-affix-wrapper:not(.ant-input-textarea-affix-wrapper) :is(input.ant-input, input.ant-input:focus, input.ant-input-focused)",
    );
    expect(css).toMatch(
      /\.ant-input-affix-wrapper:not\(\.ant-input-textarea-affix-wrapper\) :is\(input\.ant-input[\s\S]*?border:\s*none\s*!important/u,
    );
  });
});
