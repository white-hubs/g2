import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { registerMessagingHandlers } from "./handlers";

describe("registerMessagingHandlers", () => {
  test("订阅 terminal-message 事件，收到后发布 notification:show 供 UI 层消费", () => {
    const bus = createFakeBus();
    registerMessagingHandlers(bus);
    bus.publish("terminal-message", { applicationName: "示例应用", msgContent: "你有新消息" });
    const shown = bus.published.find((p) => p.event === "notification:show");
    expect(shown?.payload).toMatchObject({ title: "示例应用", description: "你有新消息" });
  });

  test("ALARM_NOTICE 无 marketTenant → 发布 alarm-notice（租户弹窗）", () => {
    const bus = createFakeBus();
    registerMessagingHandlers(bus);
    const alarm = {
      applicationCode: "DOORMANAGE",
      businessKey: "bk-1",
      id: "a-1",
      alarmTargetKey: "dev-1",
    };
    bus.publish("message-socket:payload", {
      msgType: "NOTICE_MESSAGE",
      eventDataDTO: {
        data: {
          msgType: "ALARM_NOTICE",
          businessPrincipal: JSON.stringify(alarm),
        },
      },
    });
    const notice = bus.published.find((p) => p.event === "alarm-notice");
    expect(notice?.payload).toMatchObject(alarm);
    expect(bus.published.some((p) => p.event === "headquarters-alarm")).toBe(false);
  });

  test("ALARM_NOTICE 有 marketTenant → 发布 headquarters-alarm（总部弹窗）", () => {
    const bus = createFakeBus();
    registerMessagingHandlers(bus);
    const alarm = {
      applicationCode: "FIRECONTROL",
      businessKey: "bk-hq",
      marketTenant: "market-9",
    };
    const msgData = {
      msgType: "ALARM_NOTICE",
      businessPrincipal: JSON.stringify(alarm),
    };
    bus.publish("message-socket:payload", {
      msgType: "NOTICE_MESSAGE",
      eventDataDTO: { data: msgData },
    });
    const hq = bus.published.find((p) => p.event === "headquarters-alarm");
    expect(hq?.payload).toMatchObject(msgData);
    expect(bus.published.some((p) => p.event === "alarm-notice")).toBe(false);
  });
});
