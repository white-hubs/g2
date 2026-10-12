import type { ElectronicPatrolClient } from "@g2-client/electronic-patrol/client";
import type { DomainModule } from "@g2-composition/contract";
import type { MessageClient } from "@g2-contract/message";

import { installElectronicPatrolContext } from "./domain-context";
import { installElectronicPatrolPcUi } from "./pc-ui-runtime";

const BASE = "/d/electronic-patrol";

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "electronic-patrol-home", meta: { title: "电子巡更" }, redirect: `${BASE}/plan` },
    {
      path: `${BASE}/plan`,
      name: "electronic-patrol-plan",
      meta: { title: "巡更计划" },
      component: () => import("./views/list-pages").then((module) => module.PatrolPlanPage),
    },
    {
      path: `${BASE}/plan/detiles`,
      name: "electronic-patrol-plan-details",
      meta: { title: "巡更计划", hideInMenu: true, activeMenuPath: `${BASE}/plan` },
      component: () => import("./views/plan-form").then((module) => module.PatrolPlanFormPage),
    },
    {
      path: `${BASE}/task`,
      name: "electronic-patrol-task",
      meta: { title: "巡更任务" },
      component: () => import("./views/list-pages").then((module) => module.PatrolTaskPage),
    },
    {
      path: `${BASE}/task/detiles`,
      name: "electronic-patrol-task-details",
      meta: { title: "巡更任务详情", hideInMenu: true, activeMenuPath: `${BASE}/task` },
      component: () => import("./views/detail-pages").then((module) => module.PatrolTaskDetailsPage),
    },
    {
      path: `${BASE}/record`,
      name: "electronic-patrol-record",
      meta: { title: "巡更记录" },
      component: () => import("./views/list-pages").then((module) => module.PatrolRecordPage),
    },
    {
      path: `${BASE}/record/detiles`,
      name: "electronic-patrol-record-details",
      meta: { title: "巡更记录详情", hideInMenu: true, activeMenuPath: `${BASE}/record` },
      component: () => import("./views/detail-pages").then((module) => module.PatrolRecordDetailsPage),
    },
    {
      path: `${BASE}/point`,
      name: "electronic-patrol-point",
      meta: { title: "巡更点" },
      component: () => import("./views/config-pages").then((module) => module.PatrolPointPage),
    },
    {
      path: `${BASE}/nfc`,
      name: "electronic-patrol-nfc",
      meta: { title: "NFC芯片" },
      component: () => import("./views/config-pages").then((module) => module.PatrolNfcPage),
    },
    {
      path: `${BASE}/path`,
      name: "electronic-patrol-path",
      meta: { title: "巡更路线" },
      component: () => import("./views/config-pages").then((module) => module.PatrolRoutePage),
    },
    {
      path: `${BASE}/path/detiles`,
      name: "electronic-patrol-path-details",
      meta: { title: "巡更路线", hideInMenu: true, activeMenuPath: `${BASE}/path` },
      component: () => import("./views/detail-pages").then((module) => module.PatrolRouteFormPage),
    },
    {
      path: `${BASE}/message`,
      name: "electronic-patrol-message",
      meta: { title: "巡更消息配置" },
      component: () => import("./views/config-pages").then((module) => module.PatrolMessagePage),
    },
    {
      path: `${BASE}/submit-setting`,
      name: "electronic-patrol-submit-setting",
      meta: { title: "巡更提交配置" },
      component: () => import("./views/config-pages").then((module) => module.PatrolSubmitSettingPage),
    },
    {
      path: `${BASE}/route-statistics`,
      name: "electronic-patrol-route-statistics",
      meta: { title: "巡更路线统计" },
      component: () => import("./views/statistics-pages").then((module) => module.PatrolRouteStatisticsPage),
    },
    {
      path: `${BASE}/pointstatistics`,
      name: "electronic-patrol-point-statistics",
      meta: { title: "巡更点统计" },
      component: () => import("./views/statistics-pages").then((module) => module.PatrolPointStatisticsPage),
    },
    {
      path: `${BASE}/linestatistics`,
      name: "electronic-patrol-personnel-statistics",
      meta: { title: "巡更人员统计" },
      component: () => import("./views/statistics-pages").then((module) => module.PatrolPersonnelStatisticsPage),
    },
  ],
  menuContribution: [
    {
      label: "电子巡更",
      iconKey: "electronic-patrol",
      children: [
        { label: "巡更计划", entry: "01", path: `${BASE}/plan` },
        { label: "巡更任务", entry: "02", path: `${BASE}/task` },
        { label: "巡更记录", entry: "03", path: `${BASE}/record` },
        {
          label: "巡更配置",
          entry: "4",
          children: [
            { label: "巡更点", entry: "5", path: `${BASE}/point` },
            { label: "NFC芯片", entry: "2", path: `${BASE}/nfc` },
            { label: "巡更路线", entry: "3", path: `${BASE}/path` },
            { label: "巡更消息配置", entry: "1", path: `${BASE}/message` },
            { label: "巡更提交配置", entry: "partrol-submit-setting", path: `${BASE}/submit-setting` },
          ],
        },
        {
          label: "巡更统计",
          entry: "6",
          children: [
            { label: "巡更路线统计", entry: "xglxtj", path: `${BASE}/route-statistics` },
            { label: "巡更点统计", entry: "09", path: `${BASE}/pointstatistics` },
            { label: "巡更人员统计", entry: "7", path: `${BASE}/linestatistics` },
          ],
        },
      ],
    },
  ],
  async install(_app, context) {
    await installElectronicPatrolPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const [client, messages] = await Promise.all([
      context.ensureClient<ElectronicPatrolClient>("electronicPatrolClient"),
      context.ensureClient<MessageClient>("messageClient"),
    ]);
    installElectronicPatrolContext(context, client, messages);
  },
};

export default domainModule;
