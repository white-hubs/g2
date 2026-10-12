/**
 * @vitest-environment jsdom
 *
 * 挂真实 ZhConfigProvider + Button，切换夜幕黑后检查 CSS 变量、MF 桥接与 antd CSS-in-JS 主色。
 */
import { Button, ConfigProvider, ZhConfigProvider } from "@g2-platform/pc-ui";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vitest";
import { defineComponent, h, nextTick } from "vue";

import { applySkinTheme } from "./skin-theme";

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

function documentStyleText(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

afterEach(() => {
  document.body.className = "";
  document.documentElement.style.cssText = "";
  document.querySelector("#g2-skin-theme-style")?.remove();
  document.body.innerHTML = "";
});

describe("skin theme browser-like verify", () => {
  test("切夜幕黑：:root 变量 + MF 桥接覆盖 #main-content / 浮层", () => {
    applySkinTheme("midnight", { storage: memoryStorage() });

    const root = getComputedStyle(document.documentElement);
    expect(root.getPropertyValue("--g2-color-primary").trim()).toBe("#5aa4ff");
    expect(root.getPropertyValue("--g2-color-button-text").trim()).toBe("#ffffff");
    expect(root.getPropertyValue("--g2-color-navigation-text").trim()).toBe("#edf5ff");
    expect(root.getPropertyValue("--ant-color-primary").trim()).toBe("#5aa4ff");

    const css = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(css).toContain("#main-content .ant-btn-primary");
    expect(css).toContain(".shell-pc-content .ant-btn-primary");
    expect(css).toContain(".ant-select-dropdown .ant-select-item-option-selected");
    expect(css).toContain(".ant-modal-root .ant-btn-primary");
    expect(document.body.classList.contains("g2-skin-midnight")).toBe(true);
  });

  test("ZhConfigProvider 跟随换肤，antd CSS-in-JS 写入夜幕黑主色", async () => {
    const storage = memoryStorage();
    applySkinTheme("kaihe-blue", { storage });

    const Host = defineComponent({
      setup() {
        return () =>
          h("div", { id: "main-content", class: "shell-pc-content" }, [
            h(ZhConfigProvider, null, () =>
              h(Button, { type: "primary", class: "verify-primary-btn", "data-testid": "verify-primary-btn" }, () => "提交"),
            ),
          ]);
      },
    });

    const wrapper = mount(Host, { attachTo: document.body });
    await nextTick();
    await nextTick();

    expect(wrapper.find("[data-testid=verify-primary-btn]").exists()).toBe(true);

    applySkinTheme("midnight", { storage });
    await nextTick();
    await nextTick();
    await new Promise((r) => setTimeout(r, 80));
    await nextTick();

    const styles = documentStyleText().toLowerCase().replace(/\s+/gu, "");
    const hasMidnightBlue = styles.includes("#5aa4ff") || styles.includes("rgb(90,164,255)") || styles.includes("90,164,255");
    expect(hasMidnightBlue).toBe(true);

    const bridge = document.querySelector("#g2-skin-theme-style")?.textContent ?? "";
    expect(bridge).toContain("#main-content .ant-btn-primary");

    wrapper.unmount();
  });

  test("对照：硬编码 ConfigProvider 不自动跟肤（说明必须用 ZhConfigProvider）", async () => {
    const Frozen = defineComponent({
      setup() {
        return () =>
          h(ConfigProvider, { theme: { token: { colorPrimary: "#1890ff" } } }, () =>
            h(Button, { type: "primary", class: "frozen-btn" }, () => "冻"),
          );
      },
    });
    const frozen = mount(Frozen, { attachTo: document.body });
    await nextTick();
    applySkinTheme("midnight", { storage: memoryStorage() });
    await nextTick();
    expect(frozen.find(".frozen-btn").exists()).toBe(true);
    frozen.unmount();
  });
});
