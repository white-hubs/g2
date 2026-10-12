import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, test } from "vitest";

import SearchApplication, { flattenSearchEntries, isAppSearchHotkey } from "./SearchApplication";
import type { NavigationMenuNode } from "./top-bar-types";

afterEach(() => {
  document.body.innerHTML = "";
});

function buildMenuTree(): NavigationMenuNode[] {
  return [
    { domainName: "workspace", label: "工作台", path: "/workspace" },
    {
      domainName: "system",
      label: "系统管理",
      icon: "/resource/app-icons/系统管理/main.png",
      children: [
        { domainName: "system", label: "组织架构", path: "/system/org" },
        { domainName: "system", label: "权限管理", path: "/system/permission" },
      ],
    },
  ];
}

async function openSearchPanel(wrapper: ReturnType<typeof mount>) {
  await wrapper.find(".pc-chrome-search-application-trigger").trigger("click");
  await flushPromises();
  // 等拼音动态 import 完成（失败也不影响面板已展开）
  await flushPromises();
}

function isSearchModalOpen(): boolean {
  return Boolean(document.body.querySelector(".pc-chrome-search-application-modal"));
}

function searchLabels(): string[] {
  return Array.from(document.body.querySelectorAll(".pc-chrome-search-application-results__label")).map((el) => el.textContent ?? "");
}

describe("flattenSearchEntries", () => {
  test("子菜单继承一级应用 icon（拼音索引在打开搜索时再异步挂上）", () => {
    const entries = flattenSearchEntries(buildMenuTree());
    expect(entries).toEqual([
      { label: "工作台", path: "/workspace", group: "快捷" },
      {
        label: "组织架构",
        path: "/system/org",
        icon: "/resource/app-icons/系统管理/main.png",
        group: "系统管理",
      },
      {
        label: "权限管理",
        path: "/system/permission",
        icon: "/resource/app-icons/系统管理/main.png",
        group: "系统管理",
      },
    ]);
  });
});

describe("SearchApplication 分组展示", () => {
  test("结果按 group 分段展示，段标题可见", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);

    const headings = Array.from(document.body.querySelectorAll("[data-testid='search-group-heading']")).map((el) => el.textContent ?? "");
    expect(headings).toEqual(["快捷", "系统管理"]);
    expect(searchLabels()).toEqual(["工作台", "组织架构", "权限管理"]);

    wrapper.unmount();
  });
});

describe("SearchApplication", () => {
  test("默认收起，点击搜索入口后展开面板，展示所有可跳转（有 path）的入口", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });

    expect(isSearchModalOpen()).toBe(false);

    await openSearchPanel(wrapper);

    expect(searchLabels()).toEqual(["工作台", "组织架构", "权限管理"]);
    expect(document.body.querySelectorAll("img.pc-chrome-search-application-results__icon")).toHaveLength(2);
    expect(document.body.querySelectorAll(".pc-chrome-search-application-results__icon--empty")).toHaveLength(1);
    expect(document.body.querySelectorAll(".pc-chrome-search-application-results__arrow")).toHaveLength(3);
    expect(
      document.body.querySelector(".pc-chrome-search-application-panel")?.classList.contains("pc-chrome-search-application-panel--legacy"),
    ).toBe(true);

    wrapper.unmount();
  });

  test("输入关键字按 includes 模糊匹配过滤结果（大小写无关）", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);

    const input = document.body.querySelector(".pc-chrome-search-application-modal .ant-input") as HTMLInputElement;
    input.value = "组织";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(searchLabels()).toEqual(["组织架构"]);

    wrapper.unmount();
  });

  test("支持拼音全拼 / 首字母检索（对齐旧仓；打开后动态加载 pinyin-pro）", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);
    expect(isSearchModalOpen()).toBe(true);

    const input = document.body.querySelector(".pc-chrome-search-application-modal .ant-input") as HTMLInputElement;
    input.value = "zzjg";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();
    await flushPromises();
    expect(searchLabels()).toEqual(["组织架构"]);

    input.value = "zuzhi";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(searchLabels()).toEqual(["组织架构"]);

    wrapper.unmount();
  });

  test("关键字无匹配时显示空态提示", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);

    const input = document.body.querySelector(".pc-chrome-search-application-modal .ant-input") as HTMLInputElement;
    input.value = "不存在的关键字";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(document.body.querySelector(".pc-chrome-search-application-results")).toBeNull();
    expect(document.body.textContent).toContain("暂无匹配结果");

    wrapper.unmount();
  });

  test("点击搜索结果触发 navigate 并携带正确路径，同时收起面板", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);

    const target = Array.from(document.body.querySelectorAll(".pc-chrome-search-application-results li")).find(
      (el) => el.querySelector(".pc-chrome-search-application-results__label")?.textContent === "权限管理",
    ) as HTMLElement | undefined;
    expect(target).toBeTruthy();
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(wrapper.emitted("navigate")).toEqual([["/system/permission"]]);
    expect(isSearchModalOpen()).toBe(false);

    wrapper.unmount();
  });

  test("点遮罩（失焦）关闭搜索面板", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);
    expect(isSearchModalOpen()).toBe(true);

    const wrap = document.body.querySelector(".ant-modal-wrap") as HTMLElement | null;
    expect(wrap).toBeTruthy();
    // antdv：点在 wrap 自身（非 dialog）即 maskClosable
    wrap?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(isSearchModalOpen()).toBe(false);
    wrapper.unmount();
  });

  test("Escape 关闭搜索面板", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    await openSearchPanel(wrapper);
    expect(isSearchModalOpen()).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    await flushPromises();
    expect(isSearchModalOpen()).toBe(false);

    wrapper.unmount();
  });

  test("⌘/Ctrl+F 打开应用搜索；带 Shift 不拦截", async () => {
    const wrapper = mount(SearchApplication, { props: { menuTree: buildMenuTree() }, attachTo: document.body });
    expect(isSearchModalOpen()).toBe(false);

    const shiftF = new KeyboardEvent("keydown", {
      key: "f",
      code: "KeyF",
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(shiftF);
    await flushPromises();
    expect(isSearchModalOpen()).toBe(false);

    const cmdF = new KeyboardEvent("keydown", { key: "f", code: "KeyF", metaKey: true, bubbles: true, cancelable: true });
    document.dispatchEvent(cmdF);
    await flushPromises();
    await flushPromises();
    expect(cmdF.defaultPrevented).toBe(true);
    expect(isSearchModalOpen()).toBe(true);

    wrapper.unmount();
  });
});

describe("isAppSearchHotkey", () => {
  test("仅 ⌘/Ctrl+F（无 Shift/Alt）命中", () => {
    expect(isAppSearchHotkey({ key: "f", code: "KeyF", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBe(true);
    expect(isAppSearchHotkey({ key: "F", code: "KeyF", metaKey: false, ctrlKey: true, shiftKey: false, altKey: false })).toBe(true);
    expect(isAppSearchHotkey({ key: "Process", code: "KeyF", metaKey: true, ctrlKey: false, shiftKey: false, altKey: false })).toBe(true);
    expect(isAppSearchHotkey({ key: "f", code: "KeyF", metaKey: true, ctrlKey: false, shiftKey: true, altKey: false })).toBe(false);
    expect(isAppSearchHotkey({ key: "f", code: "KeyF", metaKey: true, ctrlKey: false, shiftKey: false, altKey: true })).toBe(false);
    expect(isAppSearchHotkey({ key: "f", code: "KeyF", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false })).toBe(false);
  });
});
