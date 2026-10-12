import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, test, vi } from "vitest";
import { defineComponent, h } from "vue";
import { type Router, createMemoryHistory, createRouter } from "vue-router";

import App, { resolveSideMenuActivePath } from "./App";
import { usePortalNavigationStore } from "./stores/portal-navigation";

function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { render: () => null } },
      { path: "/index", name: "index", component: { render: () => null } },
      { path: "/workbench", name: "workbench", component: { render: () => null } },
      { path: "/portal/:pathMatch(.*)*", name: "portal", component: { render: () => null } },
      {
        path: "/d/access-control",
        name: "access-control-home",
        component: { render: () => h("div", { "data-testid": "mf-domain" }, "MF") },
      },
      {
        path: "/d/access-control/:pathMatch(.*)*",
        name: "access-control-rest",
        component: { render: () => h("div", { "data-testid": "mf-domain" }, "MF") },
      },
      {
        path: "/d/secure-edu-head/training-task-form",
        name: "secure-edu-training-task-form",
        meta: { activeMenuPath: "/d/secure-edu-head/training-task" },
        component: { render: () => h("div", { "data-testid": "secure-edu-form" }, "培训任务") },
      },
      { path: "/d/secure-edu/exam-task", component: { render: () => null } },
      { path: "/d/secure-edu/paper-question-rule", component: { render: () => null } },
      {
        path: "/d/secure-edu/exam-task-form",
        meta: { hideInMenu: true, activeMenuPath: "/d/secure-edu/exam-task" },
        component: { render: () => null },
      },
      {
        path: "/d/secure-edu/paper-question-rule-form",
        meta: { hideInMenu: true, activeMenuPath: "/d/secure-edu/paper-question-rule" },
        component: { render: () => null },
      },
      {
        path: "/d/workbench",
        name: "workbench-home",
        component: { render: () => h("div", { "data-testid": "mf-workbench" }, "WB") },
      },
      {
        path: "/d/workbench/:pathMatch(.*)*",
        name: "workbench-rest",
        component: { render: () => h("div", { "data-testid": "mf-workbench" }, "WB") },
      },
      {
        path: "/d/safety-management-head/excel-viewer",
        name: "safety-management-head-excel-viewer",
        meta: { fullPage: true },
        component: { render: () => h("div", { "data-testid": "standalone-report" }, "Report") },
      },
      { path: "/workspace", component: { render: () => null } },
      { path: "/tickets", component: { render: () => null } },
      { path: "/login", name: "login", component: { render: () => null } },
      { path: "/verify-auth", name: "verifyAuth", component: { render: () => null } },
    ],
  });
}

async function mountApp(props: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createTestRouter();
  await router.push("/");
  const wrapper = mount(App, {
    props,
    global: { plugins: [pinia, router] },
  });
  await router.isReady();
  return wrapper;
}

