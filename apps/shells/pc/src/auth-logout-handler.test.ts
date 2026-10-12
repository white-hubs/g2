import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { AUTH_LOGOUT_REQUESTED_EVENT, installAuthLogoutHandler } from "./auth-logout-handler";

describe("installAuthLogoutHandler", () => {
  test("订阅 auth:logout-requested 事件，收到后调用 onLogout（ADR-0047：登出动作走 ctx.bus，由 Shell 执行真正的登出）", () => {
    const bus = createFakeBus();
    const calls: unknown[] = [];
    installAuthLogoutHandler(bus, (payload) => calls.push(payload));

    bus.publish(AUTH_LOGOUT_REQUESTED_EVENT, { errorCode: "AUTH_EXPIRED" });

    expect(calls).toEqual([{ errorCode: "AUTH_EXPIRED" }]);
  });

  test("其它事件不触发 onLogout", () => {
    const bus = createFakeBus();
    const calls: unknown[] = [];
    installAuthLogoutHandler(bus, (payload) => calls.push(payload));

    bus.publish("some-other-event", { irrelevant: true });

    expect(calls).toEqual([]);
  });

  test("返回的取消函数能解除订阅", () => {
    const bus = createFakeBus();
    const calls: unknown[] = [];
    const unsubscribe = installAuthLogoutHandler(bus, (payload) => calls.push(payload));

    unsubscribe();
    bus.publish(AUTH_LOGOUT_REQUESTED_EVENT, { errorCode: "AUTH_EXPIRED" });

    expect(calls).toEqual([]);
  });
});
