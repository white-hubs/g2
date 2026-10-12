import type { LinkageClient } from "@g2-contract/linkage-control";
import type { MessageClient } from "@g2-contract/message";
import type { DomainModule } from "@g2-composition/contract";

import { installLinkageControlClient } from "./domain-context";
import { installLinkageControlPcUi } from "./pc-ui-runtime";

const BASE = "/d/linkage-control";
const kinds = ["condition", "scene", "time"] as const;
const listPath = (kind: (typeof kinds)[number]): string => `${BASE}/${kind === "condition" ? "condition" : kind}-rules`;
const listRoute = (name: string, title: string, kind: "condition" | "scene" | "time" | "condition-log" | "scene-log" | "time-log") => ({
  path: `${BASE}/${name}`,
  name: `linkage-control-${name}`,
  meta: { title },
  component: () => import("./views/list-pages").then((module) => kind.endsWith("log") ? module.LinkageEventPage(kind as "condition-log" | "scene-log" | "time-log") : module.LinkageRulePage(kind as "condition" | "scene" | "time")),
});

const domain: DomainModule = {
  routes: [
    { path: BASE, name: "linkage-control-home", redirect: `${BASE}/condition-rules` },
    listRoute("condition-rules", "规则联动列表", "condition"),
    listRoute("condition-logs", "规则联动日志", "condition-log"),
    listRoute("scene-rules", "场景联动列表", "scene"),
    listRoute("scene-logs", "场景联动日志", "scene-log"),
    listRoute("time-rules", "定时联动列表", "time"),
    listRoute("time-logs", "定时联动日志", "time-log"),
    { path: `${BASE}/message-config`, name: "linkage-control-message-config", meta: { title: "消息配置" }, component: () => import("./views/message-config").then((module) => module.LinkageMessageConfigPage) },
    ...kinds.map((kind) => ({
      path: `${BASE}/rule-edit/${kind}/:id?`, name: `linkage-control-${kind}-edit`,
      meta: { title: "编辑联动", hideInMenu: true, activeMenuPath: listPath(kind) },
      component: () => import("./views/rule-editor").then((module) => module.LinkageRuleEditorPage(kind)),
    })),
    ...kinds.map((kind) => ({
      path: `${BASE}/event-detail/${kind}/:id`, name: `linkage-control-${kind}-event-detail`,
      meta: { title: "事件详情", hideInMenu: true, activeMenuPath: `${BASE}/${kind}-logs` },
      component: () => import("./views/rule-detail").then((module) => module.LinkageRuleDetailPage),
    })),
    { path: `${BASE}/reserve-plan`, name: "linkage-control-reserve-plan", meta: { title: "预案设置", hideInMenu: true, activeMenuPath: `${BASE}/condition-rules` }, component: () => import("./views/reserve-plan").then((module) => module.LinkageReservePlanPage) },
  ],
  menuContribution: [
    {
      label: "联动控制",
      iconKey: "linkage-control",
      children: [
        { label: "规则联动", entry: "rule-linkage", children: [
          { label: "规则联动列表", entry: "condition-rules", path: `${BASE}/condition-rules` },
          { label: "联动日志", entry: "condition-logs", path: `${BASE}/condition-logs` },
        ] },
        { label: "场景联动", entry: "scene-linkage", children: [
          { label: "场景联动列表", entry: "scene-rules", path: `${BASE}/scene-rules` },
          { label: "场景日志", entry: "scene-logs", path: `${BASE}/scene-logs` },
        ] },
        { label: "定时联动", entry: "time-linkage", children: [
          { label: "定时联动列表", entry: "time-rules", path: `${BASE}/time-rules` },
          { label: "定时日志", entry: "time-logs", path: `${BASE}/time-logs` },
        ] },
        { label: "业务配置", entry: "business-config", children: [
          { label: "消息配置", entry: "message-config", path: `${BASE}/message-config` },
        ] },
      ],
    },
  ],
  async install(_app, context) {
    await installLinkageControlPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const [client, messages] = await Promise.all([
      context.ensureClient<LinkageClient>("linkageControlClient"),
      context.ensureClient<MessageClient>("messageClient"),
    ]);
    installLinkageControlClient(client, messages);
  },
};

export default domain;
