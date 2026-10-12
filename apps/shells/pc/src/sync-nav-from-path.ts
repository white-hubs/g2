import { parsePortalMicroAppName } from "./legacy-qiankun-auth";
import type { usePortalNavigationStore } from "./stores/portal-navigation";
import { WORKBENCH_GROUP_KEY, isWorkbenchGroupKey, isWorkbenchPath } from "./workbench-group";

type NavStore = ReturnType<typeof usePortalNavigationStore>;

export interface SyncNavFromPathDeps {
  nav: NavStore;
  ensureGroupMenus: (groupKey: string) => Promise<void>;
  /**
   * 同步索引：terminal-application-groups 上的 code（偶发含 path 段）。
   * 分组列表应用通常无 path，深链常 miss。
   */
  resolveGroupKeyForAppRef?: (appRef: string) => string | undefined;
}

/**
 * 登录 / CAS 回跳等全页鉴权路由：无门户分组语义。
 * 若此时走「按序 ensure menus」回退，会因永远找不到 path 而打完全部分组（onLoginSuccess 时尚在 /login）。
 */
export function isShellAuthPath(path: string): boolean {
  const pathname = (path.split("?")[0] ?? path).replace(/\/+$/, "") || "/";
  return pathname === "/login" || pathname === "/verify-auth";
}

/**
 * 按当前 URL 校正顶栏分组 + 侧栏 menus。
 *
 * 对齐旧仓 `syncCurrentByPath`：深链 / 刷新 / 从工作台应用中心跳进门户时，
 * 不能停留在默认「工作台」分组（否则侧栏只剩「工作台」一项，且工作台本身不应有侧栏语义）。
 */
export async function syncNavFromPath(path: string, deps: SyncNavFromPathDeps): Promise<void> {
  const { nav, ensureGroupMenus, resolveGroupKeyForAppRef } = deps;
  const pathname = path.split("?")[0] ?? path;

  if (isShellAuthPath(pathname)) {
    return;
  }

  if (isWorkbenchPath(pathname)) {
    nav.setActiveGroup(WORKBENCH_GROUP_KEY);
    await ensureGroupMenus(WORKBENCH_GROUP_KEY);
    return;
  }

  let match = nav.findByPath(pathname);
  if (!match) {
    const portalApp = parsePortalMicroAppName(pathname);
    const groupKey = portalApp ? resolveGroupKeyForAppRef?.(portalApp) : undefined;
    if (groupKey && !isWorkbenchGroupKey(groupKey)) {
      await ensureGroupMenus(groupKey);
      match = nav.findByPath(pathname);
    }
  }
  if (!match) {
    // TODO(深链 menus): 现网没有「按 application code / portal name 拉菜单」的独立接口，
    // 分组列表里的应用通常也只有 code、没有 /portal/{name} path，深链刷新无法直接定位 groupId。
    // 只能按 displayGroups 顺序 ensure group/menus 直到 findByPath 命中（点顶栏分组仍是单次按需）。
    // 若后端补齐 by-code 菜单或 groups 带 path/group 映射，改为一次请求后删掉本回退。
    const pending = nav.displayGroups
      .map((group) => group.key)
      .filter((key) => !isWorkbenchGroupKey(key) && nav.getMenuStatus(key) !== "ready");
    for (const key of pending) {
      await ensureGroupMenus(key);
      match = nav.findByPath(pathname);
      if (match) {
        break;
      }
    }
  }

  if (!match?.domainName) {
    return;
  }

  // 个人中心：壳自持菜单，不进顶栏/OUAA；仍须切 activeGroup，侧栏才能露出「个人管理」树。
  if (match.domainName === "person-manage") {
    if (nav.activeGroupKey !== match.domainName) {
      nav.setActiveGroup(match.domainName);
    }
    return;
  }

  if (nav.activeGroupKey !== match.domainName) {
    nav.setActiveGroup(match.domainName);
  }
  await ensureGroupMenus(match.domainName);
}
