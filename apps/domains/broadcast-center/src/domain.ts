import type { DomainModule } from "@g2-composition/contract";
import type { BroadcastCenterClient } from "@g2-contract/broadcast-center";

import { DOMAIN_CONTEXT_KEY, installBroadcastCenterContext } from "./domain-context";
import { hostBroadcastCenterGemPage } from "./gem-page-host";
import { installBroadcastCenterPcUi } from "./pc-ui-runtime";

import "./assets/style.css";

export const BASE = "/d/broadcast-center";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "broadcast-center-home",
      meta: { title: "广播中心" },
      redirect: `${BASE}/equipment-monitor`,
    },
    {
      path: `${BASE}/equipment-monitor`,
      name: "broadcast-equipment-monitor",
      meta: { title: "设备监测" },
      component: () => hostBroadcastCenterGemPage("EquipmentMonitorList", { pageProps: { title: "设备监测" } }),
    },
    {
      path: `${BASE}/equipment-monitor-detail`,
      name: "broadcast-equipment-monitor-detail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: `${BASE}/equipment-monitor` },
      component: () => hostBroadcastCenterGemPage("EquipmentMonitorDetail", { idAs: "deviceId", pageProps: { title: "设备信息" } }),
    },
    {
      path: `${BASE}/broadcast-template`,
      name: "broadcast-template",
      meta: { title: "广播模板" },
      component: () => import("./views/broadcast-template/broadcast-template").then((m) => m.BroadcastTemplate),
    },
    {
      path: `${BASE}/broadcast-record`,
      name: "broadcast-record",
      meta: { title: "广播记录" },
      component: () => import("./views/broadcast-center-record/broadcast-center-record").then((m) => m.BroadcastCenterRecord),
    },
    {
      path: `${BASE}/broadcast-rule-list`,
      name: "broadcast-rule-list",
      meta: { title: "广播规则" },
      component: () => import("./views/broadcast-center-rule-list/broadcast-center-rule-list").then((m) => m.BroadcastCenterRuleList),
    },
    {
      path: `${BASE}/broadcast-rule-details`,
      name: "broadcast-rule-details",
      meta: { title: "基础信息", hideInMenu: true, activeMenuPath: `${BASE}/broadcast-rule-list` },
      component: () => import("./views/broadcast-center-rule-list/broadcast-center-rule-details").then((m) => m.BroadcastCenterRuleDetails),
    },
    {
      path: `${BASE}/application-equipment`,
      name: "broadcast-application-equipment",
      meta: { title: "广播设备" },
      component: () => hostBroadcastCenterGemPage("ApplicationEquipment", { pageProps: { title: "广播设备" } }),
    },
  ],
  menuContribution: [
    {
      label: "广播中心",
      iconKey: "broadcast-center",
      children: [
        { label: "设备监测", entry: "equipment-monitor", path: `${BASE}/equipment-monitor` },
        { label: "广播记录", entry: "broadcast-record", path: `${BASE}/broadcast-record` },
        { label: "广播模板", entry: "broadcast-template", path: `${BASE}/broadcast-template` },
        { label: "广播规则", entry: "broadcast-rule-list", path: `${BASE}/broadcast-rule-list` },
        { label: "广播设备", entry: "application-equipment", path: `${BASE}/application-equipment` },
      ],
    },
  ],
  async install(app, ctx, config) {
    await installBroadcastCenterPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcPlayer", "platform");
    const client = await ctx.ensureClient<BroadcastCenterClient>("broadcastCenterClient");
    const applicationCode =
      typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "BROADCASTCENTER";
    installBroadcastCenterContext(ctx, client, applicationCode);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domainModule;
