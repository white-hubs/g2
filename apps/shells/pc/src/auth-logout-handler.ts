import type { EventBus } from "@g2-composition/contract";

/**
 * 必须与 `@g2-platform/http` 的 `AUTH_LOGOUT_REQUESTED` 常量值保持一致（`apps/platforms/http/src/platform.ts`）。
 * 不从那里静态 import——`@g2-platform/http` 是独立发版的 MF remote（ADR-0045），Shell 不应该对它产生构建期耦合，
 * 双方只约定同一个事件名字符串（同 pc-chrome/pc-ai-assistant 之间 `chrome:register-top-bar-action` 的模式）。
 */
export const AUTH_LOGOUT_REQUESTED_EVENT = "auth:logout-requested";

/**
 * Shell 订阅业务层发出的登出请求（ADR-0047）：具体某个 401 是否代表会话失效由业务层判断，
 * http 客户端/Shell 都不做这个判断；一旦业务层判定确实要登出，Shell 负责执行真正的登出
 * （清 token、跳转登录页），这部分逻辑始终留在 Shell 内部，不下放给 Platform（ADR-0028）。
 */
export function installAuthLogoutHandler(bus: EventBus, onLogout: (payload: unknown) => void): () => void {
  return bus.subscribe(AUTH_LOGOUT_REQUESTED_EVENT, onLogout);
}
