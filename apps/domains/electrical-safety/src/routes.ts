import type { RouteRecordRaw } from "vue-router";

export const routes: RouteRecordRaw[] = [
  {
    path: "/d/electrical-safety",
    redirect: "/d/electrical-safety/electrical-center",
  },
  {
    name: "electrical-safety-center",
    path: "/d/electrical-safety/electrical-center",
    meta: { title: "电气中心" },
    component: async () => (await import("@/views/electrical-center/electrical-center")).ElectricalCenter,
  },
  {
    name: "electrical-safety-device-monitoring",
    path: "/d/electrical-safety/device-monitoring",
    meta: { title: "设备检测" },
    component: async () => (await import("@/views/device-monitoring/device-monitoring")).DeviceMonitoring,
  },
  {
    name: "electrical-safety-deep-analysis",
    path: "/d/electrical-safety/deep-analysis",
    meta: { title: "设备深度分析" },
    component: async () => (await import("@/views/deep-analysis/deep-analysis")).DeepAnalysis,
  },
  {
    name: "electrical-safety-facility-management",
    path: "/d/electrical-safety/facility-management",
    meta: { title: "设施管理" },
    component: async () => (await import("@/views/facility-management/facility-management")).FacilityManagement,
  },
  {
    name: "electrical-safety-remote-inspection-config",
    path: "/d/electrical-safety/remote-inspection-config",
    meta: { title: "远检配置" },
    component: async () => (await import("@/views/remote-inspection-config/remote-inspection-config")).RemoteInspectionConfig,
  },
  {
    name: "electrical-safety-remote-inspection-view",
    path: "/d/electrical-safety/remote-inspection-view",
    meta: { title: "远检查看" },
    component: async () => (await import("@/views/remote-inspection-view/remote-inspection-view")).RemoteInspectionView,
  },
];

import { hostElectricalSafetyGemPage } from "./gem-page-host";
routes.push(
  {
    path: "/d/electrical-safety/application-equipment",
    name: "electrical-safety-application-equipment",
    meta: { title: "设备关联" },
    component: () => hostElectricalSafetyGemPage("ApplicationEquipment"),
  },
  {
    path: "/d/electrical-safety/alarm-record",
    name: "electrical-safety-alarm-record",
    meta: { title: "报警记录" },
    component: () => hostElectricalSafetyGemPage("AlarmRecord"),
  },
  {
    path: "/d/electrical-safety/alarm-config",
    name: "electrical-safety-alarm-config",
    meta: { title: "告警规则" },
    component: () => hostElectricalSafetyGemPage("AlarmConfigList"),
  },
  {
    path: "/d/electrical-safety/message-notice",
    name: "electrical-safety-message-notice",
    meta: { title: "消息配置" },
    component: () => hostElectricalSafetyGemPage("MessageNotice"),
  },
  {
    path: "/d/electrical-safety/line-loss-warning-config",
    name: "electrical-safety-line-loss-warning-config",
    meta: { title: "预警规则" },
    component: () => hostElectricalSafetyGemPage("AlarmConfigList"),
  },
  {
    path: "/d/electrical-safety/line-loss-warning-list",
    name: "electrical-safety-line-loss-warning-list",
    meta: { title: "预警列表" },
    component: () => hostElectricalSafetyGemPage("AlarmRecord"),
  },
  { path: "/d/electrical-safety/applicationEquipment", redirect: "/d/electrical-safety/application-equipment" },
  { path: "/d/electrical-safety/alarmRecord", redirect: "/d/electrical-safety/alarm-record" },
  { path: "/d/electrical-safety/alarmConfigList", redirect: "/d/electrical-safety/alarm-config" },
  { path: "/d/electrical-safety/alarmConfigEnergyList", redirect: "/d/electrical-safety/line-loss-warning-config" },
  {
    path: "/d/electrical-safety/topology-editor",
    name: "electrical-safety-topology-editor",
    meta: { title: "拓扑图配置" },
    component: () => import("./views/graph-editor/graph-editor").then((m) => m.GraphEditor),
  },
  {
    path: "/d/electrical-safety/line-loss",
    name: "electrical-safety-line-loss",
    meta: { title: "线损管理" },
    component: () => import("./views/line-loss-management/line-loss-management").then((m) => m.LineEditor),
  },
  {
    path: "/d/electrical-safety/collection-cycle",
    name: "electrical-safety-collection-cycle",
    meta: { title: "采集周期" },
    component: () => import("./views/collection-cycle/collection-cycle").then((m) => m.CollectionCycle),
  },
  {
    path: "/d/electrical-safety/collection-record",
    name: "electrical-safety-collection-record",
    meta: { title: "采集记录" },
    component: () => import("./views/collection-record/collection-record").then((m) => m.CollectionRecord),
  },
  {
    path: "/d/electrical-safety/loss-statistics",
    name: "electrical-safety-loss-statistics",
    meta: { title: "损耗统计" },
    component: () => import("./views/loss-statistics/loss-statistics").then((m) => m.LossStatistics),
  },
  {
    path: "/d/electrical-safety/alarmDetail",
    meta: { title: "报警详情", activeMenuPath: "/d/electrical-safety/alarm-record" },
    component: () => hostElectricalSafetyGemPage("AlarmDetail", { idAs: "alarmId" }),
  },
  {
    path: "/d/electrical-safety/alarmConfigureAdd",
    meta: { title: "告警规则配置", activeMenuPath: "/d/electrical-safety/alarm-config" },
    component: () => hostElectricalSafetyGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
  },
  {
    path: "/d/electrical-safety/line-loss-warning-config/editor",
    meta: { title: "预警规则配置", activeMenuPath: "/d/electrical-safety/line-loss-warning-config" },
    component: () => hostElectricalSafetyGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
  },
  {
    path: "/d/electrical-safety/configuration",
    meta: { title: "设备配置", activeMenuPath: "/d/electrical-safety/application-equipment" },
    component: () => hostElectricalSafetyGemPage("Configuration"),
  },
);
