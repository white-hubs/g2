import type { MenuContributionNode } from "@g2-composition/contract";

import {
  type LegacyQiankunMenu,
  type LegacyQiankunMenuAlias,
  portalMicroAppKeyFromPath,
  resolveMenuDisplayName,
} from "./legacy-menu-permission";
import type { DisplayGroup } from "./stores/portal-navigation";

/** OUAA `GET .../context/application/group/menus` 应用项（字段对齐旧仓 ApplicationPageVO）。 */
export interface OuaaApplicationPage {
  id?: unknown;
  name?: unknown;
  code?: unknown;
  icon?: unknown;
  path?: unknown;
  menuVOS?: unknown;
  sort?: unknown;
  alias?: unknown;
}

/** OUAA 菜单项（menuVOS / children）。 */
export interface OuaaMenuItem {
  id?: unknown;
  name?: unknown;
  path?: unknown;
  icon?: unknown;
  children?: unknown;
  alias?: unknown;
  functions?: unknown;
  dataPermissions?: unknown;
}

/** OUAA `GET .../context/terminal-application-groups` 分组项。 */
export interface OuaaApplicationGroup {
  id?: unknown;
  name?: unknown;
  code?: unknown;
}

export interface OuaaGroupMenusMapped {
  /** 侧栏贡献树（label 已用别名优先）。 */
  nodes: MenuContributionNode[];
  /**
   * 索引 key = OUAA `application.code` 以及菜单 path 上的 `/portal/{name}` 段（qiankun name）。
   * 供写入 GH-currentMenus（含 alias）。
   */
  legacyMenusByAppCode: Record<string, LegacyQiankunMenu[]>;
  /** 与 nodes 同下标的 OUAA 应用码，供壳层按应用选择 Domain 菜单根。 */
  appCodes: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asNonEmptyString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function mapAlias(raw: unknown): LegacyQiankunMenuAlias | undefined {
  // 对齐旧仓 choose-terminal：部分接口把 alias 存成 JSON 字符串
  let candidate: unknown = raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      candidate = JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  const alias = asRecord(candidate);
  if (!alias) {
    return undefined;
  }
  const name = asNonEmptyString(alias.name);
  if (!name) {
    return undefined;
  }
  const mapped: LegacyQiankunMenuAlias = { name };
  const code = asNonEmptyString(alias.code);
  const icon = asNonEmptyString(alias.icon);
  const sort = asNonEmptyString(alias.sort);
  if (code) {
    mapped.code = code;
  }
  if (icon) {
    mapped.icon = icon;
  }
  if (sort) {
    mapped.sort = sort;
  }
  return mapped;
}

/** 写入索引用的 key：OUAA code + 菜单/应用 path 上的 portal 段（qiankun name）。 */
function collectLegacyMenuIndexKeys(appCode: string, appPath: string | undefined, menus: LegacyQiankunMenu[]): string[] {
  const keys = new Set<string>();
  if (appCode) {
    keys.add(appCode);
  }
  const fromAppPath = portalMicroAppKeyFromPath(appPath);
  if (fromAppPath) {
    keys.add(fromAppPath);
  }
  const walk = (items: LegacyQiankunMenu[]): void => {
    for (const item of items) {
      const fromMenu = portalMicroAppKeyFromPath(item.path);
      if (fromMenu) {
        keys.add(fromMenu);
      }
      if (item.children?.length) {
        walk(item.children);
      }
    }
  };
  walk(menus);
  return [...keys];
}

/** 兼容直接数组与 `{ code:200, data:[] }`。 */
export function unwrapOuaaList(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter((item): item is Record<string, unknown> => asRecord(item) !== null);
  }
  const top = asRecord(body);
  const data = top?.data;
  if (Array.isArray(data)) {
    return data.filter((item): item is Record<string, unknown> => asRecord(item) !== null);
  }
  return [];
}

