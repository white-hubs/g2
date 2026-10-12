import type { PlatformModule } from "@g2-composition/contract";

import { registerMessagingHandlers } from "./handlers";
import { startMessageSocket } from "./message-socket";

export const platformModule: PlatformModule = {
  label: "pc-messaging",
  install: async (_app, _router, ctx) => {
    await ctx.ensureClient("messageClient");
    registerMessagingHandlers(ctx.bus);
    startMessageSocket({
      bus: ctx.bus,
      getAuthHeaders: ctx.getAuthHeaders,
      subscribeType: "broadcast",
    });
  },
};

export default platformModule;
