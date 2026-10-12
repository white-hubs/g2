import type { MenuContributionNode } from "@g2-composition/contract";

import type { DisplayGroup } from "./stores/portal-navigation";

/**
 * 顶栏「工作台」：对齐旧仓 MIXIN `application-entry` 写死的 `<a-tab-pane key="workbench" tab="工作台">`，
 * 不是 `terminal-application-groups` 返回项。
 */
export const WORKBENCH_GROUP_KEY = "workbench";

/** MF 工作台首页；旧 `/index` 由壳层 redirect 到此。 */
export const WORKBENCH_PATH = "/d/workbench";
export const LEGACY_WORKBENCH_PATH = "/index";
export const WORKBENCH_PATH_GLOBAL_KEY = "__G2_WORKBENCH_PATH__";

export const WORKBENCH_MENU_CONTRIBUTION: MenuContributionNode[] = [{ label: "工作台", path: WORKBENCH_PATH }];

export function workbenchMenuContribution(useMfWorkbench: boolean): MenuContributionNode[] {
  return [{ label: "工作台", path: useMfWorkbench ? WORKBENCH_PATH : LEGACY_WORKBENCH_PATH }];
}

export function resolveWorkbenchPath(): string {
  const value = (globalThis as Record<string, unknown>)[WORKBENCH_PATH_GLOBAL_KEY];
  return typeof value === "string" ? value : WORKBENCH_PATH;
}

/** 把工作台插到 OUAA 分组最前；已有同 key 则先去掉再插，避免重复。 */
export function prependWorkbenchDisplayGroup(groups: DisplayGroup[]): DisplayGroup[] {
  const rest = groups.filter((group) => group.key !== WORKBENCH_GROUP_KEY).map((group, index) => ({ ...group, order: index + 1 }));
  return [{ key: WORKBENCH_GROUP_KEY, label: "工作台", order: 0 }, ...rest];
}

export function isWorkbenchGroupKey(key: string): boolean {
  return key === WORKBENCH_GROUP_KEY;
}

export function isWorkbenchPath(path: string): boolean {
  const normalized = path.replace(/\/+$/, "") || "/";
  return (
    normalized === "/index" || normalized === "/workbench" || normalized === WORKBENCH_PATH || normalized.startsWith(`${WORKBENCH_PATH}/`)
  );
}
