import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { registerRtcHandlers } from "./handlers";

describe("registerRtcHandlers", () => {
  test("不再消费 headquarters-alarm（报警弹窗改由 pc-alarm-popup，ADR-0062）", () => {
    const bus = createFakeBus();
    registerRtcHandlers(bus);
    bus.publish("headquarters-alarm", {
      businessPrincipal: JSON.stringify({
        applicationCode: "genericEquipmentMonitor",
        alarmTargetKey: "dev-1",
        businessKey: "bk-1",
        id: "alarm-1",
      }),
    });
    expect(bus.published.some((p) => p.event === "navigate-intent")).toBe(false);
  });

  test("收到 rtc-call-received 事件后，发布 rtc:incoming-call 供 UI 层展示来电通知", () => {
    const bus = createFakeBus();
    registerRtcHandlers(bus);
    bus.publish("rtc-call-received", { name: "张三" });
    const incoming = bus.published.find((p) => p.event === "rtc:incoming-call");
    expect(incoming?.payload).toMatchObject({ name: "张三" });
  });

  test("收到 rtc-call-end 事件后，发布 rtc:call-ended 供 UI 层关闭通话界面", () => {
    const bus = createFakeBus();
    registerRtcHandlers(bus);
    bus.publish("rtc-call-end", undefined);
    const ended = bus.published.find((p) => p.event === "rtc:call-ended");
    expect(ended).toBeDefined();
  });
});
