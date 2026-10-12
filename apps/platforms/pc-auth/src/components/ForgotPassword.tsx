import type { PlatformContext } from "@g2-composition/contract";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { FormRule } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onBeforeUnmount, onMounted, reactive, ref } from "vue";

import { encrypt } from "../crypto";
import { createLogger } from "../logger-api";
import { doPasswordsMatch, isPasswordStrongEnough, isValidAccountForPasswordRecovery } from "../password-reset";
import { Button, Form, FormItem, Input, InputPassword, message } from "../pc-ui-runtime";
import { SMS_CODE_COOLDOWN_SECONDS, clearSmsCodeSentAt, recordSmsCodeSentAt, remainingCooldownSeconds } from "../sms-countdown";
import SliderCaptcha from "./SliderCaptcha";

import "./ForgotPassword.css";

export default defineComponent({
  name: "ForgotPassword",
  props: {
    ctx: { type: Object as PropType<PlatformContext>, required: true },
  },
  emits: ["back", "done"],
  setup(props, { emit }) {
    const logger = createLogger("pc-auth");

    const SMS_SENT_AT_STORAGE_KEY = "g2-pc-auth:forgot-password:sms-sent-at";

    const step = ref<"method" | "verify" | "reset" | "wechat">("method");

    const verifyFormState = reactive({ account: "", code: "" });
    const verifyRules: Record<string, FormRule[]> = {
      account: [
        { required: true, message: "请输入手机号码或邮箱", trigger: "change" },
        {
          validator: (_rule, value: string) =>
            value === "" || isValidAccountForPasswordRecovery(value)
              ? Promise.resolve()
              : Promise.reject(new Error("请输入正确的手机号或邮箱格式")),
          trigger: "change",
        },
      ],
      code: [{ required: true, message: "请输入验证码", trigger: "change" }],
    };

    const resetFormState = reactive({ password: "", password2: "" });
    const resetRules: Record<string, FormRule[]> = {
      password: [
        { required: true, message: "请输入密码", trigger: "change" },
        {
          validator: (_rule, value: string) =>
            value === "" || isPasswordStrongEnough(value)
              ? Promise.resolve()
              : Promise.reject(new Error("密码必须包含大写字母、小写字母、数字、特殊字符(~!@#$%^&*,.&<=[)，且长度大于 8 位！")),
          trigger: "change",
        },
      ],
      password2: [
        { required: true, message: "请再次输入密码", trigger: "change" },
        {
          validator: (_rule, value: string) =>
            value === "" || doPasswordsMatch(resetFormState.password, value)
              ? Promise.resolve()
              : Promise.reject(new Error("两次输入的密码不一致")),
          trigger: "change",
        },
      ],
    };

    const verifying = ref(false);
    const resetting = ref(false);
    const sendingCode = ref(false);
    const captchaVerification = ref("");
    const captchaRef = ref<InstanceType<typeof SliderCaptcha> | null>(null);

    const cooldownSeconds = ref(0);
    const codeButtonText = ref("获取验证码");
    const sendingDisabled = ref(false);
    let cooldownTimer: ReturnType<typeof setInterval> | undefined;

    const resetContext = reactive<{ secret?: string; resetSessionId?: string }>({});

    function updateCodeButtonText(): void {
      codeButtonText.value = cooldownSeconds.value > 0 ? `${cooldownSeconds.value}秒后重新获取` : "获取验证码";
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

    function handleGetCode(): void {
      if (sendingDisabled.value || sendingCode.value) {
        return;
      }
      if (!isValidAccountForPasswordRecovery(verifyFormState.account)) {
        message.error("请输入正确的手机号或邮箱格式");
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
          tel: verifyFormState.account,
          sendSmsCodeType: "RESET_PASSWORD",
          captchaVerification: captchaVerification.value,
        });
        message.success("验证码发送成功");
        recordSmsCodeSentAt(window.localStorage, SMS_SENT_AT_STORAGE_KEY, Date.now());
        cooldownSeconds.value = SMS_CODE_COOLDOWN_SECONDS;
        updateCodeButtonText();
        startCooldown();
      } catch (error) {
        logger.error("send reset-password sms code failed", { error: String(error) });
        message.error("验证码发送失败，请重试");
      } finally {
        sendingCode.value = false;
        captchaVerification.value = "";
      }
    }

    async function handleVerifySubmit(): Promise<void> {
      verifying.value = true;
      try {
        const ouaa = await props.ctx.ensureClient<OuaaClient>("ouaaClient");
        const query = new URLSearchParams({ tel: verifyFormState.account, code: verifyFormState.code }).toString();
        const result = (await ouaa.getRetrievePasswordToken(query)) as { secret?: unknown; resetSessionId?: unknown };
        resetContext.secret = typeof result.secret === "string" ? result.secret : undefined;
        resetContext.resetSessionId = typeof result.resetSessionId === "string" ? result.resetSessionId : undefined;
        step.value = "reset";
      } catch (error) {
        logger.error("verify identity for password reset failed", { error: String(error) });
        message.error("验证失败，请检查手机号/邮箱或验证码");
      } finally {
        verifying.value = false;
      }
    }

    async function handleResetSubmit(): Promise<void> {
      resetting.value = true;
      try {
        const ouaa = await props.ctx.ensureClient<OuaaClient>("ouaaClient");
        const body: Record<string, string> = {
          newPassword: encrypt(resetFormState.password, resetContext.secret),
          confirmPassword: encrypt(resetFormState.password2, resetContext.secret),
        };
        if (resetContext.resetSessionId !== undefined) {
          body.resetSessionId = resetContext.resetSessionId;
        }
        await ouaa.resetPassword(body);
        message.success("找回密码成功");
        emit("done");
      } catch (error) {
        logger.error("reset password failed", { error: String(error) });
        message.error("修改密码失败，请稍后重试");
      } finally {
        resetting.value = false;
      }
    }

    return () => (
      <div class="pc-auth-forgot-password">
        {step.value === "method" ? (
          <>
            <h2 class="pc-auth-forgot-password__title">找回方式</h2>
            <span class="pc-auth-forgot-password__hint">请选择找回密码的验证方式:</span>
            <div class="pc-auth-forgot-password__methods">
              <button
                type="button"
                class="pc-auth-forgot-password__method"
                data-testid="forgot-method-phone"
                onClick={() => {
                  step.value = "verify";
                }}
              >
                验证账号手机找回
              </button>
              <button
                type="button"
                class="pc-auth-forgot-password__method"
                data-testid="forgot-method-wechat"
                onClick={() => {
                  step.value = "wechat";
                }}
              >
                验证账号微信找回
              </button>
            </div>
            <button
              type="button"
              class="pc-auth-forgot-password__back tw:g2-focus-ring tw:transition-colors tw:duration-200"
              data-testid="forgot-password-back"
              onClick={() => emit("back")}
            >
              返回登录
            </button>
          </>
        ) : null}

        {step.value === "verify" ? (
          <>
            <h2 class="pc-auth-forgot-password__title">验证身份</h2>
            <span class="pc-auth-forgot-password__hint">请输入要找回账号对应的手机号或邮箱：</span>

            <Form model={verifyFormState} rules={verifyRules} layout="vertical" onFinish={handleVerifySubmit}>
              <FormItem label="手机号/邮箱" name="account">
                <Input
                  value={verifyFormState.account}
                  onUpdate:value={(v: string) => {
                    verifyFormState.account = v;
                  }}
                  placeholder="输入手机号码或邮箱"
                  allowClear
                />
              </FormItem>
              <FormItem label="验证码" name="code">
                <div class="pc-auth-forgot-password__code-row">
                  <Input
                    value={verifyFormState.code}
                    onUpdate:value={(v: string) => {
                      verifyFormState.code = v;
                    }}
                    placeholder="输入验证码"
                    allowClear
                    class="pc-auth-forgot-password__code-input"
                  />
                  <Button
                    class="pc-auth-forgot-password__code-btn"
                    disabled={sendingDisabled.value}
                    loading={sendingCode.value}
                    onClick={handleGetCode}
                  >
                    {codeButtonText.value}
                  </Button>
                </div>
              </FormItem>

              <FormItem class="pc-auth-forgot-password__submit">
                <Button type="primary" htmlType="submit" block loading={verifying.value}>
                  下一步
                </Button>
              </FormItem>
            </Form>

            <SliderCaptcha ref={captchaRef} ctx={props.ctx} onSuccess={handleCaptchaSuccess} />

            <button
              type="button"
              class="pc-auth-forgot-password__back tw:g2-focus-ring tw:transition-colors tw:duration-200"
              data-testid="forgot-password-back"
              onClick={() => {
                step.value = "method";
              }}
            >
              换一种方式
            </button>
          </>
        ) : null}

        {step.value === "wechat" ? (
          <>
            <h2 class="pc-auth-forgot-password__title">微信找回</h2>
            <span class="pc-auth-forgot-password__hint">请使用微信扫码完成身份验证（能力接入中）</span>
            <button
              type="button"
              class="pc-auth-forgot-password__back tw:g2-focus-ring tw:transition-colors tw:duration-200"
              data-testid="forgot-password-back"
              onClick={() => {
                step.value = "method";
              }}
            >
              换一种方式
            </button>
          </>
        ) : null}

        {step.value === "reset" ? (
          <>
            <h2 class="pc-auth-forgot-password__title">修改密码</h2>

            <Form model={resetFormState} rules={resetRules} layout="vertical" onFinish={handleResetSubmit}>
              <FormItem label="新密码" name="password">
                <InputPassword
                  value={resetFormState.password}
                  onUpdate:value={(v: string) => {
                    resetFormState.password = v;
                  }}
                  placeholder="请输入密码"
                  allowClear
                />
              </FormItem>
              <FormItem label="确认密码" name="password2">
                <InputPassword
                  value={resetFormState.password2}
                  onUpdate:value={(v: string) => {
                    resetFormState.password2 = v;
                  }}
                  placeholder="再一次输入密码"
                  allowClear
                />
              </FormItem>

              <FormItem class="pc-auth-forgot-password__submit">
                <Button type="primary" htmlType="submit" block loading={resetting.value}>
                  确认
                </Button>
              </FormItem>
            </Form>
            <button
              type="button"
              class="pc-auth-forgot-password__back tw:g2-focus-ring tw:transition-colors tw:duration-200"
              data-testid="forgot-password-back"
              onClick={() => {
                step.value = "verify";
              }}
            >
              换一种方式
            </button>
          </>
        ) : null}
      </div>
    );
  },
});
