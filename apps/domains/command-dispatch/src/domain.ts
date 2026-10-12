import type { DomainModule } from "@g2-composition/contract";
import type { CommandDispatchClient } from "@g2-contract/command-dispatch";

import { DOMAIN_CONTEXT_KEY, installCommandDispatchContext, installCommandDispatchResourceApi } from "./domain-context";
import { installCommandDispatchPcUi } from "./pc-ui-runtime";

const BASE = "/d/command-dispatch";

const domain: DomainModule = {
  routes: [
    { path: BASE, name: "command-dispatch-home", meta: { title: "指挥调度" }, redirect: `${BASE}/radio-record` },
    {
      path: `${BASE}/radio-record`,
      name: "command-dispatch-radio-record",
      meta: { title: "录音记录" },
      component: () => import("./views/radio-record").then((m) => m.RadioRecord),
    },
    {
      path: `${BASE}/intercom-group-config`,
      name: "command-dispatch-intercom-group-config",
      meta: { title: "对讲组配置" },
      component: () => import("./views/intercom-group-config").then((m) => m.IntercomGroupConfig),
    },
    {
      path: `${BASE}/account-config`,
      name: "command-dispatch-account-config",
      meta: { title: "账号配置" },
      component: () => import("./views/account-config").then((m) => m.AccountConfig),
    },
    {
      path: `${BASE}/priority-department-config`,
      name: "command-dispatch-priority-department-config",
      meta: { title: "优先排序部门" },
      component: () => import("./views/priority-department-config").then((m) => m.PriorityDepartmentConfig),
    },
    {
      path: `${BASE}/dispatch-map-config`,
      name: "command-dispatch-map-config",
      meta: { title: "地图配置" },
      component: () => import("./views/dispatch-map-config").then((m) => m.MapConfig),
    },
    {
      path: `${BASE}/background-config`,
      name: "command-dispatch-background-config",
      meta: { title: "背景配置" },
      component: () => import("./views/background-config").then((m) => m.BackgroundConfig),
    },
  ],
  menuContribution: [
    {
      label: "指挥调度",
      iconKey: "command-dispatch",
      children: [
        { label: "历史记录", children: [{ label: "录音记录", entry: "radio-record", path: `${BASE}/radio-record` }] },
        {
          label: "系统配置",
          children: [
            { label: "对讲组配置", entry: "intercom-group-config", path: `${BASE}/intercom-group-config` },
            { label: "账号配置", entry: "account-config", path: `${BASE}/account-config` },
            { label: "优先排序部门", entry: "priority-department-config", path: `${BASE}/priority-department-config` },
          ],
        },
        { label: "地图配置", entry: "dispatch-map-config", path: `${BASE}/dispatch-map-config` },
        { label: "背景配置", entry: "background-config", path: `${BASE}/background-config` },
      ],
    },
  ],
  async install(app, ctx) {
    await installCommandDispatchPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcMap", "platform");
    await installCommandDispatchResourceApi(ctx);
    const client = await ctx.ensureClient<CommandDispatchClient>("commandDispatchClient");
    installCommandDispatchContext(ctx, client);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
  },
};

export default domain;
