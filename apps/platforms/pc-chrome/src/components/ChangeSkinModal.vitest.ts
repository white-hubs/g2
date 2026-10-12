import { createCustomTheme, removeCustomTheme, saveCustomTheme } from "@g2-platform/theme-contract";
import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vitest";

import { applyCustomTheme, applySkinTheme } from "../skin-theme";
import ChangeSkinModal from "./ChangeSkinModal";

afterEach(() => {
  document.body.className = "";
  document.body.innerHTML = "";
});

describe("ChangeSkinModal", () => {
  test("默认收起，点击换肤入口后将默认和自定义主题排列在同一个列表", async () => {
    const wrapper = mount(ChangeSkinModal, { attachTo: document.body });

    expect(document.querySelectorAll(".pc-chrome-theme-console__item")).toHaveLength(0);

    await wrapper.find(".pc-chrome-change-skin-trigger").trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("主题设置");
    expect(document.body.textContent).toContain("开河蓝");
    expect(document.body.textContent).toContain("夜幕黑");
    expect(document.querySelectorAll(".pc-chrome-theme-console__item")).toHaveLength(2);
    expect(document.querySelectorAll(".pc-chrome-theme-console__built-in")).toHaveLength(2);
    expect(document.body.textContent).toContain("新建主题");
    expect(document.body.textContent).not.toContain("模式");

    wrapper.unmount();
  });

  test("可以创建并应用亮暗模式、页面与容器颜色及按钮和导航文字均可编辑的自定义主题", async () => {
    const wrapper = mount(ChangeSkinModal, { attachTo: document.body });
    await wrapper.find(".pc-chrome-change-skin-trigger").trigger("click");
    await flushPromises();
    const create = Array.from(document.querySelectorAll("button")).find((button) => button.textContent === "新建主题") as HTMLButtonElement;
    await new DOMWrapper(create).trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("页面背景");
    expect(document.body.textContent).toContain("容器背景");
    expect(document.body.textContent).toContain("按钮文字");
    expect(document.body.textContent).toContain("导航菜单文字");
    expect(document.body.textContent).toContain("保存并应用");
    expect(document.querySelector(".pc-chrome-theme-editor > .pc-chrome-theme-console__heading")).toBeNull();
    wrapper.unmount();
  });

  test("选中默认主题时展示勾选角标、切换 body class 并 emit skin-change", async () => {
    const wrapper = mount(ChangeSkinModal, { attachTo: document.body });
    await wrapper.find(".pc-chrome-change-skin-trigger").trigger("click");
    await flushPromises();

    const midnightItem = Array.from(document.querySelectorAll(".pc-chrome-theme-console__item")).find((item) =>
      item.textContent?.includes("夜幕黑"),
    );
    expect(midnightItem).toBeTruthy();
    await new DOMWrapper(midnightItem!).find(".pc-chrome-theme-console__apply").trigger("click");
    await flushPromises();

    expect(new DOMWrapper(midnightItem!).classes()).toContain("active");
    expect(new DOMWrapper(midnightItem!).find(".pc-chrome-change-skin-check").exists()).toBe(true);
    expect(document.body.classList.contains("g2-skin-midnight")).toBe(true);
    expect(document.body.classList.contains("g2-skin-kaihe-blue")).toBe(false);
    expect(wrapper.emitted("skinChange")).toEqual([["midnight"]]);
    expect(wrapper.emitted("layout-change")).toBeUndefined();

    wrapper.unmount();
  });

  test("自定义主题生效时不会同时选中任何默认主题", async () => {
    const theme = createCustomTheme("custom-exclusive", "专属主题", "#5aa4ff", "dark", {
      pageBg: "#071426",
      surfaceBg: "#0d2039",
      text: "#edf5ff",
      border: "#29425f",
      buttonText: "#071426",
      navigationText: "#edf5ff",
    });
    saveCustomTheme(theme);
    applyCustomTheme(theme);

    const wrapper = mount(ChangeSkinModal, { attachTo: document.body });
    await wrapper.find(".pc-chrome-change-skin-trigger").trigger("click");
    await flushPromises();

    expect(
      Array.from(document.querySelectorAll(".pc-chrome-theme-console__item")).filter((item) => item.classList.contains("active")),
    ).toHaveLength(1);
    expect(document.querySelector(".pc-chrome-theme-console__item.active")?.textContent).toContain("专属主题");

    wrapper.unmount();
    removeCustomTheme(theme.id);
    applySkinTheme("kaihe-blue");
  });
});