describe("App", () => {
  test("隐藏业务路由使用 activeMenuPath 保持所属菜单展开", () => {
    expect(
      resolveSideMenuActivePath("/d/secure-edu-head/training-task-form", {
        activeMenuPath: "/d/secure-edu-head/training-task",
      }),
    ).toBe("/d/secure-edu-head/training-task");
    expect(resolveSideMenuActivePath("/d/secure-edu-head/training-task", {})).toBe("/d/secure-edu-head/training-task");
  });

  test("进入隐藏表单路由时把所属菜单路径传给侧栏", async () => {
    const sideMenuSlot = defineComponent({
      name: "FakeSideMenu",
      props: { activePath: { type: String, required: true } },
      setup: (props) => () => h("div", { "data-testid": "active-menu-path" }, props.activePath),
    });
    const wrapper = await mountApp({ sideMenuSlot });

    await wrapper.vm.$router.push("/d/secure-edu-head/training-task-form");
    await flushPromises();

    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe("/d/secure-edu-head/training-task");
  });

  test("从考试详情继续查看规则时保留考试菜单，直接从规则列表编辑时使用配置菜单", async () => {
    const sideMenuSlot = defineComponent({
      props: { activePath: { type: String, required: true } },
      setup: (props) => () => h("div", { "data-testid": "active-menu-path" }, props.activePath),
    });
    const wrapper = await mountApp({ sideMenuSlot });
    const nav = usePortalNavigationStore();
    nav.registerMenuContribution("education", [
      { label: "考试任务", path: "/d/secure-edu/exam-task" },
      { label: "试卷规则", path: "/d/secure-edu/paper-question-rule" },
    ]);
    await wrapper.vm.$router.push({
      path: "/d/secure-edu/exam-task-form",
      query: { id: "task", action: "detail", returnPath: "/d/secure-edu/exam-task" },
    });
    const returnPath = wrapper.vm.$router.currentRoute.value.fullPath;
    await wrapper.vm.$router.push({
      path: "/d/secure-edu/paper-question-rule-form",
      query: { id: "rule", action: "detail", returnPath },
    });
    await flushPromises();
    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe("/d/secure-edu/exam-task");

    await wrapper.vm.$router.push({
      path: "/d/secure-edu/paper-question-rule-form",
      query: { id: "rule", action: "edit", returnPath: "/d/secure-edu/paper-question-rule" },
    });
    await flushPromises();
    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe("/d/secure-edu/paper-question-rule");
    wrapper.unmount();
  });

  test("直接输入隐藏路由时按 activeMenuPath 切换到所属应用分组", async () => {
    const ensureGroupMenus = vi.fn(async () => {});
    const wrapper = await mountApp({ ensureGroupMenus });
    const nav = usePortalNavigationStore();
    nav.setDisplayGroups([
      { key: "other", label: "其它应用", order: 0 },
      { key: "secure-edu-head", label: "安全教育", order: 1 },
    ]);
    nav.registerMenuContribution("other", [{ label: "其它页面", path: "/other" }]);
    nav.registerMenuContribution("secure-edu-head", [{ label: "培训任务", path: "/d/secure-edu-head/training-task" }]);
    nav.setActiveGroup("other");

    await wrapper.vm.$router.push("/d/secure-edu-head/training-task-form");
    await flushPromises();

    expect(nav.activeGroupKey).toBe("secure-edu-head");
    expect(ensureGroupMenus).toHaveBeenCalledWith("secure-edu-head");
  });

  test("旧入口的新增、详情、编辑和嵌套表单保留考试菜单，可见列表切换正常", async () => {
    const sideMenuSlot = defineComponent({
      props: { activePath: { type: String, required: true } },
      setup: (props) => () => h("div", { "data-testid": "active-menu-path" }, props.activePath),
    });
    const wrapper = await mountApp({ sideMenuSlot });
    const nav = usePortalNavigationStore();
    const base = "/portal/secure-edu";
    nav.registerMenuContribution("education", [
      { label: "考试任务", path: `${base}/exam-task` },
      { label: "试卷管理", path: `${base}/test-paper-manage` },
    ]);
    await wrapper.vm.$router.push(`${base}/exam-task`);
    await flushPromises();
    for (const action of ["add", "detail", "edit"]) {
      await wrapper.vm.$router.push(`${base}/exam-task-form?action=${action}`);
      await flushPromises();
      expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe(`${base}/exam-task`);
    }
    await wrapper.vm.$router.push(`${base}/test-paper-manage-form?action=detail`);
    await flushPromises();
    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe(`${base}/exam-task`);
    await wrapper.vm.$router.push(`${base}/test-paper-manage`);
    await flushPromises();
    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe(`${base}/test-paper-manage`);
    await wrapper.vm.$router.push(`${base}/test-paper-manage-form?action=edit`);
    await flushPromises();
    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe(`${base}/test-paper-manage`);
    wrapper.unmount();
  });

  test("直接打开旧考试表单并在菜单异步加载后恢复归属", async () => {
    const sideMenuSlot = defineComponent({
      props: { activePath: { type: String, required: true } },
      setup: (props) => () => h("div", { "data-testid": "active-menu-path" }, props.activePath),
    });
    const wrapper = await mountApp({ sideMenuSlot });
    const nav = usePortalNavigationStore();
    await wrapper.vm.$router.push("/portal/secure-edu/exam-task-form?action=detail");
    await flushPromises();
    nav.registerMenuContribution("education", [{ label: "考试任务", path: "/portal/secure-edu/exam-task" }]);
    await flushPromises();
    expect(wrapper.get("[data-testid='active-menu-path']").text()).toBe("/portal/secure-edu/exam-task");
    wrapper.unmount();
  });

  test("非全页路由提供跳到主内容的 skip link", async () => {
    const wrapper = await mountApp();
    const skip = wrapper.find("[data-testid='skip-to-main']");
    expect(skip.exists()).toBe(true);
    expect(skip.attributes("href")).toBe("#main-content");
    expect(wrapper.find("#main-content").exists()).toBe(true);

    await wrapper.vm.$router.push("/login");
    await flushPromises();
    expect(wrapper.find("[data-testid='skip-to-main']").exists()).toBe(false);
  });

  test("Runtime Common 诊断面板显示公共模块版本和加载状态", async () => {
    const wrapper = await mountApp({
      runtimeCommonDiagnostics: [
        { name: "pcUi", state: "ready", runtimeVersion: "2026.09.28.1", apiVersion: "1.4.0" },
        { name: "pcMap", state: "failed", error: "manifest unavailable" },
      ],
    });

    await wrapper.get("button[aria-label='公共模块诊断']").trigger("click");

    expect(wrapper.get("[role='dialog']").text()).toContain("2026.09.28.1");
    expect(wrapper.get("[role='dialog']").text()).toContain("pcUi");
    expect(wrapper.get("[role='dialog']").text()).toContain("manifest unavailable");
  });

  test("meta.fullPage 路由隐藏壳层导航并保留独立页面内容", async () => {
    const TopBar = defineComponent({ setup: () => () => h("header", { "data-testid": "top-bar" }) });
    const SideMenu = defineComponent({ setup: () => () => h("aside", { "data-testid": "side-menu" }) });
    const wrapper = await mountApp({ topBarSlot: TopBar, sideMenuSlot: SideMenu });

    await wrapper.vm.$router.push("/d/safety-management-head/excel-viewer");
    await flushPromises();

    expect(wrapper.find("[data-testid='top-bar']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='side-menu']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='skip-to-main']").exists()).toBe(false);
    expect(wrapper.find("[data-testid='standalone-report']").exists()).toBe(true);
  });

  test("总是渲染 #appContainer（qiankun 挂载点），不受 appLoadStatus 影响", async () => {
    for (const status of ["idle", "loading", "error", "mounted"] as const) {
      const wrapper = await mountApp({ appLoadStatus: status });
      expect(wrapper.find("#appContainer").exists()).toBe(true);
    }
  });

  test("登录全页路由仍保留 qiankun 容器（避免登录后进 /index 找不到 #workbench-container）", async () => {
    const wrapper = await mountApp();
    await wrapper.vm.$router.push("/login");
    await flushPromises();
    expect(wrapper.find("#appContainer").exists()).toBe(true);
    expect(wrapper.find("#workbench-container").exists()).toBe(true);
  });

  test("chrome 布局总是渲染两个 qiankun 容器，但工作台与门户互斥显示", async () => {
    const wrapper = await mountApp();
    expect(wrapper.find("#appContainer").exists()).toBe(true);
    expect(wrapper.find("#workbench-container").exists()).toBe(true);

    await wrapper.vm.$router.push("/index");
    await flushPromises();
    expect(
      wrapper
        .find("#workbench-container")
        .classes()
        .some((c) => c.includes("hostActive")),
    ).toBe(true);
    expect(
      wrapper
        .find("#appContainer")
        .classes()
        .some((c) => c.includes("hostIdle")),
    ).toBe(true);

    await wrapper.vm.$router.push("/portal/problems/problemsList");
    await flushPromises();
    expect(
      wrapper
        .find("#appContainer")
        .classes()
        .some((c) => c.includes("hostActive")),
    ).toBe(true);
    expect(
      wrapper
        .find("#workbench-container")
        .classes()
        .some((c) => c.includes("hostIdle")),
    ).toBe(true);

    await wrapper.vm.$router.push("/d/access-control");
    await flushPromises();
    expect(
      wrapper
        .find("#appContainer")
        .classes()
        .some((c) => c.includes("hostIdle")),
    ).toBe(true);
    expect(
      wrapper
        .find("#workbench-container")
        .classes()
        .some((c) => c.includes("hostIdle")),
    ).toBe(true);
  });

  test("MF 工作台 /d/workbench 给 shell-pc-content 开 overflow 滚动层（RouterView 长页）", async () => {
    const wrapper = await mountApp();
    const content = wrapper.find("#main-content");

    await wrapper.vm.$router.push("/d/workbench");
    await flushPromises();
    expect(content.classes().some((c) => c.includes("contentScroll"))).toBe(true);
    expect(wrapper.find("[data-testid='mf-workbench']").exists()).toBe(true);
    expect(
      wrapper
        .find("#workbench-container")
        .classes()
        .some((c) => c.includes("hostIdle")),
    ).toBe(true);

    await wrapper.vm.$router.push("/d/access-control");
    await flushPromises();
    expect(content.classes().some((c) => c.includes("contentScroll"))).toBe(false);
  });

  test("groups/menus 加载中展示 nav-loading 遮罩", async () => {
    const wrapper = await mountApp();
    const nav = usePortalNavigationStore();
    expect(wrapper.find("[data-testid='nav-loading']").exists()).toBe(false);

    nav.setGroupsStatus("loading");
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='nav-loading']").text()).toContain("分组加载中");

    nav.setGroupsStatus("ready");
    nav.setDisplayGroups([{ key: "ops", label: "运维", order: 0 }]);
    nav.setMenuStatus("ops", "loading");
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='nav-loading']").text()).toContain("菜单加载中");

    nav.setMenuStatus("ops", "ready");
    await wrapper.vm.$nextTick();
    expect(wrapper.find("[data-testid='nav-loading']").exists()).toBe(false);
  });

  test("appLoadStatus 为 idle 时，loading/error 态都不展示", async () => {
    const wrapper = await mountApp({ appLoadStatus: "idle" });
    expect(wrapper.find("#appContainerLoading").exists()).toBe(false);
    expect(wrapper.find("#appContainerError").exists()).toBe(false);
  });

  test("appLoadStatus 为 mounted 时，loading/error 态都不展示", async () => {
    const wrapper = await mountApp({ appLoadStatus: "mounted" });
    expect(wrapper.find("#appContainerLoading").exists()).toBe(false);
    expect(wrapper.find("#appContainerError").exists()).toBe(false);
  });

  test("appLoadStatus 为 loading 时展示加载中文案，不展示 error 态", async () => {
    const wrapper = await mountApp({ appLoadStatus: "loading" });
    expect(wrapper.find("#appContainerLoading").exists()).toBe(true);
    expect(wrapper.find("#appContainerLoading").text()).toContain("应用加载中");
    expect(wrapper.find("#appContainerError").exists()).toBe(false);
  });

  test("MF 域路由即使 qiankun 为 error 也不盖白屏遮罩", async () => {
    const wrapper = await mountApp({ appLoadStatus: "error" });
    await wrapper.vm.$router.push("/d/access-control");
    await flushPromises();
    expect(wrapper.find("#appContainerError").exists()).toBe(false);
    expect(wrapper.find("#appContainerLoading").exists()).toBe(false);
    expect(wrapper.find("[data-testid='mf-domain']").exists()).toBe(true);
  });

  test("appLoadStatus 为 error 时展示加载失败文案与刷新按钮，不展示 loading 态", async () => {
    const wrapper = await mountApp({ appLoadStatus: "error" });
    expect(wrapper.find("#appContainerLoading").exists()).toBe(false);
    expect(wrapper.find("#appContainerError").exists()).toBe(true);
    expect(wrapper.find("#appContainerError").text()).toContain("应用加载失败");
    expect(wrapper.find("#appContainerError button").exists()).toBe(true);
    expect(wrapper.find("#appContainerError button").text()).toBe("刷新");
  });

  test("点击 error 态的刷新按钮会调用 window.location.reload", async () => {
    // jsdom 的 `window.location.reload` 本身是不可重新定义的（非 configurable），不能直接
    // `Object.defineProperty(window.location, "reload", ...)`——要整个替换 `window.location`
    // 这个属性本身（指向一个新的、可写的对象），而不是修改原生 Location 实例上的方法。
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload },
    });
    try {
      const wrapper = await mountApp({ appLoadStatus: "error" });
      await wrapper.find("#appContainerError button").trigger("click");
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
    }
  });

  test("已有的 topBarSlot/sideMenuSlot props 传递逻辑未被破坏", async () => {
    const topBarSlot = defineComponent({
      name: "FakeTopBar",
      props: { tenantName: { type: String, default: "" }, userName: { type: String, default: "" } },
      setup(props) {
        return () => h("div", { class: "fake-top-bar" }, `${props.tenantName}/${props.userName}`);
      },
    });
    const wrapper = await mountApp({ topBarSlot, tenantName: "tenant-a", userName: "alice" });
    expect(wrapper.find(".fake-top-bar").text()).toBe("tenant-a/alice");
    // 新增的 appContainer/loading/error 结构不影响既有 slot props 传递逻辑同时生效。
    expect(wrapper.find("#appContainer").exists()).toBe(true);
  });

  test("壳层不渲染多标签栏：即使传入 tabsSlot 也不挂载（原系统由子应用页面标题条承担，非壳层 Tabs）", async () => {
    const tabsSlot = defineComponent({
      name: "FakeTabs",
      setup: () => () => h("div", { class: "fake-tabs", "data-testid": "shell-tabs" }, "tabs"),
    });
    const wrapper = await mountApp({ tabsSlot });
    usePortalNavigationStore().registerMenuContribution("workspace", [{ label: "工作台", path: "/workspace" }]);
    await wrapper.vm.$router.push("/workspace");
    await flushPromises();

    expect(wrapper.find(".fake-tabs").exists()).toBe(false);
    expect(wrapper.find("[data-testid='shell-tabs']").exists()).toBe(false);
  });

  test("topBarSlot：转发 displayGroups/menuTree，navigate 事件触发路由跳转", async () => {
    let latestProps: Record<string, unknown> = {};
    const topBarSlot = defineComponent({
      name: "FakeTopBar",
      props: {
        displayGroups: { type: Array, default: () => [] },
        menuTree: { type: Array, default: () => [] },
      },
      emits: ["navigate", "logout", "navigatePersonManage", "selectGroup"],
      setup(props, { emit }) {
        latestProps = props;
        return () => h("button", { class: "fake-top-bar-navigate", onClick: () => emit("navigate", "/workspace") }, "go");
      },
    });
    const wrapper = await mountApp({ topBarSlot });
    usePortalNavigationStore().setDisplayGroups([{ key: "admin", label: "管理", order: 1 }]);
    usePortalNavigationStore().registerMenuContribution("workspace", [{ label: "工作台", path: "/workspace" }]);
    await wrapper.vm.$nextTick();

    expect((latestProps.displayGroups as { key: string }[])[0]?.key).toBe("admin");
    expect((latestProps.menuTree as { path?: string }[])[0]?.path).toBe("/workspace");

    await wrapper.find(".fake-top-bar-navigate").trigger("click");
    await flushPromises();
    expect(wrapper.vm.$route.path).toBe("/workspace");
  });

  test("topBarSlot：select-group 切换分组后进入该组默认首条菜单路由", async () => {
    const topBarSlot = defineComponent({
      name: "FakeTopBar",
      emits: ["selectGroup"],
      setup(_props, { emit }) {
        return () => h("button", { class: "fake-select-group", onClick: () => emit("selectGroup", "ops") }, "switch");
      },
    });
    const ensureGroupMenus = vi.fn(async (groupKey: string) => {
      usePortalNavigationStore().registerMenuContribution(groupKey, [
        {
          label: "运维应用",
          children: [
            { label: "隐患单", path: "/tickets" },
            { label: "排查记录", path: "/workspace" },
          ],
        },
      ]);
    });
    const wrapper = await mountApp({ topBarSlot, ensureGroupMenus });
    usePortalNavigationStore().setDisplayGroups([
      { key: "workspace", label: "工作台", order: 0 },
      { key: "ops", label: "运维", order: 1 },
    ]);

    await wrapper.find(".fake-select-group").trigger("click");
    await flushPromises();

    expect(ensureGroupMenus).toHaveBeenCalledWith("ops");
    expect(usePortalNavigationStore().activeGroupKey).toBe("ops");
    expect(wrapper.vm.$route.path).toBe("/tickets");
  });

  test("topBarSlot：logout/navigate-person-manage 原样转发给 onUserLogout/onNavigatePersonManage props", async () => {
    const topBarSlot = defineComponent({
      name: "FakeTopBar",
      emits: ["navigate", "logout", "navigatePersonManage"],
      setup(_props, { emit }) {
        return () =>
          h("div", [
            h("button", { class: "fake-logout", onClick: () => emit("logout") }, "logout"),
            h("button", { class: "fake-person-manage", onClick: () => emit("navigatePersonManage") }, "person"),
          ]);
      },
    });
    const onUserLogout = vi.fn();
    const onNavigatePersonManage = vi.fn();
    const wrapper = await mountApp({ topBarSlot, onUserLogout, onNavigatePersonManage });

    await wrapper.find(".fake-logout").trigger("click");
    expect(onUserLogout).toHaveBeenCalledTimes(1);

    await wrapper.find(".fake-person-manage").trigger("click");
    expect(onNavigatePersonManage).toHaveBeenCalledTimes(1);
  });

  test("工作台路径 /index|/workbench 隐藏侧栏，其它业务路径恢复侧栏", async () => {
    const sideMenuSlot = defineComponent({
      name: "FakeSideMenu",
      setup: () => () => h("div", { class: "fake-side-menu" }),
    });
    const pinia = createPinia();
    setActivePinia(pinia);
    const router = createTestRouter();
    await router.push("/workspace");
    const wrapper = mount(App, {
      props: { sideMenuSlot },
      global: { plugins: [pinia, router] },
    });
    await router.isReady();
    expect(wrapper.find(".fake-side-menu").exists()).toBe(true);

    await router.push("/index");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".fake-side-menu").exists()).toBe(false);

    await router.push("/workbench");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".fake-side-menu").exists()).toBe(false);

    await router.push("/workspace");
    await wrapper.vm.$nextTick();
    expect(wrapper.find(".fake-side-menu").exists()).toBe(true);
  });

  test(
    "login/verifyAuth 路由是全页接管：不渲染顶栏/侧边栏 chrome，只渲染 RouterView（真实浏览器发现的回归——" +
      "此前登录页背后会露出顶栏和侧边栏，因为 App.ts 无条件包裹 chrome）",
    async () => {
      const topBarSlot = defineComponent({ name: "FakeTopBar", setup: () => () => h("div", { class: "fake-top-bar" }) });
      const sideMenuSlot = defineComponent({ name: "FakeSideMenu", setup: () => () => h("div", { class: "fake-side-menu" }) });

      const pinia = createPinia();
      setActivePinia(pinia);
      const router = createTestRouter();
      await router.push("/login");
      const wrapper = mount(App, {
        props: { topBarSlot, sideMenuSlot },
        global: { plugins: [pinia, router] },
      });
      await router.isReady();

      expect(wrapper.find(".fake-top-bar").exists()).toBe(false);
      expect(wrapper.find(".fake-side-menu").exists()).toBe(false);
      expect(wrapper.find(".shell-pc--full-page").exists()).toBe(true);

      await router.push("/verify-auth");
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".fake-top-bar").exists()).toBe(false);

      await router.push("/workspace");
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".fake-top-bar").exists()).toBe(true);
      expect(wrapper.find(".fake-side-menu").exists()).toBe(true);
    },
  );
});
