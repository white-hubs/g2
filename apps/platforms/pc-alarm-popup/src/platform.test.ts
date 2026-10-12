import { createFakeApp, createFakeBus, createFakePlatformContext, createFakeRouter } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { createAlarmPopupInstall } from "./platform-install";

describe("pc-alarm-popup platform install", () => {
  test("install subscribes alarm-notice and headquarters-alarm on bus", async () => {
    const bus = createFakeBus();
    const loaded: string[] = [];
    const subscribed: string[] = [];
    const originalSubscribe = bus.subscribe.bind(bus);
    bus.subscribe = (event, handler) => {
      subscribed.push(event);
      return originalSubscribe(event, handler);
    };

    let mounted = false;
    const install = createAlarmPopupInstall({
      mountOverlay: () => {
        mounted = true;
      },
      loadPlayer: async () => ({}),
      loadCharts: async () => ({}),
    });

    const ctx = createFakePlatformContext({
      bus,
      loadRuntimeCommon: async <T>(name: string, exposedPath: string): Promise<T> => {
        loaded.push(`runtime:${name}:${exposedPath}`);
        const module =
          name === "pcUi"
            ? {
                Button: {},
                Space: {},
                TabPane: {},
                Tabs: {},
                Tag: {},
                message: { error: () => undefined },
              }
            : {};
        return module as T;
      },
      ensureClient: async <T>(name: string): Promise<T> => {
        if (name === "alarmCenterClient") {
          return {
            getAlarmDetails: async () => ({}),
            getVideoListByEventId: async () => [],
            getAlarmLevelPlayConfig: async () => ({}),
            getAlarmRecordDetail: async () => ({}),
          } as T;
        }
        if (name === "headquartersMarketClient") {
          return { getMarketConfig: async () => ({ url: "https://hq.test", account: "a", password: "p" }) } as T;
        }
        throw new Error(`unexpected client ${name}`);
      },
    });

    await install(createFakeApp(), createFakeRouter(), ctx, {
      intentCodes: ["DOORMANAGE", "ACCESS_CONTROL"],
      showLocateButton: false,
    });

    expect(subscribed).toContain("alarm-notice");
    expect(subscribed).toContain("headquarters-alarm");
    expect(mounted).toBe(true);
    expect(loaded[0]).toBe("runtime:pcUi:index");
  });
});
