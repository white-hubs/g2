import { createFakeBus } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { createAlarmPopupController, registerAlarmPopupHandlers } from "./handlers";

describe("registerAlarmPopupHandlers", () => {
  test("platform install subscribes bus events alarm-notice and headquarters-alarm", async () => {
    const bus = createFakeBus();
    const handled: string[] = [];
    const controller = {
      handleTenantAlarm: async () => {
        handled.push("tenant");
      },
      handleHeadquartersAlarm: async () => {
        handled.push("hq");
      },
    };
    registerAlarmPopupHandlers(bus, controller);
    bus.publish("alarm-notice", { businessKey: "bk-1" });
    bus.publish("headquarters-alarm", { businessPrincipal: JSON.stringify({ businessKey: "bk-h", marketTenant: "m1" }) });
    await Promise.resolve();
    expect(handled).toEqual(["tenant", "hq"]);
  });
});

describe("createAlarmPopupController", () => {
  test("tenant alarm opens tenant view and enriches queue", async () => {
    const bus = createFakeBus();
    const controller = createAlarmPopupController({
      bus,
      config: { intentCodes: ["DOORMANAGE"], showLocateButton: false },
      alarmCenter: {
        getAlarmDetails: async () => ({ applicationCode: "DOORMANAGE", alarmEventName: "门开" }),
        getVideoListByEventId: async () => [{ deviceId: "d1", deviceName: "Cam" }],
        getAlarmLevelPlayConfig: async () => ({}),
        getAlarmRecordDetail: async () => ({ alarmStatus: "OPEN" }),
      },
      headquartersMarket: {
        getMarketConfig: async () => ({ url: "https://hq.example.com", account: "a", password: "p" }),
      },
    });
    await controller.handleTenantAlarm({ businessKey: "bk-1", alarmEventName: "测试" });
    expect(controller.getView().mode).toBe("tenant");
    await Promise.resolve();
    await Promise.resolve();
    if (controller.getView().mode === "tenant") {
      expect(controller.getView().queue.items[0]?.applicationCode).toBe("DOORMANAGE");
    }
  });

  test("empty video API does not wipe push payload videoList", async () => {
    const bus = createFakeBus();
    const controller = createAlarmPopupController({
      bus,
      config: { intentCodes: ["DOORMANAGE"], showLocateButton: false },
      alarmCenter: {
        getAlarmDetails: async () => ({}),
        getVideoListByEventId: async () => [],
        getAlarmLevelPlayConfig: async () => ({}),
        getAlarmRecordDetail: async () => ({}),
      },
      headquartersMarket: {
        getMarketConfig: async () => ({}),
      },
    });
    await controller.handleTenantAlarm({
      businessKey: "bk-v",
      alarmEventName: "闯入",
      videoList: [{ deviceId: "cam-1", deviceName: "枪机" }],
    });
    await Promise.resolve();
    await Promise.resolve();
    const view = controller.getView();
    expect(view.mode).toBe("tenant");
    if (view.mode === "tenant") {
      expect(view.queue.items[0]?.videoList).toEqual([{ deviceId: "cam-1", deviceName: "枪机" }]);
    }
  });

  test("headquarters alarm builds iframe view", async () => {
    const bus = createFakeBus();
    const controller = createAlarmPopupController({
      bus,
      config: { intentCodes: [], showLocateButton: false },
      alarmCenter: {
        getAlarmDetails: async () => ({}),
        getVideoListByEventId: async () => [],
        getAlarmLevelPlayConfig: async () => ({}),
        getAlarmRecordDetail: async () => ({}),
      },
      headquartersMarket: {
        getMarketConfig: async () => ({
          url: "https://market.test",
          account: "id",
          password: "sec",
          marketName: "测试市场",
        }),
      },
    });
    await controller.handleHeadquartersAlarm({
      businessPrincipal: JSON.stringify({ businessKey: "bk-hq", marketTenant: "tenant-1" }),
    });
    const view = controller.getView();
    expect(view.mode).toBe("headquarters");
    if (view.mode === "headquarters") {
      expect(view.iframeUrl).toBe("https://market.test/apps/@ghcloud/cube-alarm-modal?client_id=id&client_secret=sec&businessKey=bk-hq");
      expect(view.alarmDetails.applicationName).toBe("测试市场");
    }
  });

  test("refreshAudioForAlarm loads level config when turnWarningSound is true", async () => {
    const bus = createFakeBus();
    const controller = createAlarmPopupController({
      bus,
      config: { intentCodes: [], showLocateButton: false },
      alarmCenter: {
        getAlarmDetails: async () => ({}),
        getVideoListByEventId: async () => [],
        getAlarmLevelPlayConfig: async () => ({
          file: { path: "/custom/alarm.mp3" },
          looped: true,
          playNum: 5,
        }),
        getAlarmRecordDetail: async () => ({}),
      },
      headquartersMarket: {
        getMarketConfig: async () => ({}),
      },
    });
    await controller.refreshAudioForAlarm({
      businessKey: "bk-1",
      turnWarningSound: true,
      alarmLevelCode: "one_level",
    });
    const audio = controller.getAudioState();
    expect(audio.shouldPlay).toBe(true);
    expect(audio.looped).toBe(true);
    expect(audio.playNum).toBe(5);
    expect(audio.audioUrl).toContain("/custom/alarm.mp3");
  });

  test("one_level default plays when turnWarningSound is null", async () => {
    const bus = createFakeBus();
    const controller = createAlarmPopupController({
      bus,
      config: { intentCodes: [], showLocateButton: false },
      alarmCenter: {
        getAlarmDetails: async () => ({}),
        getVideoListByEventId: async () => [],
        getAlarmLevelPlayConfig: async () => ({}),
        getAlarmRecordDetail: async () => ({}),
      },
      headquartersMarket: {
        getMarketConfig: async () => ({}),
      },
    });
    await controller.refreshAudioForAlarm({
      businessKey: "bk-2",
      turnWarningSound: null,
      alarmLevelCode: "one_level",
    });
    expect(controller.getAudioState().shouldPlay).toBe(true);
  });
});
