import type { ProblemsClient } from "@g2-client/problems/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainModule } from "@g2-composition/contract";

import { installProblemsContext } from "./domain-context";
import { hostStreamEnginePage } from "./mount-stream-page";

const BASE = "/d/problems";
const module: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/problems-list` },
    {
      path: `${BASE}/problems-list`,
      name: "problems-list",
      meta: { title: "隐患单" },
      component: () => import("./views/flow-list").then((value) => value.ProblemsList),
    },
    {
      path: `${BASE}/problems-record`,
      name: "problems-record",
      meta: { title: "排查记录" },
      component: () => import("./views/flow-list").then((value) => value.ProblemsRecord),
    },
    {
      path: `${BASE}/flow-render`,
      name: "problems-flow-render",
      meta: {
        title: "隐患流程",
        hideInMenu: true,
        activeMenuPath: `${BASE}/problems-list`,
      },
      component: () => hostStreamEnginePage("StreamEngineRender", { title: "隐患排查", activeMenuEntry: "problems-list" }),
    },
    {
      path: `${BASE}/record-flow-render`,
      name: "problems-record-flow-render",
      meta: {
        title: "排查记录详情",
        hideInMenu: true,
        activeMenuPath: `${BASE}/problems-record`,
      },
      component: () => hostStreamEnginePage("StreamEngineRender", { title: "排查记录", activeMenuEntry: "problems-record" }),
    },
    {
      path: `${BASE}/flow-config`,
      name: "problems-flow-config",
      meta: { title: "流程配置" },
      component: () => hostStreamEnginePage("ApprovalConfig", { title: "流程配置" }),
    },
    {
      path: `${BASE}/problems-degree`,
      name: "problems-degree",
      meta: { title: "隐患程度" },
      component: () => import("./views/config").then((value) => value.ProblemsDegree),
    },
    {
      path: `${BASE}/problems-type`,
      name: "problems-type",
      meta: { title: "隐患类型" },
      component: () => import("./views/config").then((value) => value.ProblemsType),
    },
    {
      path: `${BASE}/work-order-statistics`,
      name: "problems-work-order-statistics",
      meta: { title: "隐患工单统计" },
      component: () => import("./views/statistics").then((value) => value.WorkOrderStatistics),
    },
    {
      path: `${BASE}/personnel-statistics`,
      name: "problems-personnel-statistics",
      meta: { title: "隐患人员统计" },
      component: () => import("./views/statistics").then((value) => value.PersonnelStatistics),
    },
  ],
  menuContribution: [
    {
      label: "隐患排查",
      iconKey: "problems",
      children: [
        { label: "隐患单", entry: "problems-list", path: `${BASE}/problems-list` },
        { label: "排查记录", entry: "problems-record", path: `${BASE}/problems-record` },
        { label: "流程配置", entry: "flow-config", path: `${BASE}/flow-config` },
        {
          label: "隐患配置",
          children: [
            { label: "隐患程度@", entry: "problems-degree", path: `${BASE}/problems-degree` },
            { label: "隐患类型@", entry: "problems-type", path: `${BASE}/problems-type` },
          ],
        },
        {
          label: "统计分析",
          children: [
            { label: "隐患工单统计@", entry: "work-order-statistics", path: `${BASE}/work-order-statistics` },
            { label: "隐患人员统计@", entry: "personnel-statistics", path: `${BASE}/personnel-statistics` },
          ],
        },
      ],
    },
  ],
  async install(_app, context) {
    await context.loadRuntimeCommon("pcUi", "index");
    await context.loadPlatform("pcUi", "platform");
    installProblemsContext(context, await context.ensureClient<ProblemsClient>("problemsClient"));
    // 预热流引擎 Client，供渲染/流程配置共享页使用。
    await context.ensureClient<StreamEngineClient>("streamEngineClient");
  },
};
export default module;
