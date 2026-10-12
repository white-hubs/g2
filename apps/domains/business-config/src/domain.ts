import type { DomainModule } from "@g2-composition/contract";
import type { BusinessConfigClient } from "@g2-contract/business-config";

import { installBusinessConfigClient, installBusinessConfigContext } from "./domain-context";
import { installBusinessConfigPcUi } from "./pc-ui-runtime";

const BASE = "/d/business-config";
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "business-config-home", redirect: `${BASE}/stream-media` },
    {
      path: `${BASE}/area-management`,
      name: "business-config-area-management",
      meta: { title: "区域管理" },
      component: () => import("./views/area-management").then((module) => module.AreaManagementPage),
    },
    {
      path: `${BASE}/service-configuration`,
      name: "business-config-service-configuration",
      meta: { title: "业务配置" },
      component: () => import("./views/business-configuration").then((module) => module.BusinessConfigurationPage),
    },
    ...(["terminal", "application", "menu"] as const).map((kind) => ({
      path: `${BASE}/alias/${kind}`,
      name: `business-config-alias-${kind}`,
      meta: {
        title: kind === "terminal" ? "访问端别名配置" : kind === "application" ? "应用别名配置" : "菜单别名配置",
        hideInMenu: true,
        activeMenuPath: `${BASE}/service-configuration`,
      },
      component: () => import("./views/business-configuration").then((module) => module.AliasManagementPage(kind)),
    })),
    {
      path: `${BASE}/stream-media`,
      name: "business-config-stream-media",
      meta: { title: "流媒体配置" },
      component: () => import("./views/stream-media").then((module) => module.StreamMediaPage),
    },
    {
      path: `${BASE}/file-cleanup-config`,
      name: "business-config-file-cleanup-config",
      meta: { title: "文件清理策略配置" },
      component: () => import("./views/file-cleanup-config").then((module) => module.FileCleanupPolicyPage),
    },
    {
      path: `${BASE}/video-analysis-box`,
      name: "business-config-video-analysis-box",
      meta: { title: "分析盒子配置" },
      component: () => import("./views/video-analysis-box").then((module) => module.VideoAnalysisBoxPage),
    },
    {
      path: `${BASE}/third-party-services`,
      name: "business-config-third-party-services",
      meta: { title: "三方服务配置" },
      component: () => import("./views/third-party-services").then((module) => module.ThirdPartyServicesPage),
    },
    {
      path: `${BASE}/business-tag`,
      name: "business-config-business-tag",
      meta: { title: "业务标签管理" },
      component: () => import("./views/business-tag").then((module) => module.BusinessTagPage),
    },
    {
      path: `${BASE}/business-tag/:id`,
      name: "business-config-business-tag-details",
      meta: { title: "业务标签详情", hideInMenu: true, activeMenuPath: `${BASE}/business-tag` },
      component: () => import("./views/business-tag-details").then((module) => module.BusinessTagDetailsPage),
    },
  ],
  menuContribution: [
    {
      label: "业务设置",
      iconKey: "resource-management",
      children: [
        { label: "流媒体配置", entry: "stream-media", path: `${BASE}/stream-media` },
        { label: "三方服务配置", entry: "third-party-services", path: `${BASE}/third-party-services` },
        { label: "区域管理", entry: "area-management", path: `${BASE}/area-management` },
        { label: "分析盒子配置", entry: "video-analysis-box", path: `${BASE}/video-analysis-box` },
        { label: "业务配置", entry: "service-configuration", path: `${BASE}/service-configuration` },
        { label: "文件清理策略配置", entry: "file-cleanup-config", path: `${BASE}/file-cleanup-config` },
        { label: "业务标签管理", entry: "business-tag", path: `${BASE}/business-tag` },
      ],
    },
  ],
  async install(_app, context) {
    await installBusinessConfigPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    installBusinessConfigContext(context);
    installBusinessConfigClient(await context.ensureClient<BusinessConfigClient>("businessConfigClient"));
  },
};

export default domain;
