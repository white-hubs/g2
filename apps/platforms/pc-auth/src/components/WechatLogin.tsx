import type { PlatformContext } from "@g2-composition/contract";
import type { AuthClient } from "@g2-contract/auth";
import type { OuaaClient } from "@g2-contract/ouaa";
import { HttpServiceError } from "@g2-platform/http/client";
import { type PropType, computed, defineComponent, onMounted, ref } from "vue";

import { extractBindTokenId, isAccountNotBoundError } from "../bind-error";
import { createLogger } from "../logger-api";
import { Spin, message } from "../pc-ui-runtime";
import { WECHAT_APPID, WECHAT_REDIRECT_URI, buildWechatQrConnectUrl, shouldHandleWechatCallback } from "../wechat-login";

import "./WechatLogin.css";

export default defineComponent({
  name: "WechatLogin",
  props: {
    ctx: { type: Object as PropType<PlatformContext>, required: true },
    onLoginSuccess: {
      type: Function as PropType<(result: { token: string; tenant: string; refreshToken?: string }) => void>,
      required: true,
    },
    bind: { type: Boolean, default: false },
    tokenId: { type: String, default: "" },
    bindType: { type: String as PropType<"SMS" | "WECHAT">, default: "WECHAT" },
    appid: { type: String, default: WECHAT_APPID },
    redirectUri: { type: String, default: WECHAT_REDIRECT_URI },
  },
  emits: ["bind", "back"],
  setup(props, { emit }) {
    const logger = createLogger("pc-auth");

    const WECHAT_STATE_STORAGE_KEY = "g2-pc-auth:wechat-login:state";
    const WECHAT_LAST_CODE_STORAGE_KEY = "g2-pc-auth:wechat-login:last-code";

    const loggingIn = ref(false);

    function loadOrCreateState(): string {
      const existing = window.sessionStorage.getItem(WECHAT_STATE_STORAGE_KEY);
      if (existing !== null && existing !== "") {
        return existing;
      }
      const legacyState = "STATE";
      window.sessionStorage.setItem(WECHAT_STATE_STORAGE_KEY, legacyState);
      return legacyState;
    }

    const state = loadOrCreateState();

    const qrUrl = computed(() =>
      buildWechatQrConnectUrl({
        appid: props.appid,
        scope: "snsapi_login",
        redirectUri: props.redirectUri,
        state,
      }),
    );

    async function loginWithWechatCode(code: string): Promise<void> {
      loggingIn.value = true;
      try {
        const result = (
          props.bind
            ? await (
                await props.ctx.ensureClient<OuaaClient>("ouaaClient")
              ).bindLogin({
                authType: "WECHAT",
                bindType: props.bindType,
                tokenId: props.tokenId,
                authParam: { code },
              })
            : await (
                await props.ctx.ensureClient<AuthClient>("authClient")
              ).exchangeToken({
                grant_type: "wechat-v2",
                code,
                registerNewUser: false,
              })
        ) as { access_token: string; refresh_token?: string; tenants?: string[] };
        const tenant = Array.isArray(result.tenants) && typeof result.tenants[0] === "string" ? result.tenants[0] : "";
        const refreshToken = typeof result.refresh_token === "string" ? result.refresh_token : undefined;
        props.onLoginSuccess({ token: result.access_token, tenant, refreshToken });
      } catch (error) {
        if (!props.bind && isAccountNotBoundError(error)) {
          emit("bind", { tokenId: extractBindTokenId((error as HttpServiceError).errorDetail) });
          return;
        }
        logger.error("wechat login failed", { error: String(error) });
        message.error(props.bind ? "绑定失败，请重试" : "微信登录失败，请重试");
      } finally {
        loggingIn.value = false;
      }
    }

    onMounted(() => {
      const query = new URLSearchParams(window.location.search);
      const callbackQuery = { code: query.get("code"), state: query.get("state") };
      const lastHandledCode = window.localStorage.getItem(WECHAT_LAST_CODE_STORAGE_KEY);
      if (shouldHandleWechatCallback(callbackQuery, state, lastHandledCode) && callbackQuery.code !== null) {
        window.localStorage.setItem(WECHAT_LAST_CODE_STORAGE_KEY, callbackQuery.code);
        void loginWithWechatCode(callbackQuery.code);
      }
    });

    return () => (
      <div class="pc-auth-wechat-login" data-testid="wechat-login">
        {props.bind ? <h2 class="pc-auth-wechat-login__title">绑定微信账号</h2> : null}

        <div class="pc-auth-wechat-login__qr">
          {loggingIn.value ? (
            <Spin data-testid="wechat-logging-in" tip="微信登录中…" />
          ) : (
            <iframe
              data-testid="wechat-qr-iframe"
              sandbox="allow-scripts allow-top-navigation allow-same-origin"
              scrolling="no"
              frameborder="0"
              allowtransparency="true"
              class="pc-auth-wechat-login__qr-frame"
              src={qrUrl.value}
            />
          )}
        </div>
        <p class="pc-auth-wechat-login__hint">打开微信，扫描二维码{props.bind ? "验证绑定" : "登录"}</p>

        {props.bind ? (
          <div class="pc-auth-wechat-login__back" onClick={() => emit("back")}>
            其它方式?
          </div>
        ) : null}
      </div>
    );
  },
});
