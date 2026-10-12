import type { EventBus } from "@g2-composition/contract";

import { NAVIGATE_INTENT_EVENT } from "./navigate-intent-handler";

/**
 * TODO(迁移兼容): 工作台仍通过 `@ghcloud/cube-mf-root` 发 `mf-root-to-application`
 *（`window.__CUBE_EVENT_BUS_INSTANCE__`）。门面权威入口是 Platform 总线 `navigate-intent`；
 * 本适配只做单向转发。工作台迁到发 navigate-intent（或不再走 cube 总线）后删除本文件。
 */
export const MF_ROOT_TO_APPLICATION_EVENT = "mf-root-to-application";

interface CubeEventBus {
  publish: (event: string, msg: string) => void | Promise<void>;
  subscribe: (event: string, callback: (msg: string) => void) => void;
  unsubscribe?: (event: string, callback: (msg: string) => void) => void;
}

type WindowWithCubeBus = Window & { __CUBE_EVENT_BUS_INSTANCE__?: CubeEventBus };

function ensureCubeEventBus(targetWindow: WindowWithCubeBus): CubeEventBus {
  const existing = targetWindow.__CUBE_EVENT_BUS_INSTANCE__;
  if (existing && typeof existing.subscribe === "function" && typeof existing.publish === "function") {
    return existing;
  }
  const handlers = new Map<string, Set<(msg: string) => void>>();
  const created: CubeEventBus = {
    publish(event, msg) {
      for (const handler of handlers.get(event) ?? []) {
        // 对齐旧仓 EventBus：异步投递，避免发布方栈内重入
        setTimeout(() => {
          handler(msg);
        }, 0);
      }
    },
    subscribe(event, callback) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(callback);
    },
    unsubscribe(event, callback) {
      handlers.get(event)?.delete(callback);
    },
  };
  targetWindow.__CUBE_EVENT_BUS_INSTANCE__ = created;
  return created;
}

function parseCubePayload(msg: string): { code?: string; path?: string } | null {
  try {
    const parsed = JSON.parse(msg) as { data?: unknown };
    const data = parsed.data;
    if (data === null || typeof data !== "object") {
      return null;
    }
    const record = data as Record<string, unknown>;
    const code = typeof record.code === "string" ? record.code : undefined;
    const path = typeof record.path === "string" ? record.path : undefined;
    if (!code && !path) {
      return null;
    }
    return { ...(code ? { code } : {}), ...(path ? { path } : {}) };
  } catch {
    return null;
  }
}

/**
 * 把旧仓 cube 总线的应用跳转事件转发到门面 `navigate-intent`。
 * 若页面尚无 `__CUBE_EVENT_BUS_INSTANCE__`，先挂一个兼容最小实现，供工作台复用同一单例。
 */
export function installMfRootToApplicationBridge(targetWindow: Window, shellBus: EventBus): () => void {
  const cubeBus = ensureCubeEventBus(targetWindow as WindowWithCubeBus);
  const onMessage = (msg: string): void => {
    const payload = parseCubePayload(msg);
    if (!payload) {
      return;
    }
    shellBus.publish(NAVIGATE_INTENT_EVENT, payload);
  };
  cubeBus.subscribe(MF_ROOT_TO_APPLICATION_EVENT, onMessage);
  return () => {
    cubeBus.unsubscribe?.(MF_ROOT_TO_APPLICATION_EVENT, onMessage);
  };
}