function mapLegacyMenuItems(items: unknown): LegacyQiankunMenu[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  const menus: LegacyQiankunMenu[] = [];
  for (const raw of items) {
    const item = asRecord(raw) as OuaaMenuItem | null;
    if (!item) {
      continue;
    }
    const name = asNonEmptyString(item.name);
    if (!name) {
      continue;
    }
    const alias = mapAlias(item.alias);
    const path = asNonEmptyString(item.path) || undefined;
    const children = mapLegacyMenuItems(item.children);
    const menu: LegacyQiankunMenu = {
      name,
      // 子应用 handleRouter：`menuConfig.dataPermissions[0]`，缺省必须是 []
      dataPermissions: Array.isArray(item.dataPermissions) ? item.dataPermissions : [],
    };
    if (path) {
      menu.path = path;
    }
    if (alias) {
      menu.alias = alias;
    }
    if (children.length > 0) {
      menu.children = children;
    } else if (Array.isArray(item.children)) {
      // 对齐旧仓叶子常带 children:[]，供 flatten 后按 !children.length 筛叶子
      menu.children = [];
    }
    if (Array.isArray(item.functions)) {
      menu.functions = item.functions as LegacyQiankunMenu["functions"];
    }
    menus.push(menu);
  }
  return menus;
}

function mapMenuItemsFromLegacy(menus: LegacyQiankunMenu[]): MenuContributionNode[] | undefined {
  if (menus.length === 0) {
    return undefined;
  }
  const nodes: MenuContributionNode[] = [];
  for (const menu of menus) {
    const label = resolveMenuDisplayName(menu);
    const node: MenuContributionNode = { label };
    if (menu.path) {
      node.path = menu.path;
    }
    if (menu.children?.length) {
      const children = mapMenuItemsFromLegacy(menu.children);
      if (children?.length) {
        node.children = children;
      }
    }
    nodes.push(node);
  }
  return nodes.length > 0 ? nodes : undefined;
}

