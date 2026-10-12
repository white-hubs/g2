import type { TodoCenterClient } from "@g2-client/todo-center/client";
import type { DomainModule } from "@g2-composition/contract";

import { installTodoCenterChart, installTodoCenterContext } from "./domain-context";
import { installTodoCenterPcUi } from "./pc-ui-runtime";
const BASE = "/d/todo-center";
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "todo-center", meta: { title: "待办中心" }, redirect: `${BASE}/waiting` },
    {
      path: `${BASE}/waiting`,
      name: "todo-center-waiting",
      meta: { title: "待处理" },
      component: () => import("./views/task-list").then((m) => m.WaitingTasks),
    },
    { path: `${BASE}/waitingList`, name: "todo-center-waiting-legacy", redirect: `${BASE}/waiting` },
    {
      path: `${BASE}/done`,
      name: "todo-center-done",
      meta: { title: "已处理" },
      component: () => import("./views/task-list").then((m) => m.DoneTasks),
    },
    { path: `${BASE}/doneList`, name: "todo-center-done-legacy", redirect: `${BASE}/done` },
    { path: `${BASE}/handover-record`, name: "todo-center-handover-legacy", redirect: `${BASE}/done` },
    {
      path: `${BASE}/overview`,
      name: "todo-center-overview",
      meta: { title: "待办统计" },
      component: () => import("./views/overview").then((m) => m.TodoOverview),
    },
    { path: `${BASE}/waitingOverview`, name: "todo-center-overview-legacy", redirect: `${BASE}/overview` },
  ],
  menuContribution: [
    {
      label: "待办中心",
      iconKey: "todo-center",
      children: [
        { label: "待处理", entry: "waiting", path: `${BASE}/waiting` },
        { label: "已处理", entry: "done", path: `${BASE}/done` },
        { label: "待办统计", entry: "overview", path: `${BASE}/overview` },
      ],
    },
  ],
  async install(_app, ctx) {
    await installTodoCenterPcUi(ctx);
    installTodoCenterChart((await ctx.loadRuntimeCommon("pcChart", "index")) as typeof import("@g2-platform/pc-chart"));
    await Promise.all([ctx.loadPlatform("pcUi", "platform"), ctx.loadPlatform("pcChart", "platform")]);
    const client = await ctx.ensureClient<TodoCenterClient>("todoCenterClient");
    installTodoCenterContext(ctx, client);
  },
};
export default domain;
