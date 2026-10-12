import type { MaintenanceClient } from "@g2-client/maintenance/client";
import type { DomainModule } from "@g2-composition/contract";

import { installMaintenanceContext } from "./domain-context";
import { MAINTENANCE_BASE_PATH as BASE, resolveMaintenanceRuntime } from "./runtime";

const module: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/maintenance-plan` },
    {
      path: `${BASE}/maintenance-plan`,
      name: "maintenance-plan",
      meta: { title: "维保计划" },
      component: () => import("./views/maintenance-plan/plan-list").then((value) => value.MaintenancePlanList),
    },
    {
      path: `${BASE}/maintenance-task`,
      name: "maintenance-task",
      meta: { title: "维保任务" },
      component: () => import("./views/maintenance-task/task-list").then((value) => value.MaintenanceTaskList),
    },
    {
      path: `${BASE}/maintenance-item`,
      name: "maintenance-item",
      meta: { title: "维保项" },
      component: () => import("./views/maintenance-item/item-list").then((value) => value.MaintenanceItemList),
    },
    {
      path: `${BASE}/maintenance-statistics`,
      name: "maintenance-statistics",
      meta: { title: "维保统计" },
      component: () => import("./views/maintenance-statistics/statistics-list").then((value) => value.MaintenanceStatisticsList),
    },
    {
      path: `${BASE}/maintenance-plan-operate`,
      name: "maintenance-plan-operate",
      meta: { title: "维保计划操作", hideInMenu: true, activeMenuPath: `${BASE}/maintenance-plan` },
      component: () => import("./views/maintenance-plan/plan-operate").then((value) => value.MaintenancePlanOperate),
    },
    {
      path: `${BASE}/maintenance-task-details`,
      name: "maintenance-task-details",
      meta: { title: "维保任务详情", hideInMenu: true, activeMenuPath: `${BASE}/maintenance-task` },
      component: () => import("./views/maintenance-task/task-details").then((value) => value.MaintenanceTaskDetails),
    },
    {
      path: `${BASE}/maintenance-execute`,
      name: "maintenance-execute",
      meta: { title: "维保执行", hideInMenu: true, activeMenuPath: `${BASE}/maintenance-task` },
      component: () => import("./views/maintenance-task/maintenance-execute").then((value) => value.MaintenanceExecute),
    },
    {
      path: `${BASE}/message-notice`,
      name: "maintenance-message-notice",
      meta: { title: "消息配置", hideInMenu: true, activeMenuPath: `${BASE}/maintenance-item` },
      component: () => import("./views/message-notice/message-notice").then((value) => value.MaintenanceMessageNotice),
    },
  ],
  menuContribution: [
    {
      label: "维保作业",
      iconKey: "maintenance",
      children: [
        { label: "维保计划@", entry: "maintenance-plan", path: `${BASE}/maintenance-plan` },
        { label: "维保任务@", entry: "maintenance-task", path: `${BASE}/maintenance-task` },
        { label: "维保项", entry: "maintenance-item", path: `${BASE}/maintenance-item` },
        { label: "维保统计", entry: "maintenance-statistics", path: `${BASE}/maintenance-statistics` },
      ],
    },
  ],
  async install(_app, context, config) {
    await context.loadRuntimeCommon("pcUi", "index");
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<MaintenanceClient>("maintenanceClient");
    installMaintenanceContext(context, client, resolveMaintenanceRuntime({ applicationCode: config?.applicationCode, basePath: BASE }));
  },
};

export default module;
