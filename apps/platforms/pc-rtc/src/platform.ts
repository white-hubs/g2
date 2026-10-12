import type { PlatformModule } from "@g2-composition/contract";

import { registerRtcHandlers } from "./handlers";

export const platformModule: PlatformModule = {
  label: "pc-rtc",
  install: async (_app, _router, ctx) => {
    registerRtcHandlers(ctx.bus);
  },
};

export default platformModule;
