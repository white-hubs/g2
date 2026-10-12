import type { SmallEngineeringClient } from "@g2-client/small-engineering/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainModule } from "@g2-composition/contract";
import type { DailyInspectionClient } from "@g2-contract/daily-inspection";

import { installSmallEngineeringContext } from "./domain-context";
import { hostStreamPage } from "./mount-stream-page";
import { installSmallEngineeringPcUi } from "./pc-ui-runtime";

const BASE = "/d/small-engineering";
const path = (entry: string) => `${BASE}/${entry}`;
const menu = (label: string, entry: string) => ({ label, entry, path: path(entry) });
const dailyPath = (entry: string) => `/d/daily-task/${entry}?dailyType=DAILY_SMALL_INSPECTION`;
const dailyMenu = (label: string, entry: string) => ({ label, entry: `small-daily-${entry}`, path: dailyPath(entry) });

const module: DomainModule = {
  routes: [
    { path: BASE, redirect: path("manage") },
    {
      path: path("manage"),
      name: "small-engineering-manage",
      meta: { title: "工程管理" },
      component: () => import("./views/manage").then((m) => m.Manage),
    },
    {
      path: path("request"),
      name: "small-engineering-request",
      meta: { title: "工程请示" },
      component: () => import("./views/flow-list").then((m) => m.Request),
    },
    {
      path: path("examineApprove"),
      name: "small-engineering-approve",
      meta: { title: "工程审批" },
      component: () => import("./views/flow-list").then((m) => m.ExamineApprove),
    },
    {
      path: path("supervise"),
      name: "small-engineering-supervise",
      meta: { title: "工程监管" },
      component: () => import("./views/supervise").then((m) => m.Supervise),
    },
    {
      path: path("engineering-correction"),
      name: "small-engineering-correction",
      meta: { title: "工程整改" },
      component: () => import("./views/flow-list").then((m) => m.EngineeringCorrection),
    },
    {
      path: path("engineering-patrol-plan"),
      name: "small-engineering-patrol-plan",
      meta: { title: "巡查计划" },
      component: () => import("./views/patrol").then((m) => m.PatrolPlan),
    },
    {
      path: path("engineering-patrol-task"),
      name: "small-engineering-patrol-task",
      meta: { title: "巡查任务" },
      component: () => import("./views/patrol").then((m) => m.PatrolTask),
    },
    {
      path: path("engineering-patrol-records"),
      name: "small-engineering-patrol-records",
      meta: { title: "巡查记录" },
      component: () => import("./views/patrol").then((m) => m.PatrolRecords),
    },
    {
      path: path("engineering-temporary-patrol-record"),
      name: "small-engineering-temporary-patrol-record",
      meta: { title: "临时巡查记录" },
      component: () => import("./views/patrol").then((m) => m.TemporaryPatrolRecords),
    },
    {
      path: path("engineeringType"),
      name: "small-engineering-type",
      meta: { title: "工程类型" },
      component: () => import("./views/config").then((m) => m.EngineeringType),
    },
    {
      path: path("patrol-type"),
      name: "small-engineering-patrol-type",
      meta: { title: "巡检类型" },
      component: () => import("./views/config").then((m) => m.PatrolType),
    },
    {
      path: path("inspect-cycle"),
      name: "small-engineering-inspect-cycle",
      meta: { title: "巡检周期" },
      component: () => import("./views/config").then((m) => m.InspectCycle),
    },
    {
      path: path("inspect-result"),
      name: "small-engineering-inspect-result",
      meta: { title: "巡检结果" },
      component: () => import("./views/config").then((m) => m.InspectResult),
    },
    {
      path: path("inspect-items"),
      name: "small-engineering-inspect-items",
      meta: { title: "巡检项" },
      component: () => import("./views/config").then((m) => m.InspectItems),
    },
    {
      path: path("inspect-standard"),
      name: "small-engineering-inspect-standard",
      meta: { title: "巡检标准" },
      component: () => import("./views/config").then((m) => m.InspectStandard),
    },
    {
      path: path("flow-config"),
      name: "small-engineering-flow-config",
      meta: { title: "流程配置" },
      component: () => hostStreamPage("ApprovalConfig", { title: "流程配置", backPath: "engineeringType" }),
    },
    {
      path: path("message-config"),
      name: "small-engineering-message-config",
      meta: { title: "消息配置" },
      component: () => import("./views/message-config").then((m) => m.MessageConfig),
    },
    {
      path: path("manage-detail"),
      name: "small-engineering-manage-detail",
      meta: { title: "工程详情", hideInMenu: true, activeMenuPath: path("manage") },
      component: () => import("./views/details").then((m) => m.ManageDetail),
    },
    {
      path: path("supervise-detail"),
      name: "small-engineering-supervise-detail",
      meta: { title: "工程监管详情", hideInMenu: true, activeMenuPath: path("supervise") },
      component: () => import("./views/details").then((m) => m.SuperviseDetail),
    },
    {
      path: path("edit-supervise"),
      name: "small-engineering-edit-supervise",
      meta: { title: "编辑工程监管", hideInMenu: true, activeMenuPath: path("supervise") },
      component: () => import("./views/details").then((m) => m.EditSupervise),
    },
    {
      path: path("engineering-patrol-plan-edit"),
      name: "small-engineering-patrol-plan-edit",
      meta: { title: "巡查计划", hideInMenu: true, activeMenuPath: path("engineering-patrol-plan") },
      component: () => import("./views/patrol-edit").then((m) => m.PatrolPlanEdit),
    },
    {
      path: path("engineering-patrol-task-edit"),
      name: "small-engineering-patrol-task-edit",
      meta: { title: "巡查任务", hideInMenu: true, activeMenuPath: path("engineering-patrol-task") },
      component: () => import("./views/patrol-edit").then((m) => m.PatrolTaskEdit),
    },
    {
      path: path("engineering-patrol-record-info"),
      name: "small-engineering-patrol-record-info",
      meta: { title: "巡查记录详情", hideInMenu: true, activeMenuPath: path("engineering-patrol-records") },
      component: () => import("./views/details").then((m) => m.PatrolRecordDetail),
    },
    {
      path: path("engineering-temporary-patrol-details"),
      name: "small-engineering-temporary-patrol-details",
      meta: { title: "临时巡查详情", hideInMenu: true, activeMenuPath: path("engineering-temporary-patrol-record") },
      component: () => import("./views/details").then((m) => m.TemporaryPatrolDetail),
    },
    {
      path: path("inspect-items-form"),
      name: "small-engineering-inspect-items-form",
      meta: { title: "巡检项", hideInMenu: true, activeMenuPath: path("inspect-items") },
      component: () => import("./views/config-form").then((m) => m.InspectItemsForm),
    },
    {
      path: path("inspect-standard-form"),
      name: "small-engineering-inspect-standard-form",
      meta: { title: "巡检标准", hideInMenu: true, activeMenuPath: path("inspect-standard") },
      component: () => import("./views/config-form").then((m) => m.InspectStandardForm),
    },
    {
      path: path("request-flow"),
      name: "small-engineering-request-flow",
      meta: { title: "工程请示", hideInMenu: true, activeMenuPath: path("request") },
      component: () => hostStreamPage("StreamEngineRender", { title: "工程请示", backPath: "request", businessType: "PROJECT_APPLY" }),
    },
    {
      path: path("approve-flow"),
      name: "small-engineering-approve-flow",
      meta: { title: "工程审批", hideInMenu: true, activeMenuPath: path("examineApprove") },
      component: () =>
        hostStreamPage("StreamEngineRender", { title: "工程审批", backPath: "examineApprove", businessType: "PROJECT_SIGN_CONTRACT" }),
    },
    {
      path: path("correction-flow"),
      name: "small-engineering-correction-flow",
      meta: { title: "工程整改", hideInMenu: true, activeMenuPath: path("engineering-correction") },
      component: () =>
        hostStreamPage("StreamEngineRender", { title: "工程整改", backPath: "engineering-correction", businessType: "PROJECT_REFORM" }),
    },
  ],
  menuContribution: [
    {
      label: "小散工程",
      iconKey: "small-engineering",
      children: [
        menu("工程管理", "manage"),
        menu("工程请示", "request"),
        menu("工程审批", "examineApprove"),
        menu("工程监管", "supervise"),
        menu("工程整改", "engineering-correction"),
        {
          label: "工程巡查",
          children: [
            menu("巡查计划", "engineering-patrol-plan"),
            menu("巡查任务", "engineering-patrol-task"),
            menu("巡查记录", "engineering-patrol-records"),
            menu("临时巡查记录", "engineering-temporary-patrol-record"),
          ],
        },
        {
          label: "业务设置",
          children: [
            menu("工程类型", "engineeringType"),
            menu("巡检类型", "patrol-type"),
            menu("巡检周期", "inspect-cycle"),
            menu("巡检结果", "inspect-result"),
            menu("巡检项", "inspect-items"),
            menu("巡检标准", "inspect-standard"),
            menu("流程配置", "flow-config"),
            menu("消息配置", "message-config"),
          ],
        },
        {
          label: "工程巡查DAILY",
          children: [dailyMenu("巡查计划", "task-plan"), dailyMenu("巡查任务", "task-list"), dailyMenu("草稿箱", "task-drafts")],
        },
        {
          label: "业务配置DAILY",
          children: [
            dailyMenu("巡查类型", "task-type"),
            dailyMenu("紧急等级", "urgency-level"),
            dailyMenu("任务周期", "task-cycle"),
            dailyMenu("任务标准", "task-standard"),
            dailyMenu("标准项", "standard-item"),
            dailyMenu("任务结果", "task-result"),
            dailyMenu("消息配置", "message-config"),
          ],
        },
      ],
    },
  ],
  async install(_app, context) {
    await installSmallEngineeringPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const [small, patrol, flow] = await Promise.all([
      context.ensureClient<SmallEngineeringClient>("smallEngineeringClient"),
      context.ensureClient<DailyInspectionClient>("dailyInspectionClient"),
      context.ensureClient<StreamEngineClient>("streamEngineClient"),
    ]);
    installSmallEngineeringContext(context, small, patrol, flow);
  },
};

export default module;
