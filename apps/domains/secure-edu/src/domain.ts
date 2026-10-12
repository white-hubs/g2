import type { DomainModule } from "@g2-composition/contract";
import type { SecureEduClient } from "@g2-contract/secure-edu";

import { DOMAIN_CONTEXT_KEY, installSecureEduContext, installSecureEduPcChart } from "./domain-context";
import { installSecureEduPcUi } from "./pc-ui-runtime";
import { installSharedPages, sharedPage } from "./shared-pages";

const BASE = "/d/secure-edu-head";

const domain: DomainModule = {
  routes: [
    { path: BASE, name: "secure-edu-home", meta: { title: "安全教育" }, redirect: `${BASE}/over-view` },
    {
      path: `${BASE}/over-view`,
      name: "secure-edu-over-view",
      meta: { title: "数据总览" },
      component: () => Promise.resolve(sharedPage("over-view")),
    },
    {
      path: `${BASE}/training-task`,
      name: "secure-edu-training-task",
      meta: { title: "培训任务" },
      component: () => import("./views/pages").then((m) => m.TrainingTask),
    },
    {
      path: `${BASE}/training-task-form`,
      name: "secure-edu-training-task-form",
      meta: { title: "培训任务", hideInMenu: true, activeMenuPath: `${BASE}/training-task` },
      component: () => import("./views/pages").then((m) => m.TrainingTaskForm),
    },
    {
      path: `${BASE}/training-records`,
      name: "secure-edu-training-records",
      meta: { title: "培训记录" },
      component: () => import("./views/pages").then((m) => m.TrainingRecords),
    },
    {
      path: `${BASE}/training-count`,
      name: "secure-edu-training-count",
      meta: { title: "培训统计", hideInMenu: true, activeMenuPath: `${BASE}/training-records` },
      component: () => import("./views/pages").then((m) => m.TrainingRecords),
    },
    {
      path: `${BASE}/training-details`,
      name: "secure-edu-training-details",
      meta: { title: "培训明细", hideInMenu: true, activeMenuPath: `${BASE}/training-records` },
      component: () => import("./views/pages").then((m) => m.TrainingRecords),
    },
    {
      path: `${BASE}/exam-task`,
      name: "secure-edu-exam-task",
      meta: { title: "考试任务" },
      component: () => import("./views/pages").then((m) => m.ExamTask),
    },
    {
      path: `${BASE}/exam-task-form`,
      name: "secure-edu-exam-task-form",
      meta: { title: "考试任务", hideInMenu: true, activeMenuPath: `${BASE}/exam-task` },
      component: () => import("./views/pages").then((m) => m.ExamTaskForm),
    },
    {
      path: `${BASE}/test-paper-manage`,
      name: "secure-edu-test-paper",
      meta: { title: "试卷管理" },
      component: () => Promise.resolve(sharedPage("test-paper-manage", false)),
    },
    {
      path: `${BASE}/test-paper-manage-form`,
      name: "secure-edu-test-paper-form",
      meta: { title: "试卷管理", hideInMenu: true, activeMenuPath: `${BASE}/test-paper-manage` },
      component: () => Promise.resolve(sharedPage("test-paper-manage", true)),
    },
    {
      path: `${BASE}/exam-records`,
      name: "secure-edu-exam-records",
      meta: { title: "考试记录" },
      component: () => import("./views/pages").then((m) => m.ExamRecords),
    },
    {
      path: `${BASE}/exam-count`,
      name: "secure-edu-exam-count",
      meta: { title: "考试统计", hideInMenu: true, activeMenuPath: `${BASE}/exam-records` },
      component: () => import("./views/pages").then((m) => m.ExamRecords),
    },
    {
      path: `${BASE}/exam-details`,
      name: "secure-edu-exam-details",
      meta: { title: "考试明细", hideInMenu: true, activeMenuPath: `${BASE}/exam-records` },
      component: () => import("./views/pages").then((m) => m.ExamRecords),
    },
    {
      path: `${BASE}/exam-paper-detail`,
      name: "secure-edu-exam-paper-detail",
      meta: { title: "试卷详情", hideInMenu: true, activeMenuPath: `${BASE}/exam-task` },
      component: () => Promise.resolve(sharedPage("test-paper-manage", true)),
    },
    {
      path: `${BASE}/courseware`,
      name: "secure-edu-courseware",
      meta: { title: "课件库" },
      component: () => Promise.resolve(sharedPage("courseware", false)),
    },
    {
      path: `${BASE}/courseware-form`,
      name: "secure-edu-courseware-form",
      meta: { title: "课件库", hideInMenu: true, activeMenuPath: `${BASE}/courseware` },
      component: () => Promise.resolve(sharedPage("courseware", true)),
    },
    {
      path: `${BASE}/question`,
      name: "secure-edu-question",
      meta: { title: "考题库" },
      component: () => Promise.resolve(sharedPage("question", false)),
    },
    {
      path: `${BASE}/question-form`,
      name: "secure-edu-question-form",
      meta: { title: "考题库", hideInMenu: true, activeMenuPath: `${BASE}/question` },
      component: () => Promise.resolve(sharedPage("question", true)),
    },
    {
      path: `${BASE}/theme`,
      name: "secure-edu-theme",
      meta: { title: "主题管理", hideInMenu: true, activeMenuPath: `${BASE}/question` },
      component: () => Promise.resolve(sharedPage("theme", false)),
    },
    {
      path: `${BASE}/theme-form`,
      name: "secure-edu-theme-form",
      meta: { title: "主题管理", hideInMenu: true, activeMenuPath: `${BASE}/question` },
      component: () => import("./views/pages").then((m) => m.ThemeForm),
    },
    {
      path: `${BASE}/train-link`,
      name: "secure-edu-train-link",
      meta: { title: "培训链接" },
      component: () => import("./views/pages").then((m) => m.TrainLink),
    },
    {
      path: `${BASE}/exam-link`,
      name: "secure-edu-exam-link",
      meta: { title: "考试链接" },
      component: () => import("./views/pages").then((m) => m.ExamLink),
    },
    {
      path: `${BASE}/paper-question-rule`,
      name: "secure-edu-paper-question-rule",
      meta: { title: "随机考题规则", hideInMenu: true, activeMenuPath: `${BASE}/test-paper-manage` },
      component: () => Promise.resolve(sharedPage("paper-question-rule", false)),
    },
    {
      path: `${BASE}/paper-question-rule-form`,
      name: "secure-edu-paper-question-rule-form",
      meta: { title: "随机考题规则", hideInMenu: true, activeMenuPath: `${BASE}/test-paper-manage` },
      component: () => Promise.resolve(sharedPage("paper-question-rule", true)),
    },
  ],
  menuContribution: [
    {
      label: "安全教育",
      iconKey: "secure-edu",
      children: [
        { label: "数据总览", entry: "over-view", path: `${BASE}/over-view` },
        {
          label: "安全培训",
          children: [
            { label: "培训任务", entry: "training-task", path: `${BASE}/training-task` },
            { label: "培训记录", entry: "training-records", path: `${BASE}/training-records` },
          ],
        },
        {
          label: "安全考试",
          children: [
            { label: "考试任务", entry: "exam-task", path: `${BASE}/exam-task` },
            { label: "试卷管理", entry: "test-paper-manage", path: `${BASE}/test-paper-manage` },
            { label: "考试记录", entry: "exam-records", path: `${BASE}/exam-records` },
          ],
        },
        {
          label: "系统配置",
          children: [
            { label: "课件库", entry: "courseware", path: `${BASE}/courseware` },
            { label: "考题库", entry: "question", path: `${BASE}/question` },
            { label: "培训链接", entry: "train-link", path: `${BASE}/train-link` },
            { label: "考试链接", entry: "exam-link", path: `${BASE}/exam-link` },
          ],
        },
      ],
    },
  ],
  async install(app, ctx) {
    installSecureEduPcChart((await ctx.loadRuntimeCommon("pcChart", "index")) as typeof import("@g2-platform/pc-chart"));
    await installSecureEduPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcChart", "platform");
    const client = await ctx.ensureClient<SecureEduClient>("secureEduClient");
    installSecureEduContext(ctx, client);
    const library = await ctx.loadPageLibrary<typeof import("@g2-pages/secure-edu")>("secureEduPages", "pages");
    installSharedPages(await library.create(ctx, client));
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domain;
