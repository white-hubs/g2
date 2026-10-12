import type { DomainModule } from "@g2-composition/contract";
import type { ConsumptionManagementClient } from "@g2-contract/consumption-management";

import { installConsumptionManagementContext } from "./domain-context";
import { installConsumptionManagementPcUi } from "./pc-ui-runtime";

const BASE = "/d/consumption-management";
const ACCOUNT = `${BASE}/accountmanagement`;

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "consumption-management-home", meta: { title: "消费管理" }, redirect: ACCOUNT },
    {
      path: ACCOUNT,
      name: "consumption-management-account",
      meta: { title: "账户管理" },
      component: () => import("./views/account/list-page").then((module) => module.AccountManagementPage),
    },
    {
      path: `${BASE}/accountmanagement/details`,
      name: "consumption-management-account-details",
      meta: { title: "账户详情", hideInMenu: true, activeMenuPath: ACCOUNT },
      component: () => import("./views/account/details-page").then((module) => module.AccountDetailsPage),
    },
    {
      path: `${BASE}/partchange`,
      name: "consumption-management-part-change",
      meta: { title: "份变更明细" },
      component: () => import("./views/change/part-page").then((module) => module.PartChangePage),
    },
    {
      path: `${BASE}/moneychange`,
      name: "consumption-management-money-change",
      meta: { title: "金额变更明细" },
      component: () => import("./views/change/money-page").then((module) => module.MoneyChangePage),
    },
    {
      path: `${BASE}/person-record`,
      name: "consumption-management-person-record",
      meta: { title: "我的消费记录" },
      component: () => import("./views/person-record-page").then((module) => module.PersonRecordPage),
    },
  ],
  menuContribution: [
    {
      label: "消费管理",
      iconKey: "consumption-management",
      children: [
        { label: "账户管理", entry: "01", path: ACCOUNT },
        { label: "份变更明细", entry: "03", path: `${BASE}/partchange` },
        { label: "金额变更明细", entry: "02", path: `${BASE}/moneychange` },
        { label: "我的消费记录", entry: "PersonRecord", path: `${BASE}/person-record` },
      ],
    },
  ],
  async install(_app, context) {
    await installConsumptionManagementPcUi(context);
    await context.loadPlatform("pcUi", "platform");
    const client = await context.ensureClient<ConsumptionManagementClient>("consumptionManagementClient");
    installConsumptionManagementContext(context, client);
  },
};

export default domainModule;
