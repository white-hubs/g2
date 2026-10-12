import type { DomainModule } from "@g2-composition/contract";
import type { MdataClient } from "@g2-contract/mdata";

import { installLogClient } from "./domain-context";
import { installLogManagementPcUi } from "./pc-ui-runtime";

const BASE = "/d/log-management";
const domain: DomainModule = {
  routes: [
    { path: BASE, name: "log-management-home", redirect: BASE + "/handle-record" },
    {
      path: BASE + "/handle-record",
      name: "log-management-handle-record",
      meta: { title: "操作日志记录" },
      component: () => import("./views/handle-record").then((m) => m.HandleRecord),
    },
  ],
  menuContribution: [
    {
      label: "日志管理",
      iconKey: "log-management",
      children: [{ label: "操作日志记录", entry: "handle-record", path: BASE + "/handle-record" }],
    },
  ],
  async install(_app, ctx) {
    await installLogManagementPcUi(ctx);
    await ctx.loadPlatform("pcUi", "platform");
    installLogClient(await ctx.ensureClient<MdataClient>("mdataClient"));
  },
};

export default domain;
