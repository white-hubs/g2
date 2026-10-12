import type { FireManagementClient } from "@g2-client/fire-management/client";
import type { DomainModule } from "@g2-composition/contract";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY, installFireManagementContext } from "./domain-context";
import { hostFireManagementGemPage } from "./gem-page-host";
import { installFireManagementPcUi } from "./pc-ui-runtime";

import "./assets/font-awesome.css";
import "./assets/fire-management-common.css";

const BASE = "/d/fire-management";

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "fire-management-home",
      meta: { title: "消防主机远程控制" },
      redirect: `${BASE}/fire-host-control`,
    },
    {
      path: `${BASE}/fire-host-config`,
      name: "fire-host-config",
      meta: { title: "消防主机配置" },
      component: () => import("./views/fire-host-config/fire-host-config").then((m) => m.FireHostConfig),
    },
    {
      path: `${BASE}/fire-device-list`,
      name: "fire-device-list",
      meta: { title: "设备监测" },
      component: () => hostFireManagementGemPage("EquipmentMonitorList", { pageProps: { title: "设备监测" } }),
    },
    {
      path: `${BASE}/fire-device-detail`,
      name: "fire-device-detail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: `${BASE}/fire-device-list` },
      component: () => hostFireManagementGemPage("EquipmentMonitorDetail", { idAs: "deviceId", pageProps: { title: "设备信息" } }),
    },
    {
      path: `${BASE}/alarm-record`,
      name: "fire-alarm-record",
      meta: { title: "报警记录" },
      component: () => hostFireManagementGemPage("AlarmRecord", { pageProps: { title: "报警记录" } }),
    },
    {
      path: `${BASE}/alarm-detail`,
      name: "fire-alarm-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarm-record` },
      component: () => hostFireManagementGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: `${BASE}/alarm-config`,
      name: "fire-alarm-config",
      meta: { title: "报警配置" },
      component: () => hostFireManagementGemPage("AlarmConfigList", { pageProps: { title: "报警配置" } }),
    },
    {
      path: `${BASE}/alarm-config/edit`,
      name: "fire-alarm-config-edit",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarm-config` },
      component: () => hostFireManagementGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
    },
    {
      path: `${BASE}/alarm-handle-statistics`,
      name: "fire-alarm-handle-statistics",
      meta: { title: "处理统计" },
      component: () => hostFireManagementGemPage("AlarmStatistic", { pageProps: { mode: "user", title: "处理统计" } }),
    },
    {
      path: `${BASE}/fire-analysis`,
      name: "fire-analysis",
      meta: { title: "消防分析" },
      component: () => hostFireManagementGemPage("AlarmStatistic", { pageProps: { mode: "event", title: "消防分析" } }),
    },
    {
      path: `${BASE}/overview`,
      name: "fire-overview",
      meta: { title: "数据总览" },
      component: () => hostFireManagementGemPage("OverView", { pageProps: { title: "数据总览" } }),
    },
    {
      path: `${BASE}/alarm-statistic`,
      name: "fire-alarm-statistic",
      meta: { title: "报警统计" },
      component: () => hostFireManagementGemPage("AlarmStatistic", { pageProps: { mode: "status", title: "报警统计" } }),
    },
    {
      path: `${BASE}/message-notice`,
      name: "fire-message-notice",
      meta: { title: "消息配置" },
      component: () => hostFireManagementGemPage("MessageNotice", { pageProps: { title: "消息配置", notificationSubject: "消防报警" } }),
    },
    {
      path: `${BASE}/equipment-association`,
      name: "fire-equipment-association",
      meta: { title: "设备关联" },
      component: () => hostFireManagementGemPage("ApplicationEquipment", { pageProps: { title: "设备关联" } }),
    },
    {
      path: `${BASE}/fire-host-control`,
      name: "fire-host-control",
      meta: { title: "消防主机远程控制" },
      component: () => import("./views/fire-host-control/fire-host-control").then((m) => m.FireHostControl),
    },
    {
      path: `${BASE}/fire-point-management`,
      name: "fire-point-management",
      meta: { title: "消防配置管理" },
      component: () => import("./views/fire-point-management/fire-point-management").then((m) => m.FirePointManagement),
    },
    {
      path: `${BASE}/fire-point-statistics`,
      name: "fire-point-statistics",
      meta: { title: "点位统计" },
      component: () => import("./views/point-statistics/point-statistics").then((m) => m.PointStatistics),
    },
    {
      path: `${BASE}/fire-event-records`,
      name: "fire-event-records",
      meta: { title: "事件记录" },
      component: () => import("./views/event-records/event-records").then((m) => m.EventRecords),
    },
    {
      path: `${BASE}/fire-operation-records`,
      name: "fire-operation-records",
      meta: { title: "操作记录" },
      component: () => import("./views/operation-records/operation-records").then((m) => m.OperationRecords),
    },
  ],
  menuContribution: [
    {
      label: "消防管理",
      iconKey: "fire-management",
      children: [
        { label: "设备监测", entry: "fire-device-list", path: `${BASE}/fire-device-list` },
        {
          label: "主机管理",
          children: [
            { label: "主机配置", entry: "fire-host-config", path: `${BASE}/fire-host-config` },
            { label: "远程控制", entry: "fire-host-control", path: `${BASE}/fire-host-control` },
          ],
        },
        {
          label: "消防报警",
          children: [
            { label: "报警记录", entry: "fire-alarm-record", path: `${BASE}/alarm-record` },
            { label: "报警配置", entry: "fire-alarm-config", path: `${BASE}/alarm-config` },
          ],
        },
        {
          label: "统计分析",
          children: [
            { label: "处理统计", entry: "fire-alarm-handle-statistics", path: `${BASE}/alarm-handle-statistics` },
            { label: "消防分析", entry: "fire-analysis", path: `${BASE}/fire-analysis` },
            { label: "数据总览", entry: "fire-overview", path: `${BASE}/overview` },
            { label: "报警统计", entry: "fire-alarm-statistic", path: `${BASE}/alarm-statistic` },
          ],
        },
        {
          label: "业务配置",
          children: [
            { label: "消息配置", entry: "fire-message-notice", path: `${BASE}/message-notice` },
            { label: "设备关联", entry: "fire-equipment-association", path: `${BASE}/equipment-association` },
          ],
        },
      ],
    },
  ],
  async install(app, ctx, config) {
    await installFireManagementPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcPlayer", "platform");
    const client = await ctx.ensureClient<FireManagementClient>("fireManagementClient");
    const applicationCode = typeof config?.applicationCode === "string" && config.applicationCode ? config.applicationCode : "FIRECONTROL";
    installFireManagementContext(ctx, client, applicationCode);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, applicationCode);
  },
};

export default domainModule;
