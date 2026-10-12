import type { EventBus } from "@g2-composition/contract";

export function createEventBus(): EventBus {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  return {
    publish(event, payload) {
      for (const handler of handlers.get(event) ?? []) {
        handler(payload);
      }
    },
    subscribe(event, handler) {
      if (!handlers.has(event)) {
        handlers.set(event, new Set());
      }
      handlers.get(event)!.add(handler);
      return () => handlers.get(event)?.delete(handler);
    },
  };
}
