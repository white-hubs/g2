import type { EmergencyDispatchClient } from "@g2-client/emergency-dispatch/client";
import type { DomainModule } from "@g2-composition/contract";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY, installEmergencyDispatchContext } from "./domain-context";
import { hostEmergencyDispatchGemPage } from "./gem-page-host";
import { installEmergencyDispatchPcUi } from "./pc-ui-runtime";

import "./assets/style.less";

const BASE = "/d/emergency-dispatch";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "emergency-dispatch-home",
      meta: { title: "应急指挥" },
      redirect: `${BASE}/evacuation-command`,
    },
    {
      path: `${BASE}/resource-list`,
      name: "emergency-resource-list",
      meta: { title: "资源管理" },
      component: () => import("./views/resource-list").then((m) => m.ResourceList),
    },
    {
      path: `${BASE}/evacuation-route-config`,
      name: "emergency-evacuation-route-config",
      meta: { title: "路线配置" },
      component: () => import("./views/evacuation-route-config").then((m) => m.EvacuationRouteConfig),
    },
    {
      path: `${BASE}/evacuation-command`,
      name: "emergency-evacuation-command",
      meta: { title: "疏散指挥" },
      component: () => import("./views/evacuation-command").then((m) => m.EvacuationCommand),
    },
    {
      path: `${BASE}/equipment-association`,
      name: "emergency-equipment-association",
      meta: { title: "设备关联" },
      component: () => hostEmergencyDispatchGemPage("EquipmentAssociation", { title: "设备关联" }),
    },
  ],
  menuContribution: [
    {
      label: "应急指挥",
      iconKey: "emergency-dispatch",
      children: [
        {
          label: "疏散引导",
          children: [
            { label: "疏散指挥", entry: "evacuation-command", path: `${BASE}/evacuation-command` },
            { label: "路线配置", entry: "evacuation-route-config", path: `${BASE}/evacuation-route-config` },
          ],
        },
        { label: "资源管理", entry: "resource-list", path: `${BASE}/resource-list` },
        { label: "设备关联", entry: "equipment-association", path: `${BASE}/equipment-association` },
      ],
    },
  ],
  async install(app, ctx, config) {
    await installEmergencyDispatchPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcMap", "platform");
    await ctx.loadPlatform("pcPlayer", "platform");
    const client = await ctx.ensureClient<EmergencyDispatchClient>("emergencyDispatchClient");
    const applicationCode =
      typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "emergency-dispatch";
    installEmergencyDispatchContext(ctx, client, applicationCode);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, applicationCode);
  },
};

export default domainModule;
