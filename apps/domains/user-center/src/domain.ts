import type { DomainModule } from "@g2-composition/contract";
import type { UserCenterClient } from "@g2-contract/user-center";

import { installUserCenterContext } from "./domain-context";
import { installUserCenterPcUi } from "./pc-ui-runtime";

const BASE = "/d/user-center";
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "user-center-home", redirect: BASE + "/reader-list" },
    {
      path: BASE + "/reader-list",
      name: "user-center-reader-list",
      meta: { title: "读者列表" },
      component: () => import("./views/reader-list").then((m) => m.ReaderList),
    },
    {
      path: BASE + "/group-list",
      name: "user-center-group-list",
      meta: { title: "组织管理" },
      component: () => import("./views/group-list").then((m) => m.GroupList),
    },
    {
      path: BASE + "/user-list",
      name: "user-center-user-list",
      meta: { title: "用户列表" },
      component: () => import("./views/user-list").then((m) => m.UserList),
    },
    {
      path: BASE + "/user-role",
      name: "user-center-user-role",
      meta: { title: "用户角色" },
      component: () => import("./views/user-role").then((m) => m.UserRole),
    },
  ],
  menuContribution: [
    {
      label: "用户中心",
      iconKey: "user-center",
      children: [
        { label: "读者中心", children: [{ label: "读者列表", entry: "reader-list", path: BASE + "/reader-list" }] },
        { label: "组织管理", entry: "group-list", path: BASE + "/group-list" },
        { label: "用户列表", entry: "user-list", path: BASE + "/user-list" },
        { label: "用户角色", entry: "user-role", path: BASE + "/user-role" },
      ],
    },
  ],
  async install(_app, ctx) {
    await installUserCenterPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    installUserCenterContext(ctx, await ctx.ensureClient<UserCenterClient>("userCenterClient"));
  },
};

export default domain;
