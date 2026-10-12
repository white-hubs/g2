import type { WarehouseSafetyClient } from "@g2-client/warehouse-safety/client";
import type { DomainModule } from "@g2-composition/contract";

import { initAuthStore } from "./api/auth-store";
import { installWarehouseSafetyContext } from "./domain-context";
import { hostWarehouseGemPage } from "./gem-page-host";
import { installWarehouseSafetyPcUi } from "./pc-ui-runtime";

const BASE = "/d/warehouse-safety";

const domain: DomainModule = {
  routes: [
    { path: BASE, name: "warehouse-safety-home", meta: { title: "仓储安全" }, redirect: `${BASE}/overView` },
    {
      path: `${BASE}/overView`,
      name: "warehouse-safety-overview",
      meta: { title: "仓储中心" },
      component: () => hostWarehouseGemPage("OverView", { pageProps: { title: "仓储中心" } }),
    },
    {
      path: `${BASE}/warehouses`,
      name: "warehouse-safety-warehouses",
      meta: { title: "仓库管理" },
      component: () => import("./views/resource-page/warehouse-page").then((m) => m.WarehousePage),
    },
    {
      path: `${BASE}/warehouses/create`,
      name: "warehouse-safety-warehouse-create",
      meta: { title: "新增仓库", hideInMenu: true, activeMenuPath: `${BASE}/warehouses` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "warehouse" },
    },
    {
      path: `${BASE}/warehouses/:id/edit`,
      name: "warehouse-safety-warehouse-edit",
      meta: { title: "编辑仓库", hideInMenu: true, activeMenuPath: `${BASE}/warehouses` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "warehouse" },
    },
    {
      path: `${BASE}/warehouses/:id`,
      name: "warehouse-safety-warehouse-detail",
      meta: { title: "仓库详情", hideInMenu: true, activeMenuPath: `${BASE}/warehouses` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "warehouse", mode: "detail" },
    },
    {
      path: `${BASE}/shelves`,
      name: "warehouse-safety-shelves",
      meta: { title: "货架管理" },
      component: () => import("./views/resource-page/shelf-page").then((m) => m.ShelfPage),
    },
    {
      path: `${BASE}/shelves/create`,
      name: "warehouse-safety-shelf-create",
      meta: { title: "新增区域", hideInMenu: true, activeMenuPath: `${BASE}/shelves` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "shelf" },
    },
    {
      path: `${BASE}/shelves/:id/edit`,
      name: "warehouse-safety-shelf-edit",
      meta: { title: "编辑区域", hideInMenu: true, activeMenuPath: `${BASE}/shelves` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "shelf" },
    },
    {
      path: `${BASE}/shelves/:id`,
      name: "warehouse-safety-shelf-detail",
      meta: { title: "区域详情", hideInMenu: true, activeMenuPath: `${BASE}/shelves` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "shelf", mode: "detail" },
    },
    {
      path: `${BASE}/forklifts`,
      name: "warehouse-safety-forklifts",
      meta: { title: "叉车管理" },
      component: () => import("./views/resource-page/forklift-page").then((m) => m.ForkliftPage),
    },
    {
      path: `${BASE}/forklifts/create`,
      name: "warehouse-safety-forklift-create",
      meta: { title: "新增叉车", hideInMenu: true, activeMenuPath: `${BASE}/forklifts` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "forklift" },
    },
    {
      path: `${BASE}/forklifts/:id/edit`,
      name: "warehouse-safety-forklift-edit",
      meta: { title: "编辑叉车", hideInMenu: true, activeMenuPath: `${BASE}/forklifts` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "forklift" },
    },
    {
      path: `${BASE}/forklifts/:id`,
      name: "warehouse-safety-forklift-detail",
      meta: { title: "叉车详情", hideInMenu: true, activeMenuPath: `${BASE}/forklifts` },
      component: () => import("./views/resource-form/resource-form").then((m) => m.ResourceFormPage),
      props: { type: "forklift", mode: "detail" },
    },
    {
      path: `${BASE}/equipmentMoitorList`,
      alias: `${BASE}/equipmentMonitorList`,
      name: "warehouse-safety-equipment-monitor",
      meta: { title: "设备监测" },
      component: () => hostWarehouseGemPage("EquipmentMonitorList", { pageProps: { title: "设备监测" } }),
    },
    {
      path: `${BASE}/equipmentMonitorDetail`,
      name: "warehouse-safety-equipment-detail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: `${BASE}/equipmentMoitorList` },
      component: () => hostWarehouseGemPage("EquipmentMonitorDetail", { idAs: "deviceId", pageProps: { title: "设备信息" } }),
    },
    {
      path: `${BASE}/forkliftMonitor`,
      alias: `${BASE}/forklift-monitor`,
      name: "warehouse-safety-forklift-monitor",
      meta: { title: "叉车监测" },
      component: () => import("./views/forklift-monitor/forklift-monitor").then((m) => m.ForkliftMonitor),
    },
    {
      path: `${BASE}/alarmRecord`,
      name: "warehouse-safety-alarm-record",
      meta: { title: "报警记录" },
      component: () => hostWarehouseGemPage("AlarmRecord"),
    },
    {
      path: `${BASE}/alarmDetail`,
      name: "warehouse-safety-alarm-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarmRecord` },
      component: () => hostWarehouseGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: `${BASE}/alarmConfigList`,
      name: "warehouse-safety-alarm-config",
      meta: { title: "报警配置" },
      component: () => hostWarehouseGemPage("AlarmConfigList"),
    },
    {
      path: `${BASE}/alarmConfigureAdd`,
      name: "warehouse-safety-alarm-config-form",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarmConfigList` },
      component: () => hostWarehouseGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
    },
    {
      path: `${BASE}/events`,
      name: "warehouse-safety-events",
      meta: { title: "事件档案" },
      component: () => import("./views/event-archive/event-archive").then((m) => m.EventArchive),
    },
    {
      path: `${BASE}/alarmStatistic`,
      name: "warehouse-safety-alarm-statistic",
      meta: { title: "报警统计" },
      component: () => hostWarehouseGemPage("AlarmStatistic", { pageProps: { mode: "status", title: "报警统计" } }),
    },
    {
      path: `${BASE}/alarmHandelStatistics`,
      name: "warehouse-safety-alarm-handle-statistic",
      meta: { title: "报警处理统计" },
      component: () => hostWarehouseGemPage("AlarmHandelStatistics"),
    },
    {
      path: `${BASE}/alarmAnalysis`,
      name: "warehouse-safety-alarm-analysis",
      meta: { title: "报警分析" },
      component: () => hostWarehouseGemPage("AlarmAnalysis"),
    },
    {
      path: `${BASE}/alarm/record`,
      name: "warehouse-safety-alarm-drill",
      meta: { title: "报警记录", hideInMenu: true, activeMenuPath: `${BASE}/alarmStatistic` },
      component: () => hostWarehouseGemPage("AlarmRecord"),
    },
    {
      path: `${BASE}/applicationEquipment`,
      name: "warehouse-safety-equipment",
      meta: { title: "仓储设备" },
      component: () => hostWarehouseGemPage("ApplicationEquipment", { pageProps: { title: "仓储设备" } }),
    },
  ],
  menuContribution: [
    {
      label: "仓储安全",
      iconKey: "warehouse-safety",
      children: [
        { label: "仓储中心", entry: "overView", path: `${BASE}/overView` },
        {
          label: "基础支持",
          children: [
            { label: "仓库管理", entry: "warehouses", path: `${BASE}/warehouses` },
            { label: "货架管理", entry: "shelves", path: `${BASE}/shelves` },
            { label: "叉车管理", entry: "forklifts", path: `${BASE}/forklifts` },
          ],
        },
        {
          label: "核心监测",
          children: [
            { label: "设备监测", entry: "equipmentMoitorList", path: `${BASE}/equipmentMoitorList` },
            { label: "叉车监测", entry: "forkliftMonitor", path: `${BASE}/forkliftMonitor` },
          ],
        },
        {
          label: "仓储报警",
          children: [
            { label: "报警记录", entry: "alarmRecord", path: `${BASE}/alarmRecord` },
            { label: "报警配置", entry: "alarmConfigList", path: `${BASE}/alarmConfigList` },
            { label: "事件档案", entry: "events", path: `${BASE}/events` },
          ],
        },
        {
          label: "统计分析",
          children: [
            { label: "报警统计", entry: "alarmStatistic", path: `${BASE}/alarmStatistic` },
            { label: "报警处理统计", entry: "alarmHandelStatistics", path: `${BASE}/alarmHandelStatistics` },
            { label: "报警分析", entry: "alarmAnalysis", path: `${BASE}/alarmAnalysis` },
          ],
        },
        { label: "仓储设备", entry: "applicationEquipment", path: `${BASE}/applicationEquipment` },
      ],
    },
  ],
  async install(_app, ctx, config) {
    await installWarehouseSafetyPcUi(ctx);
    await ctx.loadRuntimeCommon("pcIotSocket", "index");
    await Promise.all([
      ctx.loadPlatform("pcUi", "platform"),
      ctx.loadPlatform("pcChart", "platform"),
      ctx.loadPlatform("pcPlayer", "platform"),
      ctx.loadPlatform("pcMap", "platform"),
      ctx.loadPlatform("pcIotSocket", "platform"),
      ctx.loadPlatform("pcAlarmCharts", "platform"),
      ctx.loadPlatform("pcScada", "platform"),
      ctx.loadPlatform("pcGraphEditor", "platform"),
      ctx.loadPlatform("pcVisualSdk", "platform"),
    ]);
    const client = await ctx.ensureClient<WarehouseSafetyClient>("warehouseSafetyClient");
    installWarehouseSafetyContext(ctx, client, config);
    initAuthStore(ctx);
  },
};

export default domain;
