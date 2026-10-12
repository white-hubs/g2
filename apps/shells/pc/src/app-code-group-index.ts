import { type LegacyQiankunMenu, portalMicroAppKeyFromPath } from "./legacy-menu-permission";

/**
 * TODO(迁移兼容): 顶栏分组接口带 applicationPageVOS（多半只有 code，少有 path）。
 * 工作台跳转可按 code→groupKey；深链 `/portal/{name}` 若 code≠name 且无 by-code 菜单接口，
 * 仍只能在 sync-nav-from-path 里顺序扫 group/menus（见该文件 TODO）。
 */
export function buildAppCodeToGroupKeyIndex(groups: unknown): Map<string, string> {
  const index = new Map<string, string>();
  const list = Array.isArray(groups) ? groups : [];
  for (const raw of list) {
    if (raw === null || typeof raw !== "object") {
      continue;
    }
    const group = raw as Record<string, unknown>;
    const groupKey = (typeof group.id === "string" && group.id.trim()) || (typeof group.code === "string" && group.code.trim()) || "";
    if (!groupKey) {
      continue;
    }
    const apps = group.applicationPageVOS;
    if (!Array.isArray(apps)) {
      continue;
    }
    for (const appRaw of apps) {
      if (appRaw === null || typeof appRaw !== "object") {
        continue;
      }
      const app = appRaw as { code?: unknown; path?: unknown };
      const code = typeof app.code === "string" ? app.code.trim() : "";
      if (code) {
        index.set(code, groupKey);
        index.set(code.toLowerCase(), groupKey);
      }
      const path = typeof app.path === "string" ? app.path : "";
      const portalKey = portalMicroAppKeyFromPath(path);
      if (portalKey) {
        index.set(portalKey, groupKey);
        index.set(portalKey.toLowerCase(), groupKey);
      }
    }
  }
  return index;
}

/** 按 OUAA code 或 qiankun `/portal/{name}` 段查分组 key（大小写不敏感）。 */
export function lookupGroupKeyForAppRef(index: Map<string, string>, appRef: string | undefined): string | undefined {
  if (!appRef?.trim()) {
    return undefined;
  }
  const key = appRef.trim();
  return index.get(key) ?? index.get(key.toLowerCase());
}

export function firstPathFromLegacyMenus(menus: LegacyQiankunMenu[]): string | undefined {
  for (const menu of menus) {
    if (menu.path?.trim()) {
      return menu.path.trim();
    }
    if (menu.children?.length) {
      const nested = firstPathFromLegacyMenus(menu.children);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}
