import type { PlatformContext, PlatformModule } from "@g2-composition/contract";
import type { AuthClient } from "@g2-contract/auth";
import { restoreTheme } from "@g2-platform/theme-contract";
import { type App, createApp, h, reactive } from "vue";
import type { Router } from "vue-router";

import { createAuthStrategyRegistry, setEnabledStrategies } from "./auth-strategy";
import CheckPasswordModal from "./components/CheckPasswordModal";
import LoginPage from "./components/LoginPage";
import VerifyAuthPage from "./components/VerifyAuthPage";
import type { HttpClientModule } from "./http-client-module";
import { type PasswordState, shouldShowPasswordExpiredModal } from "./install-check-password";
import { bindLoggerApi } from "./logger-api";
import { installPcAuthPcUi } from "./pc-ui-runtime";
import { createCasSsoStrategy } from "./strategies/cas-sso";
import { standardStrategy } from "./strategies/standard";

import "./styles/tailwind.css";

function mountCheckPasswordModal(_app: App, router: Router, ctx: PlatformContext): void {
  const state = reactive<PasswordState>({ passwordExpired: false, passwordForced: false, dismissedThisSession: false });
  ctx.bus.subscribe("auth:session-ready", (payload) => {
    const session = payload as PasswordState;
    Object.assign(state, session);
  });

  const mountPoint = document.createElement("div");
  document.body.append(mountPoint);
  const modalApp = createApp({
    setup() {
      return () =>
        h(CheckPasswordModal, {
          visible: shouldShowPasswordExpiredModal(state, router.currentRoute.value.path),
          forced: state.passwordForced,
          onDismiss: () => {
            state.dismissedThisSession = true;
          },
          onGoModify: () => {
            ctx.bus.publish("navigate-intent", { code: "PERSON-MANAGE", path: "/portal/legacy-personal/modify-password" });
          },
        });
    },
  });
  modalApp.mount(mountPoint);
}

export const platformModule: PlatformModule = {
  label: "pc-auth",
  slots: {
    "auth.login": LoginPage,
    "auth.verifyAuth": VerifyAuthPage,
  },
  install: async (app, router, ctx, config) => {
    await installPcAuthPcUi(ctx);
    // 登录页早于 Chrome 挂载，先恢复缓存主题以避免亮色闪烁。
    restoreTheme();
    await bindLoggerApi(ctx);
    const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
    const http = httpModule.createHttpClientForPlatform(ctx);
    const auth = await ctx.ensureClient<AuthClient>("authClient");
    const registry = createAuthStrategyRegistry([standardStrategy, createCasSsoStrategy({ auth, http })], config ?? {});
    setEnabledStrategies(registry.enabled);
    mountCheckPasswordModal(app, router, ctx);
  },
};

export default platformModule;
