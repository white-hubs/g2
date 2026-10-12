import type { PlatformContext, PlatformInstall } from "@g2-composition/contract";
import type { Component } from "vue";

import {
  createAlarmPopupController,
  registerAlarmPopupHandlers,
  type AlarmCenterApi,
  type AlarmPopupConfig,
  type DeviceCenterApi,
} from "./handlers";
import { buildAlarmChartComponentMap } from "./model/alarm-chart-map";
import type { OverlayRuntimeDeps } from "./overlay/types";
import { installPcAlarmPopupPcUi } from "./pc-ui-runtime";

export function readAlarmPopupConfig(raw?: Record<string, unknown>): AlarmPopupConfig {
  const intentCodes = Array.isArray(raw?.intentCodes) ? raw.intentCodes.filter((c): c is string => typeof c === "string") : [];
  return {
    intentCodes,
    showLocateButton: raw?.showLocateButton === true,
  };
}

export type AlarmPopupInstallDeps = {
  mountOverlay: (deps: OverlayRuntimeDeps) => void;
  loadPlayer?: PlatformContext["loadPlatform"];
  loadCharts?: PlatformContext["loadPlatform"];
};

export function createAlarmPopupInstall(deps: AlarmPopupInstallDeps): PlatformInstall {
  return async (_app, _router, ctx, config) => {
    await installPcAlarmPopupPcUi(ctx);
    const popupConfig = readAlarmPopupConfig(config);
    const alarmCenter = (await ctx.ensureClient("alarmCenterClient")) as AlarmCenterApi;
    let deviceCenter: DeviceCenterApi | undefined;
    try {
      deviceCenter = (await ctx.ensureClient("deviceCenterClient")) as DeviceCenterApi;
    } catch {
      // optional for snapshot charts
    }
    const headquartersMarket = (await ctx.ensureClient("headquartersMarketClient")) as {
      getMarketConfig: (id: string) => Promise<Record<string, unknown>>;
    };

    const controller = createAlarmPopupController({
      bus: ctx.bus,
      alarmCenter,
      headquartersMarket,
      config: popupConfig,
    });

    registerAlarmPopupHandlers(ctx.bus, controller);

    let CubePlayer: Component | undefined;
    let AlarmChartComponents: Record<string, Component> | undefined;
    const loadPlatform = deps.loadPlayer ?? ctx.loadPlatform;
    const loadCharts = deps.loadCharts ?? ctx.loadRuntimeCommon;
    try {
      const playerModule = (await loadPlatform("pcPlayer", "index")) as { CubePlayer?: Component };
      CubePlayer = playerModule.CubePlayer;
    } catch {
      // optional
    }
    try {
      const chartsModule = (await loadCharts("pcAlarmCharts", "index")) as Record<string, Component>;
      AlarmChartComponents = buildAlarmChartComponentMap(chartsModule);
    } catch {
      // optional
    }

    deps.mountOverlay({
      controller,
      bus: ctx.bus,
      intentCodes: popupConfig.intentCodes,
      showLocateButton: popupConfig.showLocateButton,
      CubePlayer,
      AlarmChartComponents,
      deviceCenter,
    });
  };
}
