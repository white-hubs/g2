import type { FactoryManagementClient } from "@g2-client/factory-management/client";
import type { DomainModule } from "@g2-composition/contract";

import { installFactoryManagementContext } from "./domain-context";
import { installFactoryManagementPcUi } from "./pc-ui-runtime";

const BASE = "/d/factory-management";

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "factory-management-home", meta: { title: "园区管理" }, redirect: `${BASE}/factory-view` },
    {
      path: `${BASE}/factory-view`,
      name: "factory-management-overview",
      meta: { title: "园区总览" },
      component: () => import("./views/overview-page").then((module) => module.FactoryOverviewPage),
    },
    {
      path: `${BASE}/enterprise-information`,
      name: "factory-management-enterprise-information",
      meta: { title: "企业信息" },
      component: () => import("./views/list-pages").then((module) => module.EnterpriseInformationPage),
    },
    {
      path: `${BASE}/enterprise-directory`,
      name: "factory-management-enterprise-directory",
      meta: { title: "企业名录" },
      component: () => import("./views/list-pages").then((module) => module.EnterpriseDirectoryPage),
    },
    {
      path: `${BASE}/industry-type`,
      name: "factory-management-industry-type",
      meta: { title: "行业类型" },
      component: () => import("./views/type-pages").then((module) => module.IndustryTypePage),
    },
    {
      path: `${BASE}/room-information`,
      name: "factory-management-room-information",
      meta: { title: "房间信息" },
      component: () => import("./views/list-pages").then((module) => module.RoomInformationPage),
    },
    {
      path: `${BASE}/room-type`,
      name: "factory-management-room-type",
      meta: { title: "房间类型" },
      component: () => import("./views/type-pages").then((module) => module.RoomTypePage),
    },
    {
      path: `${BASE}/enterprise-visit`,
      name: "factory-management-enterprise-visit",
      meta: { title: "企业走访" },
      component: () => import("./views/list-pages").then((module) => module.EnterpriseVisitPage),
    },
    {
      path: `${BASE}/enterprise-demands`,
      name: "factory-management-enterprise-demands",
      meta: { title: "企业诉求" },
      component: () => import("./views/list-pages").then((module) => module.EnterpriseDemandsPage),
    },
    {
      path: `${BASE}/demands-type`,
      name: "factory-management-demands-type",
      meta: { title: "诉求类型" },
      component: () => import("./views/type-pages").then((module) => module.DemandsTypePage),
    },
    {
      path: `${BASE}/visit-type`,
      name: "factory-management-visit-type",
      meta: { title: "走访类型" },
      component: () => import("./views/type-pages").then((module) => module.VisitTypePage),
    },
    {
      path: `${BASE}/room-rental`,
      name: "factory-management-room-rental",
      meta: { title: "房间租赁" },
      component: () => import("./views/list-pages").then((module) => module.RoomRentalPage),
    },
    {
      path: `${BASE}/room-status`,
      name: "factory-management-room-status",
      meta: { title: "房间状态" },
      component: () => import("./views/room-status-page").then((module) => module.RoomStatusPage),
    },
    {
      path: `${BASE}/investment-plan`,
      name: "factory-management-investment-plan",
      meta: { title: "招商计划" },
      component: () => import("./views/list-pages").then((module) => module.InvestmentPlanPage),
    },
    {
      path: `${BASE}/project-manage`,
      name: "factory-management-project-manage",
      meta: { title: "项目管理" },
      component: () => import("./views/list-pages").then((module) => module.ProjectManagePage),
    },
    {
      path: `${BASE}/estate-manage`,
      name: "factory-management-estate-manage",
      meta: { title: "物业管理" },
      component: () => import("./views/list-pages").then((module) => module.EstateManagePage),
    },
    {
      path: `${BASE}/enterprise-complaint`,
      name: "factory-management-enterprise-complaint",
      meta: { title: "企业投诉" },
      component: () => import("./views/list-pages").then((module) => module.EnterpriseComplaintPage),
    },
    {
      path: `${BASE}/rent-control-record`,
      name: "factory-management-rent-control-record",
      meta: { title: "租控记录" },
      component: () => import("./views/list-pages").then((module) => module.RentControlRecordPage),
    },
    {
      path: `${BASE}/enterprise-information/form`,
      name: "factory-management-enterprise-form",
      meta: { title: "企业信息表单", hideInMenu: true, activeMenuPath: `${BASE}/enterprise-information` },
      component: () => import("./views/form-pages").then((module) => module.EnterpriseFormPage),
    },
    {
      path: `${BASE}/room-information/form`,
      name: "factory-management-room-form",
      meta: { title: "房间信息表单", hideInMenu: true, activeMenuPath: `${BASE}/room-information` },
      component: () => import("./views/form-pages").then((module) => module.RoomFormPage),
    },
    {
      path: `${BASE}/enterprise-visit/form`,
      name: "factory-management-interview-form",
      meta: { title: "企业走访表单", hideInMenu: true, activeMenuPath: `${BASE}/enterprise-visit` },
      component: () => import("./views/form-pages").then((module) => module.InterviewFormPage),
    },
    {
      path: `${BASE}/enterprise-demands/form`,
      name: "factory-management-appeal-form",
      meta: { title: "企业诉求表单", hideInMenu: true, activeMenuPath: `${BASE}/enterprise-demands` },
      component: () => import("./views/form-pages").then((module) => module.AppealFormPage),
    },
    {
      path: `${BASE}/room-rental/form`,
      name: "factory-management-rental-form",
      meta: { title: "房间租赁表单", hideInMenu: true, activeMenuPath: `${BASE}/room-rental` },
      component: () => import("./views/form-pages").then((module) => module.RentalFormPage),
    },
  ],
  menuContribution: [
    {
      label: "园区管理",
      iconKey: "factory-management",
      children: [
        { label: "园区总览", entry: "bimops-manage-park-yqzl", path: `${BASE}/factory-view` },
        {
          label: "客户管理",
          entry: "parkingManage-kehuguanli",
          children: [
            { label: "企业信息", entry: "parkingManage-qiyexinxi", path: `${BASE}/enterprise-information` },
            { label: "企业名录", entry: "parkingManage-qiyeminglu", path: `${BASE}/enterprise-directory` },
            { label: "行业类型", entry: "parkingManage-hangyeleixing", path: `${BASE}/industry-type` },
          ],
        },
        {
          label: "房间管理",
          entry: "parkingManage-fangjianguanli",
          children: [
            { label: "房间信息", entry: "parkingManage-fangjianxinxi", path: `${BASE}/room-information` },
            { label: "房间类型", entry: "parkingManage-fangjainguanli", path: `${BASE}/room-type` },
          ],
        },
        {
          label: "走访诉求",
          entry: "bimops-manage-park-zfsq",
          children: [
            { label: "企业走访", entry: "parkingManage-qyezoufang", path: `${BASE}/enterprise-visit` },
            { label: "企业诉求", entry: "parkingManage-qitesyqiu", path: `${BASE}/enterprise-demands` },
            { label: "诉求类型", entry: "bimops-manage-park-sqlx", path: `${BASE}/demands-type` },
            { label: "走访类型", entry: "parkingManage-zoufangleixing", path: `${BASE}/visit-type` },
          ],
        },
        {
          label: "租赁管理",
          entry: "parkingManage-zulinxinxi",
          children: [
            { label: "房间租赁", entry: "parkingManage-fangjianzulin", path: `${BASE}/room-rental` },
            { label: "房间状态", entry: "parkingManage-fangjainzhaungtai", path: `${BASE}/room-status` },
          ],
        },
        {
          label: "运营监管",
          entry: "yqyyjg",
          children: [
            { label: "招商计划", entry: "zsjh", path: `${BASE}/investment-plan` },
            { label: "项目管理", entry: "xmgl", path: `${BASE}/project-manage` },
            { label: "物业管理", entry: "wygl", path: `${BASE}/estate-manage` },
            { label: "企业投诉", entry: "qyts", path: `${BASE}/enterprise-complaint` },
            { label: "租控记录", entry: "zkjl", path: `${BASE}/rent-control-record` },
          ],
        },
      ],
    },
  ],
  async install(_app, context) {
    await installFactoryManagementPcUi(context);
    await Promise.all([context.loadPlatform("pcUi", "platform"), context.loadPlatform("pcChart", "platform")]);
    const client = await context.ensureClient<FactoryManagementClient>("factoryManagementClient");
    installFactoryManagementContext(context, client);
  },
};

export default domainModule;
