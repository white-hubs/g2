/**
 * 只做类型级 import：`@g2-shell/pc` 是 pc-chrome 的 devDependency（参照 `SideMenu.vue` 现有的
 * `import type { NavigationMenuNode } from "@g2-shell/pc/stores/portal-navigation"` 写法），
 * `import type` 在编译期会被完全擦除，不产生任何运行时依赖/环形依赖——pc-chrome 不会在运行时
 * import Shell 的 store 实例，只是复用它导出的类型形状，方便消费方（Shell 接线任务）对齐字段。
 */
import type { NavigationMenuNode } from "@g2-shell/pc/stores/portal-navigation";
export type { NavigationMenuNode };
/**
 * `ApplicationEntry.vue` 消费的"分组 -> 域/菜单入口"数据形状。
 *
 * `key`/`label`/`order` 对应 Shell `usePortalNavigationStore().displayGroups`（`DisplayGroup`）
 * 里的同名字段；`items` 是该分组下可点击跳转的域/菜单节点列表。
 *
 * 已知缺口：当前 Shell store 的 `displayGroups` 和 `menuTree` 之间还没有建立"节点归属哪个分组"的
 * 关联字段（`NavigationMenuNode` 没有 `groupKey` 之类的字段），把 `menuTree` 的节点分配进哪个
 * `displayGroups.key` 是消费方（Shell 接线任务）需要另行解决的问题——pc-chrome 不允许直接读 Shell
 * store，也不该在这里猜测归属规则，所以本组件只负责渲染已经分好组的数据。
 */
export interface ApplicationEntryGroup {
    key: string;
    label: string;
    order: number;
    items: NavigationMenuNode[];
}
/**
 * `ChooseTerminalDropdown.vue` 的下拉项。
 * TODO：真实跳转目标待接线，见组件内注释。
 */
export interface TerminalEntry {
    code: string;
    label: string;
    url: string;
}
/** 顶栏「选择企业」内部租户（对齐旧仓 api.tenant /tenant/mine）。 */
export interface TenantOption {
    id: string;
    code: string;
    name: string;
    enabled: boolean;
    webSiteUrl?: string;
}
/** 顶栏「选择企业」外链租户（window.config.feature.outsideTenants）。 */
export interface OutsideTenantOption {
    id: string;
    name: string;
    path?: string;
}
//# sourceMappingURL=top-bar-types.d.ts.map