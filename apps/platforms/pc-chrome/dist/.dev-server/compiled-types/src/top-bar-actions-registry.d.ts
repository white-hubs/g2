import type { EventBus } from "@g2-composition/contract";
export interface TopBarAction {
    id: string;
    component: unknown;
}
export interface TopBarActionsRegistry {
    register: (action: TopBarAction) => void;
    list: () => TopBarAction[];
}
export declare function createTopBarActionsRegistry(): TopBarActionsRegistry;
export declare function wireTopBarActionsRegistryToBus(bus: EventBus, registry: TopBarActionsRegistry): () => void;
/** 模块级单例：pc-chrome 自己的 install 负责把它接到总线上；TopBar.vue 从这里读，不直接依赖 install 时机。
 * 绝不可被其它 Platform 直接 import——跨 Platform 通信只能走 ctx.bus 上的 chrome:register-top-bar-action 事件。 */
export declare const topBarActionsRegistry: TopBarActionsRegistry;
//# sourceMappingURL=top-bar-actions-registry.d.ts.map