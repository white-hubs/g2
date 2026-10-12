import type { FaultRepairClient } from "@g2-client/fault-repair/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainModule } from "@g2-composition/contract";
import {
  FaultRepairList,
  FaultRepairRecord,
  FaultTypeList,
  WorkOrderStatistics,
  PersonnelStatistics,
  hostStreamEnginePage,
  installFaultRepairContext,
  resolveFaultMaintainRuntime,
} from "@g2-domain/fault-repair/shared";

/**
 * 投诉建议：OUAA 独立应用，页面复用故障报修实现，仅 applicationCode / 菜单 / 文案不同。
 */
const BASE = "/d/complaint";
const module: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/fault-list` },
    { path: `${BASE}/fault-list`, name: "complaint-fault-list", meta: { title: "投诉建议" }, component: FaultRepairList },
    { path: `${BASE}/fault-record`, name: "complaint-fault-record", meta: { title: "投诉建议记录" }, component: FaultRepairRecord },
    { path: `${BASE}/fault-type`, name: "complaint-fault-type", meta: { title: "类型配置" }, component: FaultTypeList },
    {
      path: `${BASE}/work-order-statistics`,
      name: "complaint-work-order-statistics",
      meta: { title: "投诉建议工单统计" },
      component: WorkOrderStatistics,
    },
    {
      path: `${BASE}/personnel-statistics`,
      name: "complaint-personnel-statistics",
      meta: { title: "投诉建议人员统计" },
      component: PersonnelStatistics,
    },
    {
      path: `${BASE}/flow-config`,
      name: "complaint-flow-config",
      meta: { title: "流程配置" },
      component: () => hostStreamEnginePage("ApprovalConfig", { title: "流程配置" }),
    },
    {
      path: `${BASE}/flow-render`,
      name: "complaint-flow-render",
      meta: { title: "投诉建议流程", hideInMenu: true, activeMenuPath: `${BASE}/fault-list` },
      component: () => hostStreamEnginePage("StreamEngineRender", { title: "投诉建议", activeMenuEntry: "fault-list" }),
    },
    {
      path: `${BASE}/record-flow-render`,
      name: "complaint-record-flow-render",
      meta: { title: "投诉建议记录详情", hideInMenu: true, activeMenuPath: `${BASE}/fault-record` },
      component: () =>
        hostStreamEnginePage("StreamEngineRender", { title: "投诉建议记录", activeMenuEntry: "fault-record", notOperates: true }),
    },
  ],
  menuContribution: [
    {
      label: "投诉建议",
      iconKey: "complaint",
      children: [
        { label: "投诉建议", entry: "fault-list", path: `${BASE}/fault-list` },
        { label: "投诉建议记录", entry: "fault-record", path: `${BASE}/fault-record` },
        { label: "业务配置", children: [{ label: "类型配置@", entry: "fault-type", path: `${BASE}/fault-type` }] },
        { label: "流程配置", entry: "flow-config", path: `${BASE}/flow-config` },
        {
          label: "统计分析",
          children: [
            { label: "投诉建议工单统计@", entry: "work-order-statistics", path: `${BASE}/work-order-statistics` },
            { label: "投诉建议人员统计@", entry: "personnel-statistics", path: `${BASE}/personnel-statistics` },
          ],
        },
      ],
    },
  ],
  async install(_app, context, config) {
    await context.loadRuntimeCommon("pcUi", "index");
    await context.loadPlatform("pcUi", "platform");
    const applicationCode =
      typeof config?.applicationCode === "string" && config.applicationCode.trim() ? config.applicationCode.trim() : "COMPLAINT";
    installFaultRepairContext(
      context,
      await context.ensureClient<FaultRepairClient>("faultRepairClient"),
      resolveFaultMaintainRuntime({ applicationCode, basePath: BASE }),
    );
    await context.ensureClient<StreamEngineClient>("streamEngineClient");
  },
};
export default module;
