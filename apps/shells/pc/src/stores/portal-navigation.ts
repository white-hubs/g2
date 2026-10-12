import type { MenuContributionNode } from "@g2-composition/contract";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { type LegacyQiankunMenu, findLegacyMenusForMicroApp } from "../legacy-menu-permission";

export interface DisplayGroup {
  key: string;
  label: string;
  order: number;
}

export interface NavigationMenuNode extends Omit<MenuContributionNode, "children"> {
  domainName: string;
  children?: NavigationMenuNode[];
}

export interface ApplicationEntryGroup {
  key: string;
  label: string;
  order: number;
  items: NavigationMenuNode[];
}

function decorate(nodes: MenuContributionNode[], domainName: string): NavigationMenuNode[] {
  return nodes.map((node) => ({
    ...node,
    domainName,
    children: node.children ? decorate(node.children, domainName) : undefined,
  }));
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function findBestMatch(nodes: NavigationMenuNode[], path: string): NavigationMenuNode | undefined {
  let best: { node: NavigationMenuNode; score: number } | undefined;
  const target = normalizePath(path);
  const visit = (list: NavigationMenuNode[]) => {
    for (const node of list) {
      if (node.path) {
        const candidate = normalizePath(node.path);
        const isExact = candidate === target;
        const isPrefix = target.startsWith(`${candidate}/`);
        if (isExact || isPrefix) {
          const score = candidate.length;
          if (!best || score > best.score) {
            best = { node, score };
          }
        }
      }
      if (node.children) {
        visit(node.children);
      }
    }
  };
  visit(nodes);
  return best?.node;
}

function firstPath(nodes: NavigationMenuNode[]): string | undefined {
  for (const node of nodes) {
    if (node.path) {
      return node.path;
    }
    if (node.children?.length) {
      const child = firstPath(node.children);
      if (child) {
        return child;
      }
    }
  }
  return undefined;
}

/** 个人中心不进顶栏横向分组，只走用户下拉。 */
const HIDDEN_TOP_BAR_DOMAINS = new Set(["person-manage"]);

export type NavLoadStatus = "idle" | "loading" | "ready" | "error";

export const usePortalNavigationStore = defineStore("portalNavigation", () => {
  const displayGroups = ref<DisplayGroup[]>([]);
  /** composition 显式配置过 displayGroups 后为 true；否则随域注册自动重建顶栏 Tab。 */
  const hasExplicitDisplayGroups = ref(false);
  const activeGroupKey = ref("");
  const byDomain = ref(new Map<string, NavigationMenuNode[]>());
  /**
   * 微应用 code → 该应用 menuVOS（旧仓 Menu 形状，含 alias）。
   * 供写入 GH-currentMenus，子应用 usePageName 用 alias.name 作页标题。
   */
  const legacyMenusByAppCode = ref(new Map<string, LegacyQiankunMenu[]>());
  /** 顶栏分组接口（terminal-application-groups）加载态。 */
  const groupsStatus = ref<NavLoadStatus>("idle");
  /** 各分组 menus 接口加载态（按需）。 */
  const menuStatusByGroup = ref(new Map<string, NavLoadStatus>());

  function ensureActiveGroup(): void {
    if (displayGroups.value.some((g) => g.key === activeGroupKey.value)) {
      return;
    }
    // 侧栏可切到非顶栏域（如 person-manage）：只要该域已有菜单贡献就保留，勿被顶栏分组重建冲掉。
    if (activeGroupKey.value && byDomain.value.has(activeGroupKey.value)) {
      return;
    }
    const first = displayGroups.value.toSorted((a, b) => a.order - b.order)[0];
    activeGroupKey.value = first?.key ?? "";
  }

  function setGroupsStatus(status: NavLoadStatus): void {
    groupsStatus.value = status;
  }

  function setMenuStatus(groupKey: string, status: NavLoadStatus): void {
    const next = new Map(menuStatusByGroup.value);
    next.set(groupKey, status);
    menuStatusByGroup.value = next;
  }

  function getMenuStatus(groupKey: string): NavLoadStatus {
    return menuStatusByGroup.value.get(groupKey) ?? "idle";
  }

  function setDisplayGroups(groups: DisplayGroup[]): void {
    hasExplicitDisplayGroups.value = true;
    displayGroups.value = groups;
    ensureActiveGroup();
  }

  function rebuildAutoDisplayGroups(): void {
    displayGroups.value = Array.from(byDomain.value.keys())
      .filter((name) => !HIDDEN_TOP_BAR_DOMAINS.has(name))
      .map((name, index) => ({ key: name, label: name, order: index + 1 }));
    ensureActiveGroup();
  }

  function setActiveGroup(key: string): void {
    activeGroupKey.value = key;
  }

  function resolveGroupLabel(key: string): string {
    return displayGroups.value.find((g) => g.key === key)?.label ?? key;
  }

  function registerMenuContribution(domainName: string, nodes: MenuContributionNode[]): void {
    byDomain.value.set(domainName, decorate(nodes, domainName));
    byDomain.value = new Map(byDomain.value);

    if (!hasExplicitDisplayGroups.value) {
      rebuildAutoDisplayGroups();
    } else {
      ensureActiveGroup();
    }
  }

  /** 合并 OUAA 分组下各应用的旧仓菜单索引（按 microApp code）。 */
  function registerLegacyMenusByAppCode(menusByCode: Record<string, LegacyQiankunMenu[]>): void {
    const next = new Map(legacyMenusByAppCode.value);
    for (const [code, menus] of Object.entries(menusByCode)) {
      if (!code) {
        continue;
      }
      next.set(code, menus);
    }
    legacyMenusByAppCode.value = next;
  }

  function getLegacyMenusForApp(appCode: string): LegacyQiankunMenu[] {
    return findLegacyMenusForMicroApp(legacyMenusByAppCode.value, appCode);
  }

  const menuTree = computed<NavigationMenuNode[]>(() => Array.from(byDomain.value.values()).flat());

  /**
   * 顶栏 ApplicationEntry 用的分组数据：每个 displayGroup 挂上该 key 对应域的菜单根节点。
   * group.key 约定等于 domainName（composition displayGroups / 自动生成时都按此约定）。
   */
  const applicationEntryGroups = computed<ApplicationEntryGroup[]>(() =>
    displayGroups.value
      .toSorted((a, b) => a.order - b.order)
      .map((group) => ({
        ...group,
        items: byDomain.value.get(group.key) ?? [],
      })),
  );

  /** 侧栏只展示当前应用分组下的菜单，避免平铺所有域。 */
  const activeMenuTree = computed<NavigationMenuNode[]>(() => {
    if (!activeGroupKey.value) {
      return menuTree.value.filter((node) => !HIDDEN_TOP_BAR_DOMAINS.has(node.domainName));
    }
    return byDomain.value.get(activeGroupKey.value) ?? [];
  });

  const isGroupsLoading = computed(() => groupsStatus.value === "loading");
  const isActiveMenusLoading = computed(() => {
    const key = activeGroupKey.value;
    if (!key) {
      return false;
    }
    return getMenuStatus(key) === "loading";
  });
  /** 顶栏分组或当前分组菜单任一加载中 → 壳层展示 loading。 */
  const isNavLoading = computed(() => isGroupsLoading.value || isActiveMenusLoading.value);

  function findByPath(path: string): NavigationMenuNode | undefined {
    return findBestMatch(menuTree.value, path);
  }

  function findByPathInGroup(groupKey: string, path: string): NavigationMenuNode | undefined {
    if (!groupKey) {
      return undefined;
    }
    return findBestMatch(byDomain.value.get(groupKey) ?? [], path);
  }

  function firstPathInGroup(groupKey: string): string | undefined {
    return firstPath(byDomain.value.get(groupKey) ?? []);
  }

  function selectGroup(key: string): string | undefined {
    setActiveGroup(key);
    return firstPathInGroup(key);
  }

  return {
    displayGroups,
    setDisplayGroups,
    activeGroupKey,
    setActiveGroup,
    selectGroup,
    firstPathInGroup,
    resolveGroupLabel,
    registerMenuContribution,
    registerLegacyMenusByAppCode,
    getLegacyMenusForApp,
    menuTree,
    applicationEntryGroups,
    activeMenuTree,
    findByPath,
    findByPathInGroup,
    groupsStatus,
    setGroupsStatus,
    getMenuStatus,
    setMenuStatus,
    isGroupsLoading,
    isActiveMenusLoading,
    isNavLoading,
  };
});
