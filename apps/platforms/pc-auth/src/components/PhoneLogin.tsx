import type { PlatformContext } from "@g2-composition/contract";
import type { AuthClient } from "@g2-contract/auth";
import type { OuaaClient } from "@g2-contract/ouaa";
import { HttpServiceError } from "@g2-platform/http/client";
import type { FormRule } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { extractBindTokenId, isAccountNotBoundError } from "../bind-error";
import { createLogger } from "../logger-api";
import { Button, Form, FormItem, Input, message } from "../pc-ui-runtime";
import { isValidPhoneNumber } from "../phone";
import { SMS_CODE_COOLDOWN_SECONDS, clearSmsCodeSentAt, recordSmsCodeSentAt, remainingCooldownSeconds } from "../sms-countdown";
import { isLoginAgreementAccepted } from "../user-agreement";
import SliderCaptcha from "./SliderCaptcha";
import UserAgreement from "./UserAgreement";

import "./PhoneLogin.css";

export default defineComponent({
  name: "PhoneLogin",
  props: {
    ctx: { type: Object as PropType<PlatformContext>, required: true },
    onLoginSuccess: {
      type: Function as PropType<(result: { token: string; tenant: string; refreshToken?: string }) => void>,
      required: true,
    },
    bind: { type: Boolean, default: false },
    tokenId: { type: String, default: "" },
    bindType: { type: String as PropType<"SMS" | "WECHAT">, default: "SMS" },
  },
  emits: ["bind", "back"],
  setup(props, { emit }) {
    const logger = createLogger("pc-auth");

    const SMS_SENT_AT_STORAGE_KEY = "g2-pc-auth:phone-login:sms-sent-at";

    const formState = reactive({ phone: "", code: "" });
    const rules: Record<string, FormRule[]> = {
      phone: [
        { required: true, message: "请输入手机号", trigger: "change" },
        {
          validator: (_rule, value: string) =>
            value === "" || isValidPhoneNumber(value) ? Promise.resolve() : Promise.reject(new Error("请输入正确的手机号")),
          trigger: "change",
        },
      ],
      code: [{ required: true, message: "请输入验证码", trigger: "change" }],
    };

    const submitting = ref(false);
    const sendingCode = ref(false);
    const captchaVerification = ref("");
    const captchaRef = ref<InstanceType<typeof SliderCaptcha> | null>(null);
    const agreementRef = ref<InstanceType<typeof UserAgreement> | null>(null);
    const pendingAgreementAction = ref<(() => void) | null>(null);
    const cooldownSeconds = ref(0);
    let cooldownTimer: ReturnType<typeof setInterval> | undefined;

    const codeButtonText = ref("获取验证码");
    const sendingDisabled = ref(false);

    function updateCodeButtonText(): void {
      codeButtonText.value = cooldownSeconds.value > 0 ? `${cooldownSeconds.value}秒` : "获取验证码";
      sendingDisabled.value = cooldownSeconds.value > 0;
    }

    function tickCooldown(): void {
      const remaining = remainingCooldownSeconds(window.localStorage, SMS_SENT_AT_STORAGE_KEY, Date.now());
      cooldownSeconds.value = remaining;
      updateCodeButtonText();
      if (remaining <= 0 && cooldownTimer !== undefined) {
        clearInterval(cooldownTimer);
        cooldownTimer = undefined;
        clearSmsCodeSentAt(window.localStorage, SMS_SENT_AT_STORAGE_KEY);
      }
    }

    function startCooldown(): void {
      if (cooldownTimer !== undefined) {
        clearInterval(cooldownTimer);
      }
      tickCooldown();
      cooldownTimer = setInterval(tickCooldown, 1000);
    }

    onMounted(() => {
      if (remainingCooldownSeconds(window.localStorage, SMS_SENT_AT_STORAGE_KEY, Date.now()) > 0) {
        startCooldown();
      }
    });

    onBeforeUnmount(() => {
      if (cooldownTimer !== undefined) {
        clearInterval(cooldownTimer);
      }
    });

    function handleCaptchaSuccess(payload: { captchaVerification: string }): void {
      captchaVerification.value = payload.captchaVerification;
      void sendSmsCode();
    }

    function handleAgreementConfirmed(): void {
      const action = pendingAgreementAction.value;
      pendingAgreementAction.value = null;
      action?.();
    }

    function handleAgreementRejected(): void {
      pendingAgreementAction.value = null;
    }

    function ensureAgreementAccepted(action: () => void): boolean {
      if (props.bind || isLoginAgreementAccepted(window.localStorage)) {
        return true;
      }
      pendingAgreementAction.value = action;
      void agreementRef.value?.remind();
      agreementRef.value?.openAgreementConfirm();
      return false;
    }

    function handleGetCode(): void {
      if (sendingDisabled.value || sendingCode.value) {
        return;
      }
      if (!ensureAgreementAccepted(() => handleGetCode())) {
        return;
      }
      if (!isValidPhoneNumber(formState.phone)) {
        message.error("请输入正确的手机号");
        return;
      }
      void captchaRef.value?.show();
    }

    async function sendSmsCode(): Promise<void> {
      if (!captchaVerification.value) {
        return;
      }
      sendingCode.value = true;
      try {
        const ouaa = await props.ctx.ensureClient<OuaaClient>("ouaaClient");
        await ouaa.sendSmsCode({
          tel: formState.phone,
          captchaVerification: captchaVerification.value,
        });
        message.success("验证码发送成功");
        recordSmsCodeSentAt(window.localStorage, SMS_SENT_AT_STORAGE_KEY, Date.now());
        cooldownSeconds.value = SMS_CODE_COOLDOWN_SECONDS;
        updateCodeButtonText();
        startCooldown();
      } catch (error) {
        logger.error("send sms code failed", { error: String(error) });
        message.error("验证码发送失败，请重试");
      } finally {
        sendingCode.value = false;
        captchaVerification.value = "";
      }
    }

    async function submitLogin(): Promise<void> {
      submitting.value = true;
      try {
        const result = (
          props.bind
            ? await (
                await props.ctx.ensureClient<OuaaClient>("ouaaClient")
              ).bindLogin({
                authType: "SMS",
                bindType: props.bindType,
                tokenId: props.tokenId,
                authParam: { mobile: formState.phone, code: formState.code },
              })
            : await (
                await props.ctx.ensureClient<AuthClient>("authClient")
              ).exchangeToken({
                grant_type: "sms",
                mobile: formState.phone,
                code: formState.code,
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
        logger.error("phone login failed", { error: String(error) });
        message.error(props.bind ? "绑定失败，请重试" : "登录失败，请检查手机号或验证码");
      } finally {
        submitting.value = false;
      }
    }

    async function handleSubmit(): Promise<void> {
      if (!ensureAgreementAccepted(() => void submitLogin())) {
        return;
      }
      await submitLogin();
    }

    return () => (
      <div class="pc-auth-phone-login">
        <h2 class="pc-auth-phone-login__title">{props.bind ? "绑定账号" : "手机登录"}</h2>
        {props.bind ? <span class="pc-auth-phone-login__bind-hint">请输入平台账号对应的手机号并验证：</span> : null}

        <Form model={formState} rules={rules} layout="vertical" onFinish={handleSubmit}>
          <FormItem name="phone">
            <Input
              value={formState.phone}
              onUpdate:value={(v: string) => {
                formState.phone = v;
              }}
              placeholder="手机号"
              allowClear
            />
          </FormItem>
          <FormItem name="code">
            <div class="pc-auth-phone-login__code-row">
              <Input
                value={formState.code}
                onUpdate:value={(v: string) => {
                  formState.code = v;
                }}
                placeholder="验证码"
                allowClear
                class="pc-auth-phone-login__code-input"
              />
              <Button
                class="pc-auth-phone-login__code-btn"
                disabled={sendingDisabled.value}
                loading={sendingCode.value}
                onClick={handleGetCode}
              >
                {codeButtonText.value}
              </Button>
            </div>
          </FormItem>

          {!props.bind ? (
            <UserAgreement
              ref={agreementRef}
              class="pc-auth-phone-login__agreement"
              onConfirmAccepted={handleAgreementConfirmed}
              onConfirmRejected={handleAgreementRejected}
            />
          ) : null}

          <FormItem class="pc-auth-phone-login__submit">
            <Button type="primary" htmlType="submit" block loading={submitting.value}>
              {props.bind ? "绑定并登录" : "登录"}
            </Button>
          </FormItem>
        </Form>

        <SliderCaptcha ref={captchaRef} ctx={props.ctx} onSuccess={handleCaptchaSuccess} />

        {props.bind ? (
          <div class="pc-auth-phone-login__back" onClick={() => emit("back")}>
            其它方式?
          </div>
        ) : null}
      </div>
    );
  },
});
