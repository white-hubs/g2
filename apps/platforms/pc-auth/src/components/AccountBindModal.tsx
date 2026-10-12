import type { PlatformContext } from "@g2-composition/contract";
import type { OuaaClient } from "@g2-contract/ouaa";
import type { FormRule } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, reactive, ref, watch } from "vue";

import { encrypt } from "../crypto";
import { createLogger } from "../logger-api";
import { Button, Form, FormItem, Input, InputPassword, Modal, message } from "../pc-ui-runtime";
import PhoneLogin from "./PhoneLogin";
import WechatLogin from "./WechatLogin";

import "./AccountBindModal.css";

type BindView = "options" | "phone" | "wechat" | "password";

export default defineComponent({
  name: "AccountBindModal",
  props: {
    ctx: { type: Object as PropType<PlatformContext>, required: true },
    onLoginSuccess: {
      type: Function as PropType<(result: { token: string; tenant: string; refreshToken?: string }) => void>,
      required: true,
    },
    open: { type: Boolean, required: true },
    loginType: { type: String as PropType<"SMS" | "WECHAT">, required: true },
    tokenId: { type: String, required: true },
  },
  emits: ["update:open"],
  setup(props, { emit }) {
    const logger = createLogger("pc-auth");

    const view = ref<BindView>("options");
    const submitting = ref(false);
    const passwordFormState = reactive({ username: "", password: "" });
    const passwordRules: Record<string, FormRule[]> = {
      username: [{ required: true, message: "请输入账号", trigger: "change" }],
      password: [{ required: true, message: "请填写密码", trigger: "change" }],
    };

    watch(
      () => props.open,
      (isOpen) => {
        if (isOpen) {
          view.value = "options";
          passwordFormState.username = "";
          passwordFormState.password = "";
        }
      },
    );

    function handleUpdateOpen(nextOpen: boolean): void {
      emit("update:open", nextOpen);
    }

    async function handlePasswordBindSubmit(): Promise<void> {
      submitting.value = true;
      try {
        const ouaa = await props.ctx.ensureClient<OuaaClient>("ouaaClient");
        const result = (await ouaa.bindLogin({
          authType: "PASSWORD",
          bindType: props.loginType,
          tokenId: props.tokenId,
          authParam: { username: passwordFormState.username, password: encrypt(passwordFormState.password) },
        })) as { access_token: string; refresh_token?: string; tenants?: string[] };
        const tenant = Array.isArray(result.tenants) && typeof result.tenants[0] === "string" ? result.tenants[0] : "";
        const refreshToken = typeof result.refresh_token === "string" ? result.refresh_token : undefined;
        props.onLoginSuccess({ token: result.access_token, tenant, refreshToken });
      } catch (error) {
        logger.error("password bind failed", { error: String(error) });
        message.error("绑定失败，请检查账号或密码");
      } finally {
        submitting.value = false;
      }
    }

    return () => (
      <Modal open={props.open} title="绑定账号" footer={null} centered data-testid="account-bind-modal" onUpdate:open={handleUpdateOpen}>
        {view.value === "options" ? (
          <div class="pc-auth-account-bind__options">
            <p class="pc-auth-account-bind__hint">当前{props.loginType === "WECHAT" ? "微信" : "手机"}未绑定，请选择绑定本平台账号:</p>
            {props.loginType === "WECHAT" ? (
              <div
                class="pc-auth-account-bind__option"
                data-testid="bind-option-phone"
                onClick={() => {
                  view.value = "phone";
                }}
              >
                验证账号手机绑定
              </div>
            ) : (
              <div
                class="pc-auth-account-bind__option"
                data-testid="bind-option-wechat"
                onClick={() => {
                  view.value = "wechat";
                }}
              >
                验证账号微信绑定
              </div>
            )}
            <div
              class="pc-auth-account-bind__option"
              data-testid="bind-option-password"
              onClick={() => {
                view.value = "password";
              }}
            >
              验证账号密码绑定
            </div>
          </div>
        ) : view.value === "phone" ? (
          <PhoneLogin
            ctx={props.ctx}
            onLoginSuccess={props.onLoginSuccess}
            bind
            tokenId={props.tokenId}
            bindType={props.loginType}
            onBack={() => {
              view.value = "options";
            }}
          />
        ) : view.value === "wechat" ? (
          <WechatLogin
            ctx={props.ctx}
            onLoginSuccess={props.onLoginSuccess}
            bind
            tokenId={props.tokenId}
            bindType={props.loginType}
            onBack={() => {
              view.value = "options";
            }}
          />
        ) : (
          <Form model={passwordFormState} rules={passwordRules} layout="vertical" onFinish={handlePasswordBindSubmit}>
            <h2 class="pc-auth-account-bind__title">绑定账号</h2>
            <span class="pc-auth-account-bind__hint">请验输入平台账号并验证：</span>
            <FormItem label="账号" name="username">
              <Input
                value={passwordFormState.username}
                onUpdate:value={(v: string) => {
                  passwordFormState.username = v;
                }}
                placeholder="请输入账号"
                allowClear
              />
            </FormItem>
            <FormItem label="密码" name="password">
              <InputPassword
                value={passwordFormState.password}
                onUpdate:value={(v: string) => {
                  passwordFormState.password = v;
                }}
                placeholder="请输入密码"
                allowClear
              />
            </FormItem>
            <FormItem class="pc-auth-account-bind__submit">
              <Button type="primary" htmlType="submit" block loading={submitting.value}>
                绑定并登录
              </Button>
            </FormItem>
            <div
              class="pc-auth-account-bind__back"
              onClick={() => {
                view.value = "options";
              }}
            >
              其它方式?
            </div>
          </Form>
        )}
      </Modal>
    );
  },
});
