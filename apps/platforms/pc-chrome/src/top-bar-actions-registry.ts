import type { EventBus } from "@g2-composition/contract";
import { markRaw, reactive } from "vue";

export interface TopBarAction {
  id: string;
  component: unknown;
}

export interface TopBarActionsRegistry {
  register: (action: TopBarAction) => void;
  list: () => TopBarAction[];
}

export function createTopBarActionsRegistry(): TopBarActionsRegistry {
  const actions = reactive<TopBarAction[]>([]);
  return {
    register(action) {
      // registry 本身是 reactive；组件对象必须 markRaw，否则 TopBar 渲染时会触发
      //「Component that was made a reactive object」警告。
      const next = {
        id: action.id,
        component: markRaw(action.component as object),
      };
      // ADR-0053：同 id 替换（Shell AI 占位 → pcAiAssistant 真入口），列表型贡献点升级而非独占 slot 冲突。
      const index = actions.findIndex((existing) => existing.id === action.id);
      if (index >= 0) {
        actions.splice(index, 1, next);
        return;
      }
      actions.push(next);
    },
    list() {
      return actions;
    },
  };
}

export function wireTopBarActionsRegistryToBus(bus: EventBus, registry: TopBarActionsRegistry): () => void {
  return bus.subscribe("chrome:register-top-bar-action", (payload) => {
    registry.register(payload as TopBarAction);
  });
}

/** 模块级单例：pc-chrome 自己的 install 负责把它接到总线上；TopBar.vue 从这里读，不直接依赖 install 时机。
 * 绝不可被其它 Platform 直接 import——跨 Platform 通信只能走 ctx.bus 上的 chrome:register-top-bar-action 事件。 */
export const topBarActionsRegistry = createTopBarActionsRegistry();
