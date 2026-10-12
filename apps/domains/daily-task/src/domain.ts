import type { DailyTaskClient } from "@g2-client/daily-task/client";
import type { DomainModule } from "@g2-composition/contract";

import { DOMAIN_CONTEXT_KEY, installDailyTaskContext } from "./domain-context";
import { installDailyTaskPcUi } from "./pc-ui-runtime";

import "./styles.css";

const BASE = "/d/daily-task";
const DAILY_TASK_QUERY = "dailyType=DAILY_TASK";
const DAILY_INSPECTION_QUERY = "dailyType=DAILY_INSPECTION";

function typedPath(entry: string, query: string): string {
  return `${BASE}/${entry}?${query}`;
}

function businessMenu(query: string, label = "业务配置") {
  return {
    label,
    children: [
      { label: "任务类型", entry: "task-type", path: typedPath("task-type", query) },
      { label: "紧急等级", entry: "urgency-level", path: typedPath("urgency-level", query) },
      { label: "任务周期", entry: "task-cycle", path: typedPath("task-cycle", query) },
      { label: "任务标准", entry: "task-standard", path: typedPath("task-standard", query) },
      { label: "标准项", entry: "standard-item", path: typedPath("standard-item", query) },
      { label: "任务结果", entry: "task-result", path: typedPath("task-result", query) },
    ],
  };
}

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      name: "daily-task-home",
      meta: { title: "任务计划", hideInMenu: true, activeMenuPath: typedPath("task-plan", DAILY_TASK_QUERY) },
      component: () => import("./views/task-plan/task-plan").then((m) => m.TaskPlan),
    },
    {
      path: `${BASE}/task-plan`,
      name: "daily-task-plan",
      meta: { title: "任务计划" },
      component: () => import("./views/task-plan/task-plan").then((m) => m.TaskPlan),
    },
    {
      path: `${BASE}/task-plan-edit`,
      name: "daily-task-plan-edit",
      meta: { title: "任务计划", hideInMenu: true, activeMenuPath: typedPath("task-plan", DAILY_TASK_QUERY) },
      component: () => import("./views/task-plan/task-plan-edit/task-plan-edit").then((m) => m.TaskPlanEdit),
    },
    {
      path: `${BASE}/task-list`,
      name: "daily-task-list",
      meta: { title: "日常任务" },
      component: () => import("./views/task-list/task-list").then((m) => m.TaskList),
    },
    {
      path: `${BASE}/task-edit`,
      name: "daily-task-edit",
      meta: { title: "日常任务", hideInMenu: true, activeMenuPath: typedPath("task-list", DAILY_TASK_QUERY) },
      component: () => import("./views/task-list/task-edit/task-edit").then((m) => m.TaskEdit),
    },
    {
      path: `${BASE}/task-record`,
      name: "daily-task-record",
      meta: { title: "任务记录" },
      component: () => import("./views/task-record/task-record").then((m) => m.TaskRecord),
    },
    {
      path: `${BASE}/task-record-info`,
      name: "daily-task-record-info",
      meta: { title: "任务记录详情", hideInMenu: true, activeMenuPath: typedPath("task-list", DAILY_TASK_QUERY) },
      component: () => import("./views/task-record/record-info/record-info").then((m) => m.TaskRecordInfo),
    },
    {
      path: `${BASE}/task-target-info`,
      name: "daily-task-target-info",
      meta: { title: "任务对象详情", hideInMenu: true, activeMenuPath: typedPath("task-list", DAILY_TASK_QUERY) },
      component: () => import("./views/task-record/task-target-info/task-target-info").then((m) => m.TaskTargetInfo),
    },
    {
      path: `${BASE}/task-drafts`,
      name: "daily-task-drafts",
      meta: { title: "草稿箱" },
      component: () => import("./views/task-drafts/task-drafts").then((m) => m.TaskDrafts),
    },
    {
      path: `${BASE}/task-type`,
      name: "daily-task-type",
      meta: { title: "任务类型" },
      component: () => import("./views/task-config/task-type/task-type").then((m) => m.TaskType),
    },
    {
      path: `${BASE}/task-cycle`,
      name: "daily-task-cycle",
      meta: { title: "任务周期" },
      component: () => import("./views/task-config/task-cycle/task-cycle").then((m) => m.TaskCycle),
    },
    {
      path: `${BASE}/urgency-level`,
      name: "daily-task-urgency-level",
      meta: { title: "紧急等级" },
      component: () => import("./views/task-config/urgency-level/urgency-level").then((m) => m.UrgencyLevel),
    },
    {
      path: `${BASE}/task-result`,
      name: "daily-task-result",
      meta: { title: "任务结果" },
      component: () => import("./views/task-config/task-result/task-result").then((m) => m.TaskResult),
    },
    {
      path: `${BASE}/standard-item`,
      name: "daily-task-standard-item",
      meta: { title: "标准项" },
      component: () => import("./views/task-config/standard-item/standard-item").then((m) => m.StandardItem),
    },
    {
      path: `${BASE}/standard-item-form`,
      name: "daily-task-standard-item-form",
      meta: { title: "标准项", hideInMenu: true, activeMenuPath: typedPath("standard-item", DAILY_TASK_QUERY) },
      component: () => import("./views/task-config/standard-item-form/standard-item-form").then((m) => m.StandardItemForm),
    },
    {
      path: `${BASE}/task-standard`,
      name: "daily-task-standard",
      meta: { title: "任务标准" },
      component: () => import("./views/task-config/task-standard/task-standard").then((m) => m.TaskStandard),
    },
    {
      path: `${BASE}/task-standard-form`,
      name: "daily-task-standard-form",
      meta: { title: "任务标准", hideInMenu: true, activeMenuPath: typedPath("task-standard", DAILY_TASK_QUERY) },
      component: () => import("./views/task-config/task-standard-form/task-standard-form").then((m) => m.TaskStandardForm),
    },
    {
      path: `${BASE}/message-config`,
      name: "daily-task-message-config",
      meta: { title: "消息配置" },
      component: () => import("./views/task-config/message-config/message-config").then((m) => m.MessageConfig),
    },
  ],
  menuContribution: [
    {
      label: "日常任务",
      iconKey: "daily-task",
      children: [
        { label: "任务计划", entry: "task-plan", path: typedPath("task-plan", DAILY_TASK_QUERY) },
        { label: "日常任务", entry: "task-list", path: typedPath("task-list", DAILY_TASK_QUERY) },
        businessMenu(DAILY_TASK_QUERY),
        { label: "草稿箱", entry: "task-drafts", path: typedPath("task-drafts", DAILY_TASK_QUERY) },
        { label: "消息配置", entry: "message-config", path: typedPath("message-config", DAILY_TASK_QUERY) },
      ],
    },
    {
      label: "日常巡检新",
      iconKey: "daily-task",
      children: [
        { label: "任务计划", entry: "inspection-task-plan", path: typedPath("task-plan", DAILY_INSPECTION_QUERY) },
        { label: "日常任务", entry: "inspection-task-list", path: typedPath("task-list", DAILY_INSPECTION_QUERY) },
        businessMenu(DAILY_INSPECTION_QUERY, "业务设置"),
        { label: "草稿箱", entry: "inspection-task-drafts", path: typedPath("task-drafts", DAILY_INSPECTION_QUERY) },
        { label: "消息配置", entry: "inspection-message-config", path: typedPath("message-config", DAILY_INSPECTION_QUERY) },
      ],
    },
  ],
  async install(app, ctx) {
    await installDailyTaskPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    const client = await ctx.ensureClient<DailyTaskClient>("dailyTaskClient");
    installDailyTaskContext(ctx, client);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domainModule;
