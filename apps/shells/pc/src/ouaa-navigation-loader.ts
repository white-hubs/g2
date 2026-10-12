import type { OuaaClient } from "@g2-contract/ouaa";

import { buildAppCodeToGroupKeyIndex } from "./app-code-group-index";
import {
  type MapOuaaGroupMenusOptions,
  type OuaaGroupMenusMapped,
  mapOuaaApplicationsToGroupMenus,
  mapOuaaGroupsToDisplayGroups,
  unwrapOuaaList,
} from "./ouaa-navigation";
import type { DisplayGroup } from "./stores/portal-navigation";
import { prependWorkbenchDisplayGroup } from "./workbench-group";

export interface OuaaDisplayGroupsLoaded {
  groups: DisplayGroup[];
  /** OUAA 应用 code → 顶栏分组 key（来自分组接口里的 applicationPageVOS）。 */
  codeToGroupKey: Map<string, string>;
}

/**
 * 顶栏分组：经 `ouaaClient.getTerminalApplicationGroups`，
 * 并在最前插入壳层自持的「工作台」（对齐旧仓写死 tab，不来自 OUAA）。
 * 不预拉各分组 menus（按需见 `loadOuaaGroupMenus`）。
 */
export async function loadOuaaDisplayGroups(client: Pick<OuaaClient, "getTerminalApplicationGroups">): Promise<OuaaDisplayGroupsLoaded> {
  const groupsBody = await client.getTerminalApplicationGroups();
  const rawGroups = unwrapOuaaList(groupsBody);
  return {
    groups: prependWorkbenchDisplayGroup(mapOuaaGroupsToDisplayGroups(rawGroups)),
    codeToGroupKey: buildAppCodeToGroupKeyIndex(rawGroups),
  };
}

/**
 * 某一顶栏分组下的侧栏菜单：经 `ouaaClient.getApplicationGroupMenus`。
 * 进入该分组时再调。返回侧栏节点 + 按应用 code 索引的旧仓菜单（含 alias）。
 */
export async function loadOuaaGroupMenus(
  client: Pick<OuaaClient, "getApplicationGroupMenus">,
  groupKey: string,
  options?: MapOuaaGroupMenusOptions,
): Promise<OuaaGroupMenusMapped> {
  const menusBody = await client.getApplicationGroupMenus(groupKey);
  return mapOuaaApplicationsToGroupMenus(unwrapOuaaList(menusBody), options);
}
