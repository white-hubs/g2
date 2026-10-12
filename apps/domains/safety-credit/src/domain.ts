import type { SafetyCreditClient } from "@g2-client/safety-credit/client";
import type { DomainModule } from "@g2-composition/contract";

import { installSafetyCreditContext } from "./domain-context";
import { safetyCreditMenu } from "./menu";
import { routes } from "./routes";
const domain: DomainModule = {
  routes,
  menuContribution: [{ label: "安全信用", iconKey: "safety-credit", children: safetyCreditMenu }],
  async install(_app, ctx) {
    await ctx.loadRuntimeCommon("pcUi", "index");
    await ctx.loadPlatform("pcUi", "platform");
    installSafetyCreditContext(ctx, await ctx.ensureClient<SafetyCreditClient>("safetyCreditClient"));
  },
};
export default domain;
