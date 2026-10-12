import type { DomainModule, MenuContributionNode } from "@g2-composition/contract";
import type { SecureEduClient } from "@g2-contract/secure-edu";

import { createHost, installPages } from "./page-library";
export const BASE = "/d/secure-edu";
export const MENU = [
  { label: "数据总览", path: "over-view" },
  {
    label: "安全培训",
    children: [
      { label: "培训任务", path: "training-task" },
      { label: "培训统计", path: "training-count" },
    ],
  },
  {
    label: "安全考试",
    children: [
      { label: "考试任务", path: "exam-task" },
      { label: "试卷管理", path: "test-paper-manage" },
      { label: "考试统计", path: "exam-count" },
    ],
  },
  {
    label: "系统配置",
    children: [
      { label: "试卷考题规则", path: "paper-question-rule" },
      { label: "课件库", path: "courseware" },
      { label: "考题库", path: "question" },
      { label: "主题管理", path: "theme" },
    ],
  },
  { label: "消息配置", path: "message" },
];
const leaves = MENU.flatMap((item) => item.children ?? [item]).filter((item): item is { label: string; path: string } =>
  Boolean(item.path),
);
const editors = ["training-task", "exam-task", "test-paper-manage", "courseware", "question", "paper-question-rule"];
const domain: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/over-view` },
    ...leaves.map((item) => ({
      path: `${BASE}/${item.path}`,
      name: `secure-edu-market-${item.path}`,
      meta: { title: item.label },
      component: () => Promise.resolve(createHost(item.path)),
    })),
    ...editors.map((slug) => ({
      path: `${BASE}/${slug}-form`,
      name: `secure-edu-market-${slug}-form`,
      meta: { title: leaves.find((item) => item.path === slug)?.label, hideInMenu: true, activeMenuPath: `${BASE}/${slug}` },
      component: () => Promise.resolve(createHost(slug, true)),
    })),
    ...["training-details", "exam-details"].map((slug) => ({
      path: `${BASE}/${slug}`,
      name: `secure-edu-market-${slug}`,
      meta: {
        title: slug === "training-details" ? "培训人员明细" : "考试人员明细",
        hideInMenu: true,
        activeMenuPath: `${BASE}/${slug === "training-details" ? "training-count" : "exam-count"}`,
      },
      component: () => Promise.resolve(createHost(slug)),
    })),
    { path: `${BASE}/training-detials`, redirect: (to) => ({ path: `${BASE}/training-details`, query: to.query }) },
    {
      path: `${BASE}/training-exam-details`,
      name: "secure-edu-market-training-exam-details",
      meta: { title: "关联考试人员明细", hideInMenu: true, activeMenuPath: `${BASE}/training-count` },
      component: () => Promise.resolve(createHost("exam-details")),
    },
    {
      path: `${BASE}/exam-paper-detail`,
      meta: { title: "试卷详情", hideInMenu: true, activeMenuPath: `${BASE}/exam-task` },
      component: () => Promise.resolve(createHost("test-paper-manage", true)),
    },
  ],
  menuContribution: [
    {
      label: "安全教育",
      iconKey: "secure-edu",
      children: MENU.map(
        (item): MenuContributionNode =>
          item.children
            ? {
                label: item.label,
                children: item.children.map((child) => ({ label: child.label, entry: child.path, path: `${BASE}/${child.path}` })),
              }
            : { label: item.label, entry: item.path, path: `${BASE}/${item.path}` },
      ),
    },
  ],
  async install(_app, ctx) {
    await ctx.loadRuntimeCommon("pcUi", "index");
    await ctx.loadRuntimeCommon("pcChart", "index");
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcChart", "platform");
    const client = await ctx.ensureClient<SecureEduClient>("secureEduClient");
    const library = await ctx.loadPageLibrary<typeof import("@g2-pages/secure-edu")>("secureEduPages", "pages");
    installPages(await library.create(ctx, client));
  },
};
export default domain;
