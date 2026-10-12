import type { PlatformModule } from "@g2-composition/contract";

import { installPcMapPcUi } from "./pc-ui-runtime";

export const platformModule: PlatformModule = {
  label: "pc-map",
  install: async (_app, _router, ctx) => installPcMapPcUi(ctx),
};

export default platformModule;
