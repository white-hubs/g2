import { describe, expect, test } from "bun:test";

import { createEventBus } from "./event-bus";

describe("createEventBus", () => {
  test("publish 时同步调用所有已订阅的 handler", () => {
    const bus = createEventBus();
    const received: unknown[] = [];
    bus.subscribe("x", (payload) => received.push(payload));
    bus.publish("x", { a: 1 });
    expect(received).toEqual([{ a: 1 }]);
  });

  test("subscribe 返回的取消函数能正确解除订阅", () => {
    const bus = createEventBus();
    const received: unknown[] = [];
    const unsubscribe = bus.subscribe("x", (payload) => received.push(payload));
    unsubscribe();
    bus.publish("x", { a: 1 });
    expect(received).toEqual([]);
  });

  test("没有订阅者时 publish 不抛错", () => {
    const bus = createEventBus();
    expect(() => bus.publish("nobody-listening")).not.toThrow();
  });
});
