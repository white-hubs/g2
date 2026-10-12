import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { topBarActionsRegistry } from "../top-bar-actions-registry";
import type { ApplicationEntryGroup, NavigationMenuNode } from "./top-bar-types";
import TopBar from "./TopBar";

beforeAll(() => {
  // 模拟 pc-ai-assistant 之类 Platform 通过既有 chrome:register-top-bar-action 机制注册的贡献点占位。
  topBarActionsRegistry.register({ id: "ai-assistant-stub", component: { template: "<span>AI助手占位</span>" } });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.className = "";
  document.body.innerHTML = "";
});

function buildDisplayGroups(): ApplicationEntryGroup[] {
  return [{ key: "admin-tools", label: "管理工具", order: 1, items: [{ domainName: "system", label: "组织架构", path: "/system/org" }] }];
}

function buildMenuTree(): NavigationMenuNode[] {
  return [{ domainName: "workspace", label: "工作台", path: "/workspace" }];
}

describe("TopBar", () => {
  test("渲染租户名/用户名，并渲染 topBarActionsRegistry 里注册的动态贡献点", () => {
    const wrapper = mount(TopBar, { props: { tenantName: "汉云科技", userName: "张三" }, attachTo: document.body });

    expect(wrapper.text()).toContain("汉云科技");
    expect(wrapper.text()).toContain("张三");
    expect(wrapper.text()).toContain("AI助手占位");

    wrapper.unmount();
  });

  test("ApplicationEntry 横向 Tab 点击只转发 select-group（首条路由由 Shell 处理）", async () => {
    const wrapper = mount(TopBar, {
      props: {
        tenantName: "汉云科技",
        userName: "张三",
        displayGroups: buildDisplayGroups(),
        activeGroupKey: "admin-tools",
      },
      attachTo: document.body,
    });

    await wrapper.find("[data-testid='app-group-admin-tools']").trigger("click");

    expect(wrapper.emitted("selectGroup")).toEqual([["admin-tools"]]);
    expect(wrapper.emitted("navigate")).toBeUndefined();

    wrapper.unmount();
  });

  test("SearchApplication 的 navigate 同样转发成 TopBar 自己的 navigate 事件", async () => {
    const wrapper = mount(TopBar, {
      props: { tenantName: "汉云科技", userName: "张三", menuTree: buildMenuTree() },
      attachTo: document.body,
    });

    await wrapper.find(".pc-chrome-search-application-trigger").trigger("click");
    await flushPromises();
    const target = Array.from(document.body.querySelectorAll(".pc-chrome-search-application-results li")).find((el) =>
      el.textContent?.includes("工作台"),
    ) as HTMLElement | undefined;
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(wrapper.emitted("navigate")).toEqual([["/workspace"]]);

    wrapper.unmount();
  });

  test("UserDropdown 的 logout/navigate-person-manage 原样转发给 TopBar 消费方", async () => {
    const wrapper = mount(TopBar, { props: { tenantName: "汉云科技", userName: "张三" }, attachTo: document.body });

    await wrapper.find(".pc-chrome-user-dropdown-trigger").trigger("click");
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const personManageBtn = Array.from(document.body.querySelectorAll(".ant-dropdown-menu-item")).find(
      (el) => el.textContent?.replace(/\s+/gu, "") === "个人管理",
    ) as HTMLElement | undefined;
    personManageBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();
    expect(wrapper.emitted("navigatePersonManage")).toHaveLength(1);

    await wrapper.find(".pc-chrome-user-dropdown-trigger").trigger("click");
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const logoutBtn = Array.from(document.body.querySelectorAll(".ant-dropdown-menu-item")).find(
      (el) => el.textContent?.replace(/\s+/gu, "") === "安全退出",
    ) as HTMLElement | undefined;
    logoutBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();
    const confirmBtn = Array.from(document.body.querySelectorAll("button")).find((btn) => btn.textContent?.replace(/\s+/gu, "") === "确定");
    await new DOMWrapper(confirmBtn!).trigger("click");
    await flushPromises();
    expect(wrapper.emitted("logout")).toHaveLength(1);

    wrapper.unmount();
  });

  test("ChangeSkinModal 的 skin-change 原样转发给 TopBar 消费方", async () => {
    const wrapper = mount(TopBar, { props: { tenantName: "汉云科技", userName: "张三" }, attachTo: document.body });

    await wrapper.find(".pc-chrome-change-skin-trigger").trigger("click");
    await flushPromises();
    const skinItem = Array.from(document.querySelectorAll(".pc-chrome-theme-console__item"))
      .map((el) => new DOMWrapper(el))
      .find((el) => el.text().includes("夜幕黑"));
    await skinItem?.find(".pc-chrome-theme-console__apply").trigger("click");
    await flushPromises();

    expect(wrapper.emitted("skinChange")).toEqual([["midnight"]]);
    expect(wrapper.emitted("layout-change")).toBeUndefined();

    wrapper.unmount();
  });

  test("ChooseTerminalDropdown 的 select-terminal 原样转发给 TopBar 消费方", async () => {
    vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = mount(TopBar, { props: { tenantName: "汉云科技", userName: "张三" }, attachTo: document.body });

    await wrapper.find(".pc-chrome-choose-terminal-trigger").trigger("click");
    await flushPromises();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const target = Array.from(document.body.querySelectorAll(".ant-dropdown-menu-item")).find((el) =>
      el.textContent?.includes("调度中心"),
    ) as HTMLElement | undefined;
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();

    expect(wrapper.emitted("selectTerminal")).toHaveLength(1);

    wrapper.unmount();
  });

  test("不渲染消息铃铛（旧仓 NavTopLink 无此入口；消息走 pc-messaging 总线，不占顶栏图标）", () => {
    const wrapper = mount(TopBar, { props: { tenantName: "汉云科技", userName: "张三" }, attachTo: document.body });

    expect(wrapper.find("[data-testid='notification-bell']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='notification-badge']").exists()).toBe(false);
    expect(wrapper.emitted("open-notifications")).toBeUndefined();

    wrapper.unmount();
  });
});
