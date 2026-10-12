import type { PlatformModule } from "@g2-composition/contract";

import { createAlarmPopupInstall } from "./platform-install";

export const platformModule: PlatformModule = {
  label: "pc-alarm-popup",
  install: createAlarmPopupInstall({
    mountOverlay(deps) {
      void import("./overlay/mount-overlay").then(({ mountAlarmPopupOverlay }) => {
        mountAlarmPopupOverlay(deps);
      });
    },
  }),
};

export default platformModule;
