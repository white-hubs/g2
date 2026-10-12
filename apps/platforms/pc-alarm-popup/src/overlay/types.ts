import type { Component } from "vue";

import type { AlarmPopupController, DeviceCenterApi } from "../handlers";

export type OverlayRuntimeDeps = {
  controller: AlarmPopupController;
  bus: import("@g2-composition/contract").EventBus;
  intentCodes: string[];
  showLocateButton: boolean;
  CubePlayer?: Component;
  AlarmChartComponents?: Record<string, Component>;
  deviceCenter?: DeviceCenterApi;
};
