import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { FireManagementClient } from "@g2-client/fire-management/client";
import { createFakeDomainContext } from "@g2-composition/contract";
import { ZhConfigProvider } from "@g2-platform/pc-ui";
import { createApp, h } from "vue";
import { RouterView, createRouter, createWebHistory } from "vue-router";

import domain from "../../src/domain";

const calls: string[] = [];
const page = (records: unknown[] = []) => ({ records, total: records.length, pageNumber: 1, pageSize: 10 });
const host = {
  id: "host-1",
  deviceName: "1#消防主机",
  name: "1#消防主机",
  code: "XFZJ-1#",
  deviceCode: "XFZJ-1#",
  productName: "消防主机",
  brandName: "海湾",
  status: "ONLINE",
  onlineStatus: 1,
};
const device = {
  id: "device-1",
  deviceId: "device-1",
  deviceName: "1_购物广场1F感烟探测器_8",
  areaName: "海鲜广场-海鲜广场1层",
  deviceStatus: true,
  collection: false,
  deviceProdId: "prod-1",
  picture: null,
  devicePropWithTsDTOS: [{ key: "pointStatus", translatedValue: "无事件", unitName: "" }],
};
const client = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "then") return undefined;
      return async () => {
        const method = String(property);
        calls.push(method);
        if (method === "listFireDevices") return page([device]);
        if (["listFireHosts", "listFireManageDevicePage", "listFireHostOverviews"].includes(method)) return page([host]);
        if (method === "getFireManageStats") return { hostCount: 2, pointCount: 40, todayAlarmCount: 0, todayFaultCount: 0 };
        if (method === "getFirePointEventOptions") return [];
        if (
          [
            "listFirePoints",
            "listFirePointEvents",
            "listFirePointEventStatistics",
            "listOperationLogs",
            "listEvents",
            "listFireHostAlarmRecords",
            "listFireControlPoints",
            "listFireHostMonitorDevices",
            "listFireHostMonitorDeviceCandidates",
            "listFireUtilityDeviceCandidates",
          ].includes(method)
        )
          return page([]);
        if (
          [
            "listFireHostButtons",
            "listFireHostMethods",
            "listFireUtilityMonitorCards",
            "listFireUtilityDeviceProperties",
            "getProductModelList",
            "getDeviceNameList",
          ].includes(method)
        )
          return [];
        if (method === "getFireUtilityPanel") return null;
        if (method === "getFireHostIndicatorLightConfig") return { fireManageDeviceId: "host-1", indicatorCount: 3, indicatorButtons: [] };
        return undefined;
      };
    },
  },
) as FireManagementClient;

const deviceClient = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "then") return undefined;
      return async (...args: unknown[]) => {
        const method = String(property);
        calls.push(method);
        if (method === "getAreaTree")
          return [{ id: "area-1", name: "海鲜广场", deviceNum: 1402, children: [{ id: "floor-1", name: "海鲜广场1层", deviceNum: 483 }] }];
        if (method === "getStatusList")
          return {
            statusListVos: [
              { name: "ONLINE", num: 12 },
              { name: "OFFLINE", num: 1 },
            ],
          };
        if (method === "getApplicationGenreVo")
          return [{ deviceProdCategoryCodeConcat: "fire", deviceProdCategoryName: "消防设备", num: 13 }];
        if (method === "getDeviceCollection") return [device];
        if (method === "getApplicationModels") return [{ deviceProdId: "prod-1", deviceProdName: "感烟探测器" }];
        if (method === "getDevicePanelConfigList")
          return [{ businessKey: "prod-1", panelConfig: JSON.stringify([{ propCode: "pointStatus", propName: "点位状态" }]) }];
        if (method === "getDeviceMonitoringPage") return page([device]);
        if (method === "getDeviceAssociatedVideos") return [];
        if (method === "getDeviceInfo") return { id: "device-1", deviceName: device.deviceName, productInfo: { id: "prod-1" } };
        if (method === "getDeviceProperties") return [];
        if (method === "addDeviceCollection") return undefined;
        return args[0];
      };
    },
  },
) as DeviceCenterClient;

declare global {
  interface Window {
    apiCalls: string[];
  }
}
globalThis.apiCalls = calls;
const context = createFakeDomainContext({
  loadPlatform: async () => ({}),
  ensureClient: async <T>(name: string) => (name === "deviceCenterClient" ? deviceClient : client) as T,
  loadPageLibrary: async <T>(_library: string, exposedPath: string) => {
    if (exposedPath === "contractInfo") return { contractInfo: { major: 1 } } as T;
    if (exposedPath === "EquipmentMonitorList")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/equipment-monitor-list")) as T;
    if (exposedPath === "EquipmentMonitorDetail")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/equipment-monitor-detail")) as T;
    if (exposedPath === "AlarmRecord")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/alarm-record")) as T;
    if (exposedPath === "AlarmDetail")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/alarm-detail")) as T;
    if (exposedPath === "AlarmConfigList")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/alarm-config-list")) as T;
    if (exposedPath === "AlarmConfigureAdd")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/alarm-configure-add")) as T;
    if (exposedPath === "AlarmStatistic")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/alarm-statistic")) as T;
    if (exposedPath === "OverView") return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/over-view")) as T;
    if (exposedPath === "MessageNotice")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/message-notice")) as T;
    if (exposedPath === "ApplicationEquipment")
      return (await import("../../../../page-libraries/generic-equipment-monitor/src/pages/application-equipment")) as T;
    throw new Error(`unexpected page library path: ${exposedPath}`);
  },
});
const router = createRouter({ history: createWebHistory(), routes: domain.routes });
const app = createApp({ render: () => h(ZhConfigProvider, null, () => h(RouterView)) });
await domain.install?.(app, context, {});
app.use(router);
await router.isReady();
app.mount("#app");
