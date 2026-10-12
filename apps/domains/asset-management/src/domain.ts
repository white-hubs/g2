import type { DomainModule, MenuContributionNode } from "@g2-composition/contract";
import type { AssetClient } from "@g2-contract/asset-management";

import { installContext } from "./domain-context";
import { LIST_CONFIG } from "./list-config";
import { type AssetMenu, BASE, MENUS } from "./menu-data";
import { hostStreamPage } from "./stream-page-host";
const menu = (item: AssetMenu): MenuContributionNode => ({
  label: item.label,
  entry: item.entry,
  ...(item.children ? { children: item.children.map((child) => menu(child)) } : { path: `${BASE}/${item.slug}` }),
});
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "asset-management-home", meta: { title: "资产管理" }, redirect: `${BASE}/overView` },
    ...Object.entries(LIST_CONFIG).map(([slug, config]) => ({
      path: `${BASE}/${slug}`,
      name: `asset-management-${slug}`,
      meta: { title: config.title },
      component: () => import("./list-page").then((module) => module.createListPage(slug)),
    })),
    {
      path: `${BASE}/overView`,
      name: "asset-management-overview",
      meta: { title: "数据总览" },
      component: () => import("./overview").then((module) => module.OverviewPage),
    },
    {
      path: `${BASE}/deptAsset`,
      name: "asset-management-departments",
      meta: { title: "部门资产汇总" },
      component: () => import("./report-pages").then((module) => module.DepartmentAssets),
    },
    {
      path: `${BASE}/inoutstatistics`,
      name: "asset-management-inout",
      meta: { title: "耗材出入库统计" },
      component: () => import("./report-pages").then((module) => module.InoutStatistics),
    },
    {
      path: `${BASE}/deptUseStatistics`,
      name: "asset-management-department-use",
      meta: { title: "耗材部门领用统计" },
      component: () => import("./report-pages").then((module) => module.DepartmentUseStatistics),
    },
    {
      path: `${BASE}/assetClass`,
      name: "asset-management-classes",
      meta: { title: "资产分类" },
      component: () => import("./system-pages").then((module) => module.AssetClasses),
    },
    {
      path: `${BASE}/assetAdministrators`,
      name: "asset-management-administrators",
      meta: { title: "资产管理员" },
      component: () => import("./system-pages").then((module) => module.AssetAdministrators),
    },
    {
      path: `${BASE}/messageConfig`,
      name: "asset-management-messages",
      meta: { title: "消息配置" },
      component: () => import("./message-config").then((module) => module.MessageConfigPage),
    },
    {
      path: `${BASE}/flow-config`,
      name: "asset-management-flows",
      meta: { title: "流程配置" },
      component: () => import("./flow-config").then((module) => module.FlowConfigPage),
    },
    {
      path: `${BASE}/inventoryDetail`,
      name: "asset-management-inventory-detail",
      meta: { title: "资产详情", hideInMenu: true, activeMenuPath: `${BASE}/assetInventory` },
      component: () => import("./asset-detail").then((module) => module.AssetDetail),
    },
    {
      path: `${BASE}/asset-check-add`,
      name: "asset-management-check-add",
      meta: { title: "新增资产盘点", hideInMenu: true, activeMenuPath: `${BASE}/asset-check` },
      component: () => import("./check-pages").then((module) => module.AssetCheckAdd),
    },
    {
      path: `${BASE}/asset-check-detail`,
      name: "asset-management-check-detail",
      meta: { title: "资产盘点详情", hideInMenu: true, activeMenuPath: `${BASE}/asset-check` },
      component: () => import("./check-pages").then((module) => module.createCheckDetail("asset")),
    },
    {
      path: `${BASE}/consumable-check-detail`,
      name: "asset-management-consumable-check-detail",
      meta: { title: "耗材盘点详情", hideInMenu: true, activeMenuPath: `${BASE}/consumable-check` },
      component: () => import("./check-pages").then((module) => module.createCheckDetail("consumable")),
    },
    {
      path: `${BASE}/deptAssetList`,
      name: "asset-management-department-assets",
      meta: { title: "部门资产清单", hideInMenu: true, activeMenuPath: `${BASE}/deptAsset` },
      component: () => import("./report-pages").then((module) => module.DepartmentAssetList),
    },
    ...Object.entries(LIST_CONFIG)
      .filter(([, config]) => config.flow)
      .map(([slug, config]) => ({
        path: `${BASE}/${slug}/flow-render`,
        name: `asset-management-${slug}-flow`,
        meta: { title: config.title, hideInMenu: true, activeMenuPath: `${BASE}/${slug}` },
        component: () => hostStreamPage(`${BASE}/${slug}`, config.flow!, config.title),
      })),
    {
      path: `${BASE}/deptUseStatistics/flow-render`,
      name: "asset-management-department-use-flow",
      meta: { title: "领用详情", hideInMenu: true, activeMenuPath: `${BASE}/deptUseStatistics` },
      component: () => hostStreamPage(`${BASE}/deptUseStatistics`, "DEPARTMENT_USE", "耗材领用"),
    },
  ],
  menuContribution: [{ label: "资产管理", children: MENUS.map((item) => menu(item)) }],
  async install(_app, context) {
    await context.loadRuntimeCommon("pcUi", "index");
    installContext(context, await context.ensureClient<AssetClient>("assetManagementClient"));
  },
};
export default domain;
