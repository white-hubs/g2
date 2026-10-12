export type ApplicationIconMap = Readonly<Record<string, string>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/** 从 OUAA 应用分组构建 code → icon，供无独立图标的快捷菜单回退。 */
export function buildApplicationIconMap(groups: unknown): ApplicationIconMap {
  if (!Array.isArray(groups)) return {};
  const entries: Array<[string, string]> = [];
  for (const group of groups) {
    if (!isRecord(group) || !Array.isArray(group.apps)) continue;
    for (const application of group.apps) {
      if (!isRecord(application)) continue;
      const code = typeof application.code === "string" ? application.code.trim() : "";
      const icon = typeof application.icon === "string" ? application.icon.trim() : "";
      if (code && icon) entries.push([code, icon]);
    }
  }
  return Object.fromEntries(entries);
}

/** 优先快捷菜单自身图标，否则使用所属应用的图标。 */
export function resolveFrequentMenuIcon(menu: { icon?: string; applicationCode?: string }, applicationIcons: ApplicationIconMap): string {
  return menu.icon || (menu.applicationCode ? applicationIcons[menu.applicationCode] : "") || "";
}
