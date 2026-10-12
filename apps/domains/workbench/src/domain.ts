import type { WorkbenchClient } from "@g2-client/workbench/client";
import type { DomainModule } from "@g2-composition/contract";

import { DOMAIN_CONTEXT_KEY, installWorkbenchContext } from "./domain-context";
import { installWorkbenchPcUi } from "./pc-ui-runtime";

import "./assets/workbench-global.less";

/** 工作台首页仍对齐旧仓入口语义，但挂到 MF Domain 标准前缀 `/d/workbench`。 */
export const WORKBENCH_BASE = "/d/workbench";
export const WORKBENCH_CONFIG_PATH = `${WORKBENCH_BASE}/config`;

const domainModule: DomainModule = {
  routes: [
    {
      path: WORKBENCH_BASE,
      name: "workbench-home",
      meta: { title: "工作台" },
      component: () => import("./views/index/index").then((m) => m.default),
    },
    {
      path: WORKBENCH_CONFIG_PATH,
      name: "workbench-config",
      meta: { title: "卡片配置" },
      component: () => import("./views/work-bench/work-bench").then((m) => m.default),
    },
  ],
  // 顶栏「工作台」分组仍由壳层自持；此处不贡献侧栏菜单。
  menuContribution: [],
  async install(app, ctx) {
    await installWorkbenchPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    const { bindWorkbenchResourceApi } = await import("./utils/resource");
    // 图片类 /resource 仍走 resourcePlatform；Cube iconfont 改由壳启动注入，此处不再拉取。
    await bindWorkbenchResourceApi(ctx);
    const client = await ctx.ensureClient<WorkbenchClient>("workbenchClient");
    installWorkbenchContext(ctx, client);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domainModule;
