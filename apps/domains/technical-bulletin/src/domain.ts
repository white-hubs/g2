import type { TechnicalBulletinClient } from "@g2-client/technical-bulletin/client";
import type { DomainModule } from "@g2-composition/contract";

import { installTechnicalBulletinContext } from "./domain-context";
import { installTechnicalBulletinPcUi } from "./pc-ui-runtime";

const BASE = "/d/technical-bulletin";

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "technical-bulletin-home", meta: { title: "通知公告" }, redirect: `${BASE}/notice-info` },
    {
      path: `${BASE}/notice-info`,
      alias: `${BASE}/noticeInfo`,
      name: "technical-bulletin-notice-info",
      meta: { title: "公告信息" },
      component: () => import("./views/notice-pages").then((module) => module.NoticeInfoPage),
    },
    {
      path: `${BASE}/notice-manage`,
      alias: `${BASE}/noticeManage`,
      name: "technical-bulletin-notice-manage",
      meta: { title: "公告管理" },
      component: () => import("./views/notice-pages").then((module) => module.NoticeManagePage),
    },
    {
      path: `${BASE}/notice-manage/form`,
      name: "technical-bulletin-announcement-form",
      meta: { title: "公告管理", hideInMenu: true, activeMenuPath: `${BASE}/notice-manage` },
      component: () => import("./views/announcement-form").then((module) => module.AnnouncementFormPage),
    },
    {
      path: `${BASE}/notice-type`,
      alias: `${BASE}/noticeType`,
      name: "technical-bulletin-notice-type",
      meta: { title: "公告类型" },
      component: () => import("./views/model-type-page").then((module) => module.NoticeTypePage),
    },
    {
      path: `${BASE}/notice-type-label`,
      alias: `${BASE}/noticeTypeLabel`,
      name: "technical-bulletin-notice-type-label",
      meta: { title: "公告标签" },
      component: () => import("./views/model-type-page").then((module) => module.NoticeTypeLabelPage),
    },
    {
      path: `${BASE}/notice-type-institution`,
      alias: `${BASE}/noticeTypeInstitution`,
      name: "technical-bulletin-notice-type-institution",
      meta: { title: "发布机构" },
      component: () => import("./views/model-type-page").then((module) => module.NoticeTypeInstitutionPage),
    },
  ],
  menuContribution: [
    {
      label: "通知公告",
      iconKey: "technical-bulletin",
      children: [
        { label: "公告信息", entry: "bimops-manage-web-noticeInfo", path: `${BASE}/notice-info` },
        { label: "公告管理", entry: "bimops-manage-web-noticeManage", path: `${BASE}/notice-manage` },
        { label: "公告类型", entry: "bimops-manage-web-noticeType", path: `${BASE}/notice-type` },
        { label: "公告标签", entry: "ggbq", path: `${BASE}/notice-type-label` },
        { label: "发布机构", entry: "fbjg", path: `${BASE}/notice-type-institution` },
      ],
    },
  ],
  async install(_app, context) {
    await installTechnicalBulletinPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<TechnicalBulletinClient>("technicalBulletinClient");
    installTechnicalBulletinContext(context, client);
  },
};

export default domainModule;
