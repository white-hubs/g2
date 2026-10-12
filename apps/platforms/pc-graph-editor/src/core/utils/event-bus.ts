type EventHandler = (...args: any[]) => void;

/**
 * 事件总线
 *
 * 用于组件间通信
 */
class EventBus {
  private events: Map<string, EventHandler[]> = new Map();

  /**
   * 监听事件
   */
  on(event: string, handler: EventHandler) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  /**
   * 监听一次事件
   */
  once(event: string, handler: EventHandler) {
    const onceHandler: EventHandler = (...args) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * 触发事件
   */
  emit(event: string, ...args: any[]) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  /**
   * 取消监听
   */
  off(event: string, handler?: EventHandler) {
    if (!handler) {
      this.events.delete(event);
      return;
    }

    const handlers = this.events.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 清空所有事件
   */
  clear() {
    this.events.clear();
  }
}

/**
 * 编辑器事件常量
 */
export const EditorEvents = {
  NODE_ADDED: "node:added",
  NODE_REMOVED: "node:removed",
  NODE_CHANGED: "node:changed",
  NODE_SELECTED: "node:selected",
  NODE_UNSELECTED: "node:unselected",
  EDGE_ADDED: "edge:added",
  EDGE_REMOVED: "edge:removed",
  EDGE_CHANGED: "edge:changed",
  EDGE_CONNECTED: "edge:connected",
  SELECTION_CHANGED: "selection:changed",
  GRAPH_CHANGED: "graph:changed",
} as const;

// 创建全局事件总线实例
export const editorEventBus = new EventBus();

/**
 * useEventBus composable
 */
export function useEventBus() {
  return {
    on: editorEventBus.on.bind(editorEventBus),
    once: editorEventBus.once.bind(editorEventBus),
    emit: editorEventBus.emit.bind(editorEventBus),
    off: editorEventBus.off.bind(editorEventBus),
    clear: editorEventBus.clear.bind(editorEventBus),
  };
}
