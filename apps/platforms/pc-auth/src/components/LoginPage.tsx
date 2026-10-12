import type { PlatformContext } from "@g2-composition/contract";
import type { AuthClient } from "@g2-contract/auth";
import type { FormRule } from "@g2-platform/pc-ui";
import { type PropType, computed, defineAsyncComponent, defineComponent, onMounted, reactive, ref } from "vue";

import loginBackgroundUrl from "../assets/login-background.webp";
import { encrypt } from "../crypto";
import { createLogger } from "../logger-api";
import { Button, Checkbox, Form, FormItem, Input, InputPassword, message } from "../pc-ui-runtime";
import { clearRememberedLogin, loadRememberedLogin, saveRememberedLogin } from "../remember-me";
import { SYSTEM_TITLE_STORAGE_KEY, resolveSystemTitle, saveSystemTitle } from "../system-title-cache";
import { isLoginAgreementAccepted } from "../user-agreement";
import AccountBindModal from "./AccountBindModal";
import SliderCaptcha from "./SliderCaptcha";
import UserAgreement from "./UserAgreement";

import "./LoginPage.css";

const ForgotPassword = defineAsyncComponent(() => import("./ForgotPassword"));
const PhoneLogin = defineAsyncComponent(() => import("./PhoneLogin"));
const WechatLogin = defineAsyncComponent(() => import("./WechatLogin"));

const WECHAT_ICON_PATH =
  "M9.5 4C5.9 4 3 6.5 3 9.6c0 1.8 1 3.4 2.5 4.4l-.6 2.2 2.4-1.3c.7.2 1.4.3 2.2.3.2 0 .5 0 .7-.1-.2-.5-.3-1-.3-1.6 0-3.2 3.1-5.8 6.9-5.8.3 0 .6 0 .9.1C16.8 5.5 13.5 4 9.5 4zm-2 3.2c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zm4.2 0c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9zM16.2 9c-3.1 0-5.6 2.1-5.6 4.7s2.5 4.7 5.6 4.7c.6 0 1.2-.1 1.8-.3l1.9 1-.5-1.7c1.2-.8 2-2.1 2-3.7C21.4 11.1 19.1 9 16.2 9zm-1.7 2.4c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7zm3.4 0c.4 0 .7.3.7.7s-.3.7-.7.7-.7-.3-.7-.7.3-.7.7-.7z";

const ACCOUNT_ICON_PATH =
  "M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z";

const PHONE_ICON_PATH =
  "M17 1.5H7A2.5 2.5 0 0 0 4.5 4v16A2.5 2.5 0 0 0 7 22.5h10a2.5 2.5 0 0 0 2.5-2.5V4A2.5 2.5 0 0 0 17 1.5zM12 20.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zM16.5 16H7.5V5h9v11z";

const PASSWORD_ICON_PATH =
  "M18 8.4h-1.2V6.6A4.8 4.8 0 0 0 12 1.8a4.8 4.8 0 0 0-4.8 4.8v1.8H6a1.2 1.2 0 0 0-1.2 1.2v10.8A1.2 1.2 0 0 0 6 22.2h12a1.2 1.2 0 0 0 1.2-1.2V9.6A1.2 1.2 0 0 0 18 8.4zm-6 9a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zm2.4-9H9.6V6.6a2.4 2.4 0 1 1 4.8 0v1.8z";

const OtherLoginSection = defineComponent({
  setup(_, { slots }) {
    return () => (
      <div class="pc-auth-login__other">
        <div class="pc-auth-login__other-title">
          <span class="pc-auth-login__other-line" />
          <span>其它登录方式</span>
          <span class="pc-auth-login__other-line" />
        </div>
        <div class="pc-auth-login__other-actions">{slots.default?.()}</div>
      </div>
    );
  },
});