function firstMenuPath(nodes: MenuContributionNode[] | undefined): string | undefined {
  if (!nodes?.length) {
    return undefined;
  }
  for (const node of nodes) {
    if (node.path) {
      return node.path;
    }
    const nested = firstMenuPath(node.children);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

export interface MapOuaaGroupMenusOptions {
  /**
   * 应用自身无 path、menuVOS 也为空时（如已迁 MF 的门禁 DOORMANAGE），
   * 用 OUAA code 回落解析可跳转 path，否则顶栏搜索 `flattenSearchEntries` 会丢掉该应用。
   */
  resolveAppPath?: (appCode: string) => string | undefined;
  /**
   * 已迁 MF 应用：丢弃 OUAA portal 叶子后，用 Domain `menuContribution` 子树填回侧栏（ADR-0059）。
   * 返回值挂到应用一级节点下；保留 OUAA 应用 label/icon。
   */
  resolveDomainMenuChildren?: (appCode: string) => MenuContributionNode[] | undefined;
  /** 已迁应用可按 OUAA code 覆盖显示名称。 */
  resolveAppLabel?: (appCode: string, currentLabel: string) => string | undefined;
}

function cloneMenuNodes(nodes: MenuContributionNode[]): MenuContributionNode[] {
  return nodes.map((node) => ({
    ...node,
    ...(node.children?.length ? { children: cloneMenuNodes(node.children) } : {}),
  }));
}

/**
 * Domain `menuContribution` → 挂到 OUAA 应用一级下的子树。
 * 单根且带 children 时剥掉域内应用壳，避免与侧栏「门禁管理@」重复一层。
 */
export function childrenFromDomainMenuContribution(contrib: MenuContributionNode[] | undefined): MenuContributionNode[] {
  if (!contrib?.length) {
    return [];
  }
  if (contrib.length === 1 && contrib[0]?.children?.length) {
    return cloneMenuNodes(contrib[0].children);
  }
  return cloneMenuNodes(contrib);
}

/** 已迁应用节点无 children 时，按 app path（MF basePath）挂回 Domain 菜单子树。 */
export function graftDomainMenuChildrenOntoApps(
  nodes: MenuContributionNode[],
  resolveChildren: (appPath: string) => MenuContributionNode[] | undefined,
): MenuContributionNode[] {
  return nodes.map((node) => {
    if (node.children?.length || !node.path) {
      return node;
    }
    const children = resolveChildren(node.path);
    if (!children?.length) {
      return node;
    }
    return { ...node, children };
  });
}

/**
 * 将分组下应用列表映射为侧栏节点 + 按应用 code 索引的旧仓菜单（含 alias）。
 * - 一级 = 应用（带后台 `icon`；label 别名优先）
 * - 二级及以下 = menuVOS（故意不带 icon；label 别名优先）
 */
export function mapOuaaApplicationsToGroupMenus(apps: unknown, options?: MapOuaaGroupMenusOptions): OuaaGroupMenusMapped {
  const list = Array.isArray(apps) ? apps : unwrapOuaaList(apps);
  const nodes: MenuContributionNode[] = [];
  const appCodes: string[] = [];
  const legacyMenusByAppCode: Record<string, LegacyQiankunMenu[]> = {};

  const sorted = list.toSorted((a: unknown, b: unknown) => {
    const left = asRecord(a);
    const right = asRecord(b);
    const sa = typeof left?.sort === "number" ? left.sort : Number.MAX_SAFE_INTEGER;
    const sb = typeof right?.sort === "number" ? right.sort : Number.MAX_SAFE_INTEGER;
    return sa - sb;
  });

  for (const raw of sorted) {
    const app = asRecord(raw) as OuaaApplicationPage | null;
    if (!app) {
      continue;
    }
    const name = asNonEmptyString(app.name);
    if (!name) {
      continue;
    }
    const appAlias = mapAlias(app.alias);
    const originalLabel = resolveMenuDisplayName({ name, alias: appAlias });
    const icon = asNonEmptyString(app.icon);
    const legacyMenus = mapLegacyMenuItems(app.menuVOS);
    let children = mapMenuItemsFromLegacy(legacyMenus);
    const appCode = asNonEmptyString(app.code);
    const label = (appCode && options?.resolveAppLabel?.(appCode, originalLabel)) || originalLabel;
    const rawAppPath = asNonEmptyString(app.path);
    // 已迁应用：仅用 Profile navigateCodes → MF base；丢弃 OUAA portal 叶子。
    // 侧栏叶子以 Domain menuContribution 为准（ADR-0059）；由 resolveDomainMenuChildren 填回。
    const mfBase = appCode ? options?.resolveAppPath?.(appCode) : undefined;
    if (mfBase) {
      children = appCode ? options?.resolveDomainMenuChildren?.(appCode) : undefined;
    }
    const appPath = mfBase || rawAppPath || firstMenuPath(children) || mfBase;
    const node: MenuContributionNode = { label };
    if (icon) {
      node.icon = icon;
    }
    if (appPath) {
      node.path = appPath;
    }
    if (children?.length) {
      node.children = children;
    }
    nodes.push(node);
    appCodes.push(appCode);

    // 旧仓按 path 归属应用，不依赖 code===microApp.name；同时索引 code 与 portal 段
    for (const key of collectLegacyMenuIndexKeys(appCode, appPath, legacyMenus)) {
      legacyMenusByAppCode[key] = legacyMenus;
    }
  }

  return { nodes, legacyMenusByAppCode, appCodes };
}

/**
 * 将分组下应用列表映射为侧栏一级节点（兼容旧调用方，等价 `mapOuaaApplicationsToGroupMenus(...).nodes`）。
 */
export function mapOuaaApplicationsToMenuNodes(apps: unknown, options?: MapOuaaGroupMenusOptions): MenuContributionNode[] {
  return mapOuaaApplicationsToGroupMenus(apps, options).nodes;
}

export function mapOuaaGroupsToDisplayGroups(groups: unknown): DisplayGroup[] {
  const list = Array.isArray(groups) ? groups : unwrapOuaaList(groups);
  const result: DisplayGroup[] = [];
  for (const [index, raw] of list.entries()) {
    const group = asRecord(raw) as OuaaApplicationGroup | null;
    if (!group) {
      continue;
    }
    const key = asNonEmptyString(group.id) || asNonEmptyString(group.code);
    const label = asNonEmptyString(group.name) || asNonEmptyString(group.code) || key;
    if (!key || !label) {
      continue;
    }
    result.push({ key, label, order: index });
  }
  return result;
}
