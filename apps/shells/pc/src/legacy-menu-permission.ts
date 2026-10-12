/**
 * 对齐旧仓 `use-child-application.handlePermissionConfig`：
 * 把当前应用菜单树摊平，供 qiankun props.permissionConfig / props.routes 与
 * 子应用 `usePageName`（读 GH-currentMenus）使用。
 */

export interface LegacyQiankunMenuAlias {
  name: string;
  code?: string;
  icon?: string;
  sort?: string;
}

/** 旧仓 Menu 最小兼容形状（子应用 usePageName / permissionConfig 可读）。 */
export interface LegacyQiankunMenu {
  name: string;
  path?: string;
  alias?: LegacyQiankunMenuAlias;
  children?: LegacyQiankunMenu[];
  functions?: ({ functionCode?: string } | string)[];
  /**
   * 子应用 `handleRouter` 无空值保护地读 `dataPermissions[0]`；
   * 旧仓写原始 menuVOS，缺省时也须是数组。
   */
  dataPermissions?: unknown[];
  [key: string]: unknown;
}

/** 保证 menuConfig 项带可安全下标的 dataPermissions（对齐旧仓原始 menuVOS）。 */
export function ensureMenuDataPermissions(menu: LegacyQiankunMenu): LegacyQiankunMenu {
  if (Array.isArray(menu.dataPermissions)) {
    return menu;
  }
  return { ...menu, dataPermissions: [] };
}

/**
 * 对齐旧仓 `expandMenu`：递归摊平并去掉 children，供 `props.routes` /
 * 子应用 `usePageName` 路径匹配。
 */
export function expandLegacyMenus(menuList: LegacyQiankunMenu[]): LegacyQiankunMenu[] {
  const res: LegacyQiankunMenu[] = [];
  for (const element of menuList) {
    if (element.children?.length) {
      res.push(...expandLegacyMenus(element.children));
    }
    const clone: LegacyQiankunMenu = { ...element };
    delete clone.children;
    res.push(clone);
  }
  return res;
}

/**
 * 对齐旧仓 `flattenTree`：摊平但保留 children，供 menuConfig 按「无子节点」筛叶子。
 * 不可与 expandMenu 混用——删掉 children 后父级会被误当成叶子，而父级常无 path，
 * 子应用 `item.path.replace(...)` 会直接 TypeError。
 */
export function flattenLegacyMenus(menuList: LegacyQiankunMenu[]): LegacyQiankunMenu[] {
  const flat: LegacyQiankunMenu[] = [];
  for (const item of menuList) {
    flat.push(item);
    if (item.children?.length) {
      flat.push(...flattenLegacyMenus(item.children));
    }
  }
  return flat;
}

export function buildPermissionConfigFromMenus(menus: LegacyQiankunMenu[]): {
  menuConfig: LegacyQiankunMenu[];
  functionCodes: string[];
  routes: LegacyQiankunMenu[];
} {
  const routes = expandLegacyMenus(menus);
  // 对齐旧仓 handlePermissionConfig：flattenTree 后筛 !children.length，且须有 path
  const flattened = flattenLegacyMenus(menus);
  const menuConfig = flattened
    .filter((item) => {
      const hasChildren = Array.isArray(item.children) && item.children.length > 0;
      return !hasChildren && typeof item.path === "string" && item.path.length > 0;
    })
    .map(ensureMenuDataPermissions);
  const functionCodes = flattened.flatMap((item) => {
    const fns = item.functions;
    if (!Array.isArray(fns)) {
      return [];
    }
    return fns.map((fn) => (typeof fn === "string" ? fn : typeof fn?.functionCode === "string" ? fn.functionCode : "")).filter(Boolean);
  });
  return { menuConfig, functionCodes, routes };
}

/** 展示名：别名优先（与 cube-utils usePageName / 侧栏一致）。 */
export function resolveMenuDisplayName(menu: Pick<LegacyQiankunMenu, "name" | "alias">): string {
  const aliasName = menu.alias?.name?.trim();
  return aliasName || menu.name;
}

/** `/portal/{name}/...` → `name`；非门户路径返回 undefined。 */
export function portalMicroAppKeyFromPath(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }
  const match = path.split("?")[0]?.match(/^\/portal\/([^/]+)/u);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : undefined;
}

function menuTreeTouchesPortalApp(menus: LegacyQiankunMenu[], microAppName: string): boolean {
  const prefix = `/portal/${microAppName}`;
  for (const menu of menus) {
    const path = menu.path?.split("?")[0] ?? "";
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return true;
    }
    if (menu.children?.length && menuTreeTouchesPortalApp(menu.children, microAppName)) {
      return true;
    }
  }
  return false;
}

/**
 * 按微应用 name 取菜单（对齐旧仓 `matchApplicationMenuGroupByPath` 的意图）：
 * 1) 精确 code 2) 大小写不敏感 3) 菜单 path 落在 `/portal/{name}/` 下。
 * OUAA `application.code` 经常不等于 qiankun microApp.name。
 */
export function findLegacyMenusForMicroApp(
  menusByCode: Map<string, LegacyQiankunMenu[]> | Record<string, LegacyQiankunMenu[]>,
  microAppName: string,
): LegacyQiankunMenu[] {
  if (!microAppName) {
    return [];
  }
  const entries: [string, LegacyQiankunMenu[]][] = menusByCode instanceof Map ? [...menusByCode.entries()] : Object.entries(menusByCode);

  const exact = menusByCode instanceof Map ? menusByCode.get(microAppName) : menusByCode[microAppName];
  if (exact?.length) {
    return exact;
  }

  const lower = microAppName.toLowerCase();
  for (const [code, menus] of entries) {
    if (code.toLowerCase() === lower && menus.length > 0) {
      return menus;
    }
  }

  for (const [, menus] of entries) {
    if (menus.length > 0 && menuTreeTouchesPortalApp(menus, microAppName)) {
      return menus;
    }
  }
  return [];
}

/**
 * 对齐 `@ghcloud/cube-utils` `usePageName`：从 GH-currentMenus 形状解析页标题（非响应式语义）。
 * 供单测断言「写入 session 的菜单 → 子应用标题」链路，不引入子应用源码。
 */
export function resolvePageTitleFromLegacyMenus(
  menus: LegacyQiankunMenu[],
  locationHref: { pathname: string; search?: string },
  fallbackTitle?: string,
): string | undefined {
  const pathname = locationHref.pathname;
  const search = locationHref.search ?? "";
  const flat = expandLegacyMenus(menus);
  let current = flat.find((item) => `${pathname}${search}` === item.path);
  if (!current) {
    current = flat.find((item) => item.path?.includes(pathname));
  }
  const fromMenu = current?.alias?.name ? current.alias.name : current?.name;
  return fromMenu ?? fallbackTitle;
}
