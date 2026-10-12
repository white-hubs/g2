import type { RenovationClient } from "@g2-client/renovation/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainModule } from "@g2-composition/contract";

import { installRenovationContext } from "./domain-context";
import { hostStreamEnginePage } from "./mount-stream-page";
import { RENOVATION_BASE_PATH as BASE, resolveRenovationRuntime } from "./runtime";

const module: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/renovation-list` },
    {
      path: `${BASE}/renovation-list`,
      name: "renovation-list",
      meta: { title: "更新改造单" },
      component: () => import("./views/flow-list").then((value) => value.RenovationList),
    },
    {
      path: `${BASE}/flow-config`,
      name: "renovation-flow-config",
      meta: { title: "流程配置" },
      component: () => hostStreamEnginePage("ApprovalConfig", { title: "流程配置" }),
    },
    {
      path: `${BASE}/flow-render`,
      name: "renovation-flow-render",
      meta: { title: "更新改造流程", hideInMenu: true, activeMenuPath: `${BASE}/renovation-list` },
      component: () => hostStreamEnginePage("StreamEngineRender", { title: "更新改造单", activeMenuEntry: "renovation-list" }),
    },
  ],
  /**
   * 菜单对齐当前 OUAA：更新改造单 + 流程配置。
   * 工单 / 业务配置 / 通知配置已迁为可导入模块，暂不注册路由与菜单。
   */
  menuContribution: [
    {
      label: "更新改造",
      iconKey: "renovation",
      children: [
        { label: "更新改造单", entry: "renovation-list", path: `${BASE}/renovation-list` },
        { label: "流程配置", entry: "flow-config", path: `${BASE}/flow-config` },
      ],
    },
  ],
  async install(_app, context, config) {
    await context.loadRuntimeCommon("pcUi", "index");
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<RenovationClient>("renovationClient");
    installRenovationContext(context, client, resolveRenovationRuntime({ applicationCode: config?.applicationCode, basePath: BASE }));
    await context.ensureClient<StreamEngineClient>("streamEngineClient");
  },
};

export default module;
