import type { FaultRepairClient } from "@g2-client/fault-repair/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainModule } from "@g2-composition/contract";

import { installFaultRepairContext } from "./domain-context";
import { hostStreamEnginePage } from "./mount-stream-page";
import { resolveFaultMaintainRuntime } from "./runtime";

const BASE = "/d/fault-repair";
const module: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/fault-list` },
    {
      path: `${BASE}/fault-list`,
      name: "fault-list",
      meta: { title: "故障单" },
      component: () => import("./views/flow-list").then((value) => value.FaultRepairList),
    },
    {
      path: `${BASE}/fault-case`,
      name: "fault-case",
      meta: { title: "故障案例" },
      component: () => import("./views/case").then((value) => value.FaultCaseList),
    },
    {
      path: `${BASE}/fault-report`,
      name: "fault-report",
      meta: { title: "故障报告" },
      component: () => import("./views/report").then((value) => value.FaultReportList),
    },
    {
      path: `${BASE}/fault-record`,
      name: "fault-record",
      meta: { title: "报修记录" },
      component: () => import("./views/flow-list").then((value) => value.FaultRepairRecord),
    },
    {
      path: `${BASE}/fault-type`,
      name: "fault-type",
      meta: { title: "故障类型" },
      component: () => import("./views/type").then((value) => value.FaultTypeList),
    },
    {
      path: `${BASE}/work-order-statistics`,
      name: "fault-work-order-statistics",
      meta: { title: "故障报修工单统计" },
      component: () => import("./views/statistics").then((value) => value.WorkOrderStatistics),
    },
    {
      path: `${BASE}/personnel-statistics`,
      name: "fault-personnel-statistics",
      meta: { title: "故障报修人员统计" },
      component: () => import("./views/statistics").then((value) => value.PersonnelStatistics),
    },
    {
      path: `${BASE}/flow-config`,
      name: "fault-flow-config",
      meta: { title: "流程配置" },
      component: () => hostStreamEnginePage("ApprovalConfig", { title: "流程配置" }),
    },
    {
      path: `${BASE}/flow-render`,
      name: "fault-flow-render",
      meta: { title: "故障报修流程", hideInMenu: true, activeMenuPath: `${BASE}/fault-list` },
      component: () => hostStreamEnginePage("StreamEngineRender", { title: "故障报修", activeMenuEntry: "fault-list" }),
    },
    {
      path: `${BASE}/record-flow-render`,
      name: "fault-record-flow-render",
      meta: { title: "报修记录详情", hideInMenu: true, activeMenuPath: `${BASE}/fault-record` },
      component: () =>
        hostStreamEnginePage("StreamEngineRender", { title: "报修记录", activeMenuEntry: "fault-record", notOperates: true }),
    },
    {
      path: `${BASE}/fault-case-operate`,
      name: "fault-case-operate",
      meta: { title: "故障案例操作", hideInMenu: true, activeMenuPath: `${BASE}/fault-case` },
      component: () => import("./views/case").then((value) => value.FaultCaseOperate),
    },
    {
      path: `${BASE}/fault-report-detail`,
      name: "fault-report-detail",
      meta: { title: "故障报告详情", hideInMenu: true, activeMenuPath: `${BASE}/fault-report` },
      component: () => import("./views/report").then((value) => value.FaultReportDetail),
    },
  ],
  menuContribution: [
    {
      label: "故障报修",
      iconKey: "fault-repair",
      children: [
        { label: "故障单", entry: "fault-list", path: `${BASE}/fault-list` },
        { label: "故障案例", entry: "fault-case", path: `${BASE}/fault-case` },
        { label: "故障报告", entry: "fault-report", path: `${BASE}/fault-report` },
        { label: "报修记录", entry: "fault-record", path: `${BASE}/fault-record` },
        { label: "故障配置", children: [{ label: "故障类型@", entry: "fault-type", path: `${BASE}/fault-type` }] },
        {
          label: "统计分析",
          children: [
            { label: "故障报修工单统计@", entry: "work-order-statistics", path: `${BASE}/work-order-statistics` },
            { label: "故障报修人员统计@", entry: "personnel-statistics", path: `${BASE}/personnel-statistics` },
          ],
        },
        { label: "流程配置", entry: "flow-config", path: `${BASE}/flow-config` },
      ],
    },
  ],
  async install(_app, context, config) {
    await context.loadRuntimeCommon("pcUi", "index");
    await context.loadPlatform("pcUi", "platform");
    const applicationCode =
      typeof config?.applicationCode === "string" && config.applicationCode.trim() ? config.applicationCode.trim() : "FAULT";
    installFaultRepairContext(
      context,
      await context.ensureClient<FaultRepairClient>("faultRepairClient"),
      resolveFaultMaintainRuntime({ applicationCode, basePath: BASE }),
    );
    await context.ensureClient<StreamEngineClient>("streamEngineClient");
  },
};
export default module;