export default defineComponent({
  name: "LoginPage",
  props: {
    ctx: { type: Object as PropType<PlatformContext>, required: true },
    onLoginSuccess: {
      type: Function as PropType<(result: { token: string; tenant: string; refreshToken?: string }) => void | Promise<void>>,
      required: true,
    },
    systemTitle: { type: String, default: "华威集团-ghy" },
  },
  setup(props) {
    const logger = createLogger("pc-auth");

    const displayTitle = computed(() =>
      resolveSystemTitle(window.localStorage, {
        configured: import.meta.env.VITE_PC_AUTH_SYSTEM_TITLE,
        fallback: props.systemTitle,
      }),
    );

    const activeMethod = ref<"password" | "phone" | "wechat">("password");
    const showForgotPassword = ref(false);

    const bindModalOpen = ref(false);
    const bindLoginType = ref<"SMS" | "WECHAT">("SMS");
    const bindTokenId = ref("");

    function handlePhoneBind(payload: { tokenId: string }): void {
      bindLoginType.value = "SMS";
      bindTokenId.value = payload.tokenId;
      bindModalOpen.value = true;
    }

    function handleWechatBind(payload: { tokenId: string }): void {
      bindLoginType.value = "WECHAT";
      bindTokenId.value = payload.tokenId;
      bindModalOpen.value = true;
    }

    const agreementRef = ref<InstanceType<typeof UserAgreement> | null>(null);
    const captchaRef = ref<InstanceType<typeof SliderCaptcha> | null>(null);
    const pendingAgreementAction = ref<(() => void) | null>(null);

    function handleAgreementConfirmed(): void {
      const action = pendingAgreementAction.value;
      pendingAgreementAction.value = null;
      action?.();
    }

    function handleAgreementRejected(): void {
      pendingAgreementAction.value = null;
    }

    function ensureAgreementAccepted(action: () => void): boolean {
      if (isLoginAgreementAccepted(window.localStorage)) {
        return true;
      }
      pendingAgreementAction.value = action;
      void agreementRef.value?.remind();
      agreementRef.value?.openAgreementConfirm();
      return false;
    }

    const formState = reactive({ account: "", password: "" });
    const rules: Record<string, FormRule[]> = {
      account: [{ required: true, message: "请输入账号", trigger: "change" }],
      password: [{ required: true, message: "请填写密码", trigger: "change" }],
    };
    const submitting = ref(false);
    const loginInFlight = ref(false);
    const rememberMe = ref(false);

    const backgroundReady = ref(false);

    onMounted(() => {
      const remembered = loadRememberedLogin(window.localStorage);
      if (remembered) {
        formState.account = remembered.account;
        formState.password = remembered.password;
        rememberMe.value = true;
      }

      // 固定配置命中且无缓存时回写，便于下次优先读本地。
      const configured = import.meta.env.VITE_PC_AUTH_SYSTEM_TITLE;
      if (typeof configured === "string" && configured.trim() && !window.localStorage.getItem(SYSTEM_TITLE_STORAGE_KEY)) {
        saveSystemTitle(window.localStorage, configured);
      }

      const img = new Image();
      img.onload = () => {
        backgroundReady.value = true;
      };
      img.onerror = () => {
        backgroundReady.value = false;
      };
      img.src = loginBackgroundUrl;
    });

    function openCaptcha(): void {
      if (submitting.value) {
        return;
      }
      submitting.value = true;
      void captchaRef.value?.show();
    }

    function handleSubmit(): void {
      if (!ensureAgreementAccepted(() => openCaptcha())) {
        return;
      }
      openCaptcha();
    }

    function handleCaptchaClose(): void {
      // 未进入 token/壳层临界路径时关闭验证码，结束按钮 loading。
      if (!loginInFlight.value) {
        submitting.value = false;
      }
    }

    function handleCaptchaSuccess(payload: { captchaVerification: string }): void {
      void performLogin(payload.captchaVerification);
    }

    async function performLogin(captchaVerification: string): Promise<void> {
      submitting.value = true;
      loginInFlight.value = true;
      try {
        const auth = await props.ctx.ensureClient<AuthClient>("authClient");
        const result = (await auth.exchangeToken({
          grant_type: "pwd_simple_code",
          captchaType: "BLOCK_PUZZLE",
          key: captchaVerification,
          username: formState.account,
          password: encrypt(formState.password),
        })) as { access_token: string; refresh_token?: string; tenants?: string[]; details?: string; message?: string };

        if (result.details) {
          message.error(result.message || "登录失败");
          return;
        }

        const tenant = Array.isArray(result.tenants) && typeof result.tenants[0] === "string" ? result.tenants[0] : "";
        const refreshToken = typeof result.refresh_token === "string" ? result.refresh_token : undefined;

        if (rememberMe.value) {
          saveRememberedLogin(window.localStorage, { account: formState.account, password: formState.password });
        } else {
          clearRememberedLogin(window.localStorage);
        }

        // 等待壳层临界路径，保持 loading 作为登录→主壳过渡反馈。
        await props.onLoginSuccess({ token: result.access_token, tenant, refreshToken });
      } catch (error) {
        logger.error("login failed", { error: String(error) });
        const text = error instanceof Error ? error.message : String(error);
        // 局域网访问时模块加载失败也会进 catch，不能一律提示账号密码错误。
        if (/Failed to fetch dynamically imported module|Failed to fetch|NetworkError|Load failed/i.test(text)) {
          message.error("登录后资源加载失败，请检查网络或本地开发服务是否可访问");
        } else if (/账号|密码|credential|unauthorized|401|403/i.test(text)) {
          message.error("账号或密码错误");
        } else {
          message.error(text || "登录失败");
        }
      } finally {
        loginInFlight.value = false;
        submitting.value = false;
      }
    }

    return () => (
      <div
        class={["pc-auth-login", backgroundReady.value ? "pc-auth-login--bg-ready" : null]}
        data-testid="login-page"
        style={
          backgroundReady.value
            ? ({ ["--pc-auth-login-bg-image" as string]: `url(${loginBackgroundUrl})` } as Record<string, string>)
            : undefined
        }
      >
        <div class="pc-auth-login__system-name" data-testid="system-title">
          {displayTitle.value}
        </div>

        <div class="pc-auth-login__card">
          {showForgotPassword.value ? (
            <ForgotPassword
              ctx={props.ctx}
              onBack={() => {
                showForgotPassword.value = false;
              }}
              onDone={() => {
                showForgotPassword.value = false;
              }}
            />
          ) : activeMethod.value === "phone" ? (
            <>
              <PhoneLogin
                ctx={props.ctx}
                onLoginSuccess={props.onLoginSuccess}
                onBind={handlePhoneBind}
                onBack={() => {
                  activeMethod.value = "password";
                }}
              />
              <OtherLoginSection>
                <button
                  type="button"
                  class="pc-auth-login__other-btn"
                  data-testid="switch-wechat"
                  onClick={() => {
                    activeMethod.value = "wechat";
                  }}
                >
                  <svg class="pc-auth-login__other-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#07C160" d={WECHAT_ICON_PATH} />
                  </svg>
                  微信
                </button>
                <button
                  type="button"
                  class="pc-auth-login__other-btn"
                  data-testid="switch-password"
                  onClick={() => {
                    activeMethod.value = "password";
                  }}
                >
                  <svg class="pc-auth-login__other-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#738292" d={ACCOUNT_ICON_PATH} />
                  </svg>
                  帐号
                </button>
              </OtherLoginSection>
            </>
          ) : activeMethod.value === "wechat" ? (
            <>
              <WechatLogin
                ctx={props.ctx}
                onLoginSuccess={props.onLoginSuccess}
                onBind={handleWechatBind}
                onBack={() => {
                  activeMethod.value = "password";
                }}
              />
              <OtherLoginSection>
                <button
                  type="button"
                  class="pc-auth-login__other-btn"
                  data-testid="switch-password"
                  onClick={() => {
                    activeMethod.value = "password";
                  }}
                >
                  <svg class="pc-auth-login__other-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#738292" d={ACCOUNT_ICON_PATH} />
                  </svg>
                  帐号
                </button>
                <button
                  type="button"
                  class="pc-auth-login__other-btn"
                  data-testid="switch-phone"
                  onClick={() => {
                    activeMethod.value = "phone";
                  }}
                >
                  <svg class="pc-auth-login__other-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#1578ff" d={PHONE_ICON_PATH} />
                  </svg>
                  手机
                </button>
              </OtherLoginSection>
            </>
          ) : (
            <>
              <h1 class="pc-auth-login__title">账号登录</h1>
              <Form model={formState} rules={rules} layout="vertical" onFinish={handleSubmit}>
                <FormItem name="account">
                  <Input
                    value={formState.account}
                    onUpdate:value={(v: string) => {
                      formState.account = v;
                    }}
                    placeholder="请输入账号"
                    autocomplete="username"
                    allowClear
                    size="large"
                    v-slots={{
                      prefix: () => (
                        <svg class="pc-auth-login__input-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d={ACCOUNT_ICON_PATH} />
                        </svg>
                      ),
                    }}
                  />
                </FormItem>
                <FormItem name="password">
                  <InputPassword
                    value={formState.password}
                    onUpdate:value={(v: string) => {
                      formState.password = v;
                    }}
                    placeholder="请输入密码"
                    autocomplete="current-password"
                    allowClear
                    size="large"
                    v-slots={{
                      prefix: () => (
                        <svg class="pc-auth-login__input-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d={PASSWORD_ICON_PATH} />
                        </svg>
                      ),
                    }}
                  />
                </FormItem>

                <div class="pc-auth-login__row">
                  <UserAgreement
                    ref={agreementRef}
                    class="pc-auth-login__agreement"
                    onConfirmAccepted={handleAgreementConfirmed}
                    onConfirmRejected={handleAgreementRejected}
                  />
                  <Checkbox
                    checked={rememberMe.value}
                    onUpdate:checked={(v: boolean) => {
                      rememberMe.value = v;
                    }}
                    class="pc-auth-login__remember"
                  >
                    记住我
                  </Checkbox>
                </div>

                <div
                  class="pc-auth-login__forgot"
                  data-testid="forgot-password-link"
                  onClick={() => {
                    showForgotPassword.value = true;
                  }}
                >
                  忘记密码？
                </div>

                <FormItem class="pc-auth-login__submit">
                  <Button type="primary" htmlType="submit" block size="large" loading={submitting.value} class="pc-auth-login__btn">
                    登录
                  </Button>
                </FormItem>
              </Form>

              <OtherLoginSection>
                <button
                  type="button"
                  class="pc-auth-login__other-btn"
                  data-testid="switch-wechat"
                  onClick={() => {
                    activeMethod.value = "wechat";
                  }}
                >
                  <svg class="pc-auth-login__other-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#07C160" d={WECHAT_ICON_PATH} />
                  </svg>
                  微信
                </button>
                <button
                  type="button"
                  class="pc-auth-login__other-btn"
                  data-testid="switch-phone"
                  onClick={() => {
                    activeMethod.value = "phone";
                  }}
                >
                  <svg class="pc-auth-login__other-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#1578ff" d={PHONE_ICON_PATH} />
                  </svg>
                  手机
                </button>
              </OtherLoginSection>
            </>
          )}
        </div>

        <SliderCaptcha ref={captchaRef} ctx={props.ctx} onSuccess={handleCaptchaSuccess} onClose={handleCaptchaClose} />

        <AccountBindModal
          open={bindModalOpen.value}
          onUpdate:open={(v: boolean) => {
            bindModalOpen.value = v;
          }}
          ctx={props.ctx}
          onLoginSuccess={props.onLoginSuccess}
          loginType={bindLoginType.value}
          tokenId={bindTokenId.value}
        />
      </div>
    );
  },
});
