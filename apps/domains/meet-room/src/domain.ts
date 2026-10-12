import type { MeetRoomClient } from "@g2-client/meet-room/client";
import type { DomainModule } from "@g2-composition/contract";

import { installMeetRoomContext, installMeetRoomPcChart } from "./domain-context";
import { hostMeetRoomGemPage } from "./gem-page-host";
import { installMeetRoomPcUi } from "./pc-ui-runtime";

const BASE = "/d/meet-room";

const domain: DomainModule = {
  routes: [
    { path: BASE, name: "meet-room-home", meta: { title: "会议室管理" }, redirect: `${BASE}/meet-room` },
    {
      path: `${BASE}/meet-room`,
      name: "meet-room-list",
      meta: { title: "会议室" },
      component: () => import("./views/meet-room-page").then((module) => module.MeetRoomPage),
    },
    {
      path: `${BASE}/equipmentMoitorList`,
      name: "meet-room-equipment-monitor",
      meta: { title: "智能设备监测" },
      component: () => hostMeetRoomGemPage("EquipmentMonitorList"),
    },
    {
      path: `${BASE}/equipmentMoitorDetail`,
      name: "meet-room-equipment-detail",
      meta: { title: "设备详情", hideInMenu: true, activeMenuPath: `${BASE}/equipmentMoitorList` },
      component: () => hostMeetRoomGemPage("EquipmentMonitorDetail"),
    },
    {
      path: `${BASE}/reservation`,
      name: "meet-room-reservation",
      meta: { title: "会议室预约" },
      component: () => import("./views/reservation-page").then((module) => module.ReservationPage),
    },
    {
      path: `${BASE}/reservation-log`,
      name: "meet-room-reservation-log",
      meta: { title: "预约记录" },
      component: () => import("./views/reservation-log-page").then((module) => module.ReservationLogPage),
    },
    {
      path: `${BASE}/reservation-statistics`,
      name: "meet-room-reservation-statistics",
      meta: { title: "预约分析" },
      component: () => import("./views/statistics-page").then((module) => module.ReservationStatisticsPage),
    },
    {
      path: `${BASE}/applicationEquipment`,
      name: "meet-room-application-equipment",
      meta: { title: "智能设备" },
      component: () => hostMeetRoomGemPage("ApplicationEquipment"),
    },
    {
      path: `${BASE}/meet-goods`,
      name: "meet-room-goods",
      meta: { title: "会议物品" },
      component: () => import("./views/goods-page").then((module) => module.MeetGoodsPage),
    },
    {
      path: `${BASE}/meet-type`,
      name: "meet-room-meeting-type",
      meta: { title: "会议类型" },
      component: () => import("./views/type-page").then((module) => module.MeetTypePage),
    },
    {
      path: `${BASE}/field-settings`,
      name: "meet-room-field-settings",
      meta: { title: "字段设置" },
      component: () => import("./views/field-settings-page").then((module) => module.FieldSettingsPage),
    },
    {
      path: `${BASE}/meet-screen-set`,
      name: "meet-room-screen-settings",
      meta: { title: "会议屏展示设置" },
      component: () => import("./views/screen-settings-page").then((module) => module.ScreenSettingsPage),
    },
    {
      path: `${BASE}/meet-room-type`,
      name: "meet-room-room-type",
      meta: { title: "会议室类型" },
      component: () => import("./views/type-page").then((module) => module.MeetRoomTypePage),
    },
  ],
  menuContribution: [
    {
      label: "会议室管理",
      iconKey: "meeting-room",
      children: [
        { label: "会议室", entry: "hys", path: `${BASE}/meet-room` },
        { label: "智能设备监测", entry: "sbgl", path: `${BASE}/equipmentMoitorList` },
        { label: "会议室预约", entry: "hysyy", path: `${BASE}/reservation` },
        { label: "预约记录", entry: "yyjl", path: `${BASE}/reservation-log` },
        { label: "预约分析", entry: "yyfx", path: `${BASE}/reservation-statistics` },
        {
          label: "业务设置",
          entry: "ywsz",
          children: [
            { label: "智能设备", entry: "znsb", path: `${BASE}/applicationEquipment` },
            { label: "会议物品", entry: "hywp", path: `${BASE}/meet-goods` },
            { label: "会议类型", entry: "hylx", path: `${BASE}/meet-type` },
            { label: "字段设置", entry: "zdsz", path: `${BASE}/field-settings` },
            { label: "会议屏展示设置", entry: "hypzssz", path: `${BASE}/meet-screen-set` },
            { label: "会议室类型", entry: "hyslx", path: `${BASE}/meet-room-type` },
          ],
        },
      ],
    },
  ],
  async install(_app, context, config) {
    await installMeetRoomPcUi(context);
    await Promise.all([context.loadPlatform("pcUi", "platform"), context.loadPlatform("pcChart", "platform")]);
    const client = await context.ensureClient<MeetRoomClient>("meetRoomClient");
    installMeetRoomContext(context, client, config);
    installMeetRoomPcChart((await context.loadRuntimeCommon("pcChart", "index")) as typeof import("@g2-platform/pc-chart"));
  },
};

export default domain;
