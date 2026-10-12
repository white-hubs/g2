import { describe, expect, test } from "bun:test";
import { createPinia, setActivePinia } from "pinia";

import { resolvePageTitleFromLegacyMenus } from "../legacy-menu-permission";
import { usePortalNavigationStore } from "./portal-navigation";

describe("usePortalNavigationStore", () => {
  test("setDisplayGroups 记录分组文案/顺序；resolveGroupLabel 按 key 查文案，查不到时原样返回 key", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.setDisplayGroups([{ key: "admin-tools", label: "管理工具", order: 1 }]);
    expect(store.resolveGroupLabel("admin-tools")).toBe("管理工具");
    expect(store.resolveGroupLabel("unknown-key")).toBe("unknown-key");
  });

  test("registerMenuContribution 把域的菜单树并入导航结构，带上 domainName 前缀避免多个域路径撞车", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("poc-inline-pc", [{ label: "示例", path: "/poc-inline", children: [] }]);
    expect(store.menuTree).toHaveLength(1);
    expect(store.menuTree[0]).toMatchObject({ label: "示例", path: "/poc-inline", domainName: "poc-inline-pc" });
  });

  test("同一个域重复注册时替换而不是重复追加（支持 inline override/热更新场景）", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("d1", [{ label: "v1", path: "/d1", children: [] }]);
    store.registerMenuContribution("d1", [{ label: "v2", path: "/d1", children: [] }]);
    expect(store.menuTree).toHaveLength(1);
    expect(store.menuTree[0].label).toBe("v2");
  });

  test("findByPath 递归匹配当前路径对应的菜单节点，最长前缀优先", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("d1", [{ label: "父", path: "/d1", children: [{ label: "子", path: "/d1/detail", children: [] }] }]);
    const match = store.findByPath("/d1/detail");
    expect(match?.label).toBe("子");
  });

  test("findByPath 无匹配时返回 undefined", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    expect(store.findByPath("/nowhere")).toBeUndefined();
  });

  test("无显式 displayGroups 时按域自动生成顶栏分组；person-manage 不进顶栏；侧栏只展示当前分组", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.registerMenuContribution("ops", [{ label: "隐患单", path: "/ops/ticket", children: [] }]);
    store.registerMenuContribution("person-manage", [{ label: "个人资料", path: "/person/profile", children: [] }]);

    expect(store.displayGroups.map((g) => g.key)).toEqual(["ops"]);
    expect(store.activeGroupKey).toBe("ops");
    expect(store.activeMenuTree.map((n) => n.path)).toEqual(["/ops/ticket"]);
    expect(store.menuTree.some((n) => n.domainName === "person-manage")).toBe(true);

    store.registerMenuContribution("energy", [{ label: "能耗", path: "/energy", children: [] }]);
    store.selectGroup("energy");
    expect(store.activeGroupKey).toBe("energy");
    expect(store.activeMenuTree.map((n) => n.path)).toEqual(["/energy"]);
  });

  test("显式 displayGroups 重建时保留 person-manage 侧栏激活态", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    store.setDisplayGroups([{ key: "ops", label: "运维", order: 0 }]);
    store.registerMenuContribution("ops", [{ label: "隐患单", path: "/ops/ticket" }]);
    store.registerMenuContribution("person-manage", [
      { label: "个人管理", children: [{ label: "个人资料", path: "/portal/legacy-personal/info" }] },
    ]);
    store.setActiveGroup("person-manage");
    store.setDisplayGroups([
      { key: "ops", label: "运维", order: 0 },
      { key: "energy", label: "能耗", order: 1 },
    ]);
    expect(store.activeGroupKey).toBe("person-manage");
    expect(store.activeMenuTree[0]?.label).toBe("个人管理");
  });

  test("groups/menus 加载态驱动 isNavLoading", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    expect(store.isNavLoading).toBe(false);

    store.setGroupsStatus("loading");
    expect(store.isGroupsLoading).toBe(true);
    expect(store.isNavLoading).toBe(true);

    store.setGroupsStatus("ready");
    store.setDisplayGroups([{ key: "ops", label: "运维管理", order: 0 }]);
    expect(store.isNavLoading).toBe(false);

    store.setMenuStatus("ops", "loading");
    expect(store.isActiveMenusLoading).toBe(true);
    expect(store.isNavLoading).toBe(true);

    store.setMenuStatus("ops", "ready");
    expect(store.isNavLoading).toBe(false);
  });

  test("getLegacyMenusForApp：仅按 OUAA code 入库时，仍能用 microApp name 按 path 取到带 alias 的菜单", () => {
    setActivePinia(createPinia());
    const store = usePortalNavigationStore();
    const menus = [
      {
        name: "维保计划",
        path: "/portal/maintenance/maintenancePlan",
        alias: { name: "维保计划@" },
      },
    ];
    store.registerLegacyMenusByAppCode({ "ouaa-code-xyz": menus });
    const found = store.getLegacyMenusForApp("maintenance");
    expect(found).toEqual(menus);
    expect(resolvePageTitleFromLegacyMenus(found, { pathname: "/portal/maintenance/maintenancePlan" }, "维保计划")).toBe("维保计划@");
  });
});
