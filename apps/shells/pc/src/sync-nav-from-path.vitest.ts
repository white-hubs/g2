import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePortalNavigationStore } from "./stores/portal-navigation";
import { syncNavFromPath } from "./sync-nav-from-path";
import { WORKBENCH_GROUP_KEY, WORKBENCH_MENU_CONTRIBUTION } from "./workbench-group";

describe("syncNavFromPath", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  test("门户深链 miss 时按序拉分组 menus，命中即停（不 Promise.all 全量）", async () => {
    const nav = usePortalNavigationStore();
    nav.setDisplayGroups([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "internal", label: "内部管理", order: 1 },
      { key: "ops", label: "运维管理", order: 2 },
      { key: "energy", label: "能耗管理", order: 3 },
    ]);
    nav.registerMenuContribution(WORKBENCH_GROUP_KEY, WORKBENCH_MENU_CONTRIBUTION);
    nav.setMenuStatus(WORKBENCH_GROUP_KEY, "ready");
    nav.setActiveGroup(WORKBENCH_GROUP_KEY);

    const ensureGroupMenus = vi.fn(async (groupKey: string) => {
      if (groupKey === "internal") {
        nav.registerMenuContribution("internal", [{ label: "人事", path: "/portal/hr/list" }]);
        nav.setMenuStatus("internal", "ready");
      }
      if (groupKey === "ops") {
        nav.registerMenuContribution("ops", [
          {
            label: "隐患排查",
            path: "/portal/problems/problemsList",
            children: [{ label: "隐患单", path: "/portal/problems/problemsList" }],
          },
        ]);
        nav.setMenuStatus("ops", "ready");
      }
      if (groupKey === "energy") {
        nav.registerMenuContribution("energy", [{ label: "能耗", path: "/portal/energy/list" }]);
        nav.setMenuStatus("energy", "ready");
      }
    });

    await syncNavFromPath("/portal/problems/problemsList?type=ALL", { nav, ensureGroupMenus });

    const loadedKeys = ensureGroupMenus.mock.calls.map((c) => c[0] as string);
    expect(loadedKeys.filter((k) => k === "internal" || k === "ops" || k === "energy")).toEqual([
      "internal",
      "ops",
      // 命中后可能再 ensure 一次匹配分组（store 内 ready 时为 no-op）
      "ops",
    ]);
    expect(loadedKeys).not.toContain("energy");
    expect(nav.activeGroupKey).toBe("ops");
    expect(nav.activeMenuTree.some((node) => node.label === "隐患排查")).toBe(true);
  });

  test("深链可用 portal app 索引时只 ensure 一个分组", async () => {
    const nav = usePortalNavigationStore();
    nav.setDisplayGroups([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "g1", label: "组1", order: 1 },
      { key: "g2", label: "组2", order: 2 },
      { key: "g-video", label: "视频", order: 3 },
    ]);
    nav.registerMenuContribution(WORKBENCH_GROUP_KEY, WORKBENCH_MENU_CONTRIBUTION);
    nav.setMenuStatus(WORKBENCH_GROUP_KEY, "ready");

    const ensureGroupMenus = vi.fn(async (groupKey: string) => {
      if (groupKey === "g-video") {
        nav.registerMenuContribution("g-video", [{ label: "AI巡检", path: "/portal/video-monitor-auth/ai-inspection/plans" }]);
        nav.setMenuStatus("g-video", "ready");
      }
    });

    await syncNavFromPath("/portal/video-monitor-auth/ai-inspection/plans", {
      nav,
      ensureGroupMenus,
      resolveGroupKeyForAppRef: (appRef) => (appRef === "video-monitor-auth" ? "g-video" : undefined),
    });

    expect(ensureGroupMenus.mock.calls.map((c) => c[0])).toEqual(["g-video", "g-video"]);
    expect(ensureGroupMenus).not.toHaveBeenCalledWith("g1");
    expect(ensureGroupMenus).not.toHaveBeenCalledWith("g2");
    expect(nav.activeGroupKey).toBe("g-video");
  });

  test("登录/鉴权全页路径不扫 OUAA menus（避免 onLoginSuccess 时尚在 /login 时打爆分组）", async () => {
    const nav = usePortalNavigationStore();
    nav.setDisplayGroups([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "ops", label: "运维管理", order: 1 },
      { key: "energy", label: "能耗管理", order: 2 },
    ]);
    nav.setActiveGroup(WORKBENCH_GROUP_KEY);
    const ensureGroupMenus = vi.fn(async () => undefined);

    await syncNavFromPath("/login", { nav, ensureGroupMenus });
    await syncNavFromPath("/verify-auth?code=x", { nav, ensureGroupMenus });

    expect(ensureGroupMenus).not.toHaveBeenCalled();
    expect(nav.activeGroupKey).toBe(WORKBENCH_GROUP_KEY);
  });

  test("工作台路径强制 activeGroup=workbench", async () => {
    const nav = usePortalNavigationStore();
    nav.setDisplayGroups([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "ops", label: "运维管理", order: 1 },
    ]);
    nav.setActiveGroup("ops");
    const ensureGroupMenus = vi.fn(async () => undefined);

    await syncNavFromPath("/index", { nav, ensureGroupMenus });

    expect(nav.activeGroupKey).toBe(WORKBENCH_GROUP_KEY);
    expect(ensureGroupMenus).toHaveBeenCalledWith(WORKBENCH_GROUP_KEY);
  });

  test("个人中心路径切到 person-manage，侧栏露出「个人管理」且不请求 OUAA menus", async () => {
    const nav = usePortalNavigationStore();
    nav.setDisplayGroups([
      { key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 },
      { key: "ops", label: "运维管理", order: 1 },
    ]);
    nav.registerMenuContribution(WORKBENCH_GROUP_KEY, WORKBENCH_MENU_CONTRIBUTION);
    nav.registerMenuContribution("ops", [{ label: "隐患", path: "/portal/problems/list" }]);
    nav.registerMenuContribution("person-manage", [
      {
        label: "个人管理",
        icon: "/resource/app-icons/人事管理/main.png",
        children: [
          { label: "个人资料", path: "/portal/legacy-personal/info" },
          { label: "修改密码", path: "/portal/legacy-personal/modify-password" },
        ],
      },
    ]);
    nav.setActiveGroup("ops");
    const ensureGroupMenus = vi.fn(async () => undefined);

    await syncNavFromPath("/portal/legacy-personal/info", { nav, ensureGroupMenus });

    expect(nav.activeGroupKey).toBe("person-manage");
    expect(ensureGroupMenus).not.toHaveBeenCalled();
    expect(nav.activeMenuTree.map((n) => n.label)).toEqual(["个人管理"]);
    expect(nav.activeMenuTree[0]?.children?.map((n) => n.label)).toEqual(["个人资料", "修改密码"]);
  });
});
