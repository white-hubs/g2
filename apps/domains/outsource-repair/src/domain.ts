import type { MessageClient } from "@g2-client/message/client";
import type { OutsourceRepairClient } from "@g2-client/outsource-repair/client";
import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { DomainModule } from "@g2-composition/contract";

import { installOutsourceRepairContext } from "./domain-context";
import { hostStreamEnginePage } from "./mount-stream-page";
import { OUTSOURCE_REPAIR_BASE_PATH as BASE, resolveOutsourceRepairRuntime } from "./runtime";

const module: DomainModule = {
  routes: [
    { path: BASE, redirect: `${BASE}/repair-list` },
    {
      path: `${BASE}/repair-list`,
      name: "outsource-repair-list",
      meta: { title: "委外维修单" },
      component: () => import("./views/flow-list").then((value) => value.OutsourceRepairList),
    },
    {
      path: `${BASE}/repair-mode`,
      name: "outsource-repair-mode",
      meta: { title: "委外模式" },
      component: () => import("./views/mode").then((value) => value.OutsourceModeList),
    },
    {
      path: `${BASE}/repair-company`,
      name: "outsource-repair-company",
      meta: { title: "委外公司" },
      component: () => import("./views/company").then((value) => value.OutsourceCompanyList),
    },
    {
      path: `${BASE}/repair-device`,
      name: "outsource-repair-device",
      meta: { title: "委外设备" },
      component: () => import("./views/device").then((value) => value.OutsourceDeviceList),
    },
    {
      path: `${BASE}/repair-traffic`,
      name: "outsource-repair-traffic",
      meta: { title: "委外业务配置" },
      component: () => import("./views/traffic").then((value) => value.OutsourceTrafficConfigPage),
    },
    {
      path: `${BASE}/message-notice`,
      name: "outsource-repair-message-notice",
      meta: { title: "委外消息配置" },
      component: () => import("./views/message-notice").then((value) => value.OutsourceMessageNotice),
    },
    {
      path: `${BASE}/flow-config`,
      name: "outsource-repair-flow-config",
      meta: { title: "流程配置" },
      component: () => hostStreamEnginePage("ApprovalConfig", { title: "流程配置" }),
    },
    {
      path: `${BASE}/flow-render`,
      name: "outsource-repair-flow-render",
      meta: { title: "委外维修流程", hideInMenu: true, activeMenuPath: `${BASE}/repair-list` },
      component: () => hostStreamEnginePage("StreamEngineRender", { title: "委外维修单", activeMenuEntry: "repair-list" }),
    },
  ],
  /**
   * 委外工单（`views/repair-order`）与旧维修单详情（`views/repair-list-details`）已迁移为可导入模块，
   * 按产品要求暂不注册路由与菜单；确认入口后再挂路由即可。
   */
  menuContribution: [
    {
      label: "委外维修",
      iconKey: "outsource",
      children: [
        { label: "委外维修单", entry: "repair-list", path: `${BASE}/repair-list` },
        {
          label: "委外配置",
          children: [
            { label: "委外模式@", entry: "repair-mode", path: `${BASE}/repair-mode` },
            { label: "委外公司@", entry: "repair-company", path: `${BASE}/repair-company` },
            { label: "委外设备@", entry: "repair-device", path: `${BASE}/repair-device` },
            { label: "委外业务配置@", entry: "repair-traffic", path: `${BASE}/repair-traffic` },
            { label: "委外消息配置@", entry: "message-notice", path: `${BASE}/message-notice` },
          ],
        },
        { label: "流程配置", entry: "flow-config", path: `${BASE}/flow-config` },
      ],
    },
  ],
  async install(_app, context, config) {
    await context.loadRuntimeCommon("pcUi", "index");
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<OutsourceRepairClient>("outsourceRepairClient");
    installOutsourceRepairContext(
      context,
      client,
      resolveOutsourceRepairRuntime({ applicationCode: config?.applicationCode, basePath: BASE }),
    );
    await context.ensureClient<StreamEngineClient>("streamEngineClient");
    // 消息配置页需要按场景读取可用通知方式。
    await context.ensureClient<MessageClient>("messageClient");
  },
};

export default module;
