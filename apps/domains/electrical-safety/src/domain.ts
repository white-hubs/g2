import type { ElectricalSafetyClient } from "@g2-client/electrical-safety/client";
import type { DomainModule } from "@g2-composition/contract";

import { installElectricalSafetyContext } from "./domain-context";
import { electricalSafetyMenu } from "./menu";
import { installElectricalSafetyGraphEditor } from "./pc-graph-editor-runtime";
import { installElectricalSafetyScada } from "./pc-scada-runtime";
import { routes } from "./routes";
const domain: DomainModule = {
  routes,
  menuContribution: [{ label: "电气安全", iconKey: "electrical-safety", children: electricalSafetyMenu }],
  async install(_app, ctx) {
    await Promise.all([
      ctx.loadRuntimeCommon("pcUi", "index"),
      ctx.loadRuntimeCommon("pcPlayer", "index"),
      installElectricalSafetyGraphEditor(ctx),
      installElectricalSafetyScada(ctx),
    ]);
    await ctx.loadPlatform("pcUi", "platform");
    installElectricalSafetyContext(ctx, await ctx.ensureClient<ElectricalSafetyClient>("electricalSafetyClient"));
  },
};
export default domain;
