import type { EmergencySuppliesClient } from "@g2-client/emergency-supplies/client";
import type { DomainModule } from "@g2-composition/contract";

import { installEmergencySuppliesContext, installEmergencySuppliesPcUi } from "./domain-context";

const BASE = "/d/emergency-supplies";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "emergency-supplies-home",
      meta: { title: "应急物资" },
      redirect: `${BASE}/supplies-list`,
    },
    {
      path: `${BASE}/supplies-list`,
      name: "emergency-supplies-ledger",
      meta: { title: "物资台帐" },
      component: () => import("./views/supplies-list/supplies-list").then((module) => module.SuppliesList),
    },
    {
      path: `${BASE}/dispatch-order-list`,
      name: "emergency-supplies-dispatch-orders",
      meta: { title: "物资调用" },
      component: () => import("./views/dispatch-order-list/dispatch-order-list").then((module) => module.DispatchOrderList),
    },
    {
      path: `${BASE}/supplies-map`,
      name: "emergency-supplies-map",
      meta: { title: "物资分布图" },
      component: () => import("./views/supplies-map/supplies-map").then((module) => module.SuppliesMap),
    },
    {
      path: `${BASE}/warehouse-list`,
      name: "emergency-supplies-warehouses",
      meta: { title: "仓库管理" },
      component: () => import("./views/warehouse-list/warehouse-list").then((module) => module.WarehouseList),
    },
    {
      path: `${BASE}/supplies-type-list`,
      name: "emergency-supplies-types",
      meta: { title: "物资类别" },
      component: () => import("./views/supplies-type-list/supplies-type-list").then((module) => module.SuppliesTypeList),
    },
    {
      path: `${BASE}/warning-config`,
      name: "emergency-supplies-warning-config",
      meta: { title: "预警规则" },
      component: () => import("./views/warning-config/warning-config").then((module) => module.WarningConfig),
    },
  ],
  menuContribution: [
    {
      label: "应急物资",
      iconKey: "emergency-supplies",
      children: [
        { label: "物资台帐", entry: "wztz", path: `${BASE}/supplies-list` },
        { label: "物资调用", entry: "wzdy", path: `${BASE}/dispatch-order-list` },
        { label: "物资分布图", entry: "wzfbt", path: `${BASE}/supplies-map` },
        {
          label: "基础配置",
          entry: "jcpz",
          children: [
            { label: "仓库管理", entry: "ckgl", path: `${BASE}/warehouse-list` },
            { label: "物资类别", entry: "wzlb", path: `${BASE}/supplies-type-list` },
            { label: "预警规则", entry: "yjgz", path: `${BASE}/warning-config` },
          ],
        },
      ],
    },
  ],
  async install(_app, context) {
    installEmergencySuppliesPcUi(await context.loadRuntimeCommon<typeof import("@g2-platform/pc-ui")>("pcUi", "index"));
    await Promise.all([context.loadPlatform("pcUi", "platform"), context.loadPlatform("pcMap", "platform")]);
    const client = await context.ensureClient<EmergencySuppliesClient>("emergencySuppliesClient");
    installEmergencySuppliesContext(context, client);
  },
};

export default domainModule;
