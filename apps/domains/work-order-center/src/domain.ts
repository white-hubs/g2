import type { WorkOrderCenterClient as ClientContract } from "@g2-client/work-order-center/client";
import type { DomainModule } from "@g2-composition/contract";

import { installWorkOrderCenterDateApi } from "./date-runtime";
import { installWorkOrderCenterContext } from "./domain-context";

const BASE = "/d/work-order-center";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "work-order-center-home",
      meta: { title: "工单中心" },
      redirect: `${BASE}/work-order-list`,
    },
    {
      path: `${BASE}/work-order-list`,
      name: "work-order-center-list",
      meta: { title: "工单删除" },
      component: () => import("./views/work-order-list").then((module) => module.WorkOrderList),
    },
    {
      path: `${BASE}/work-order-statistics`,
      name: "work-order-center-statistics",
      meta: { title: "工单统计" },
      component: () => import("./views/work-order-statistics").then((module) => module.WorkOrderStatistics),
    },
  ],
  menuContribution: [
    {
      label: "工单中心",
      iconKey: "work-order-center",
      children: [
        { label: "工单删除", entry: "gdsc", path: `${BASE}/work-order-list` },
        { label: "工单统计", entry: "work-order-statistics", path: `${BASE}/work-order-statistics` },
      ],
    },
  ],
  async install(_app, context) {
    await installWorkOrderCenterDateApi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<ClientContract>("workOrderCenterClient");
    installWorkOrderCenterContext(context, client);
  },
};

export default domainModule;
