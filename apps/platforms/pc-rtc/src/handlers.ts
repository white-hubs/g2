import type { EventBus } from "@g2-composition/contract";

/** RTC 只留融合通讯；报警弹窗见 `@g2-platform/pc-alarm-popup`（ADR-0062）。 */
export function registerRtcHandlers(bus: EventBus): void {
  bus.subscribe("rtc-call-received", (payload) => {
    bus.publish("rtc:incoming-call", payload);
  });

  bus.subscribe("rtc-call-end", () => {
    bus.publish("rtc:call-ended", undefined);
  });
}
