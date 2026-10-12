import type { PlatformModule } from "@g2-composition/contract";

import SideMenu from "./components/SideMenu";
import TopBar from "./components/TopBar";
import { installNavigateErrorHandler } from "./navigate-error-handler";
import { installPcChromePcUi, message } from "./pc-ui-runtime";
import { bindResourceApi } from "./resource-api";
import { restoreSkinTheme } from "./skin-theme";
import { topBarActionsRegistry, wireTopBarActionsRegistryToBus } from "./top-bar-actions-registry";

import "./styles/tailwind.css";

export const platformModule: PlatformModule = {
  label: "pc-chrome",
  slots: {
    "chrome.topBar": TopBar,
    "chrome.sideMenu": SideMenu,
  },
  install: async (_app, _router, ctx) => {
    await installPcChromePcUi(ctx);
    await bindResourceApi(ctx);
    restoreSkinTheme();
    wireTopBarActionsRegistryToBus(ctx.bus, topBarActionsRegistry);
    installNavigateErrorHandler(ctx.bus, { messageError: (content) => message.error(content) });
  },
};

export default platformModule;
