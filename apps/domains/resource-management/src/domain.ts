import type { DomainModule } from "@g2-composition/contract";
import type { ResourceManagementClient } from "@g2-contract/resource-management";

import { installResourceManagementClient } from "./domain-context";
import { installResourceManagementPcUi } from "./pc-ui-runtime";

const BASE = "/d/resource-management";
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "resource-management-home", redirect: BASE + "/stuff-search" },
    {
      path: BASE + "/stuff-search",
      name: "resource-management-stuff-search",
      meta: { title: "物品查询" },
      component: () => import("./views/stuff-search").then((m) => m.StuffSearch),
    },
  ],
  menuContribution: [
    {
      label: "资源管理",
      iconKey: "resource-management",
      children: [{ label: "物品查询", entry: "stuff-search", path: BASE + "/stuff-search" }],
    },
  ],
  async install(_app, ctx, config) {
    await installResourceManagementPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    const headers = ctx.getAuthHeaders();
    installResourceManagementClient(
      await ctx.ensureClient<ResourceManagementClient>("resourceManagementClient"),
      typeof config?.terminal === "string" ? config.terminal : headers.terminal,
      headers.tenant ?? "",
    );
  },
};

export default domain;
