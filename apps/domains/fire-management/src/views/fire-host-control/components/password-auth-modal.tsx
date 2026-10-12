import { defineComponent, shallowRef, watch } from "vue";

import { useControlledPcModal } from "../composables/use-controlled-pc-modal";
import { Button, InputPassword } from "@/pc-ui-runtime";

import styles from "../fire-host-control.module.css";

export const PasswordAuthModal = defineComponent({
  name: "PasswordAuthModal",
  props: {
    visible: { type: Boolean, required: true },
    password: { type: String, required: true },
    showPassword: { type: Boolean, required: true },
    actionName: { type: String, required: true },
    danger: { type: Boolean, required: true },
    errorMessage: { type: String, required: true },
    submitting: { type: Boolean, required: true },
  },
  emits: {
    cancel: () => true,
    confirm: () => true,
    updatePassword: (_value: string) => true,
    toggleVisibility: () => true,
  },
  setup(props, { emit }) {
    const isPasswordEditable = shallowRef(false);
    const [PcModal, modalApi] = useControlledPcModal(() => props.visible, {
      title: "远程控制安全鉴权",
      width: "420px",
      onBeforeClose: () => !props.submitting,
      onClosed: () => emit("cancel"),
    });
    watch(
      () => props.visible,
      (visible) => {
        if (!visible) return;
        isPasswordEditable.value = false;
        emit("updatePassword", "");
      },
    );
    const enablePasswordInput = (): void => {
      isPasswordEditable.value = true;
      emit("updatePassword", "");
    };
    return () => (
      <PcModal
        v-slots={{
          default: () => (
            <div style={{ padding: "8px 0" }}>
              <div style={{ marginBottom: "16px", color: "#4e5969", fontSize: "13px" }}>
                即将下发指令: <b style={{ color: "#1d2129", fontSize: "14px" }}>{props.actionName}</b>
              </div>
              <InputPassword
                value={props.password}
                type="password"
                maxlength={6}
                placeholder="请输入6位数字控制密码"
                name="fire-host-control-password"
                autocomplete="new-password"
                inputmode="numeric"
                readonly={!isPasswordEditable.value}
                class={styles.passwordInput}
                disabled={props.submitting}
                onInputFocus={enablePasswordInput}
                onInput={(event: Event) => emit("updatePassword", (event.target as HTMLInputElement).value.replace(/\D/g, "").slice(0, 6))}
              />
              <div class={styles.modalHint}>当前主机已配置控制密码。密码仅随本次控制指令提交，由服务端完成校验。</div>
              {props.errorMessage ? <div class={styles.modalError}>{props.errorMessage}</div> : null}
              {props.danger ? <div class={styles.dangerNotice}>⚠ 警告：当前操作属于关键继电器控制，请务必核实后再试！</div> : null}
            </div>
          ),
          footer: () => (
            <div class={styles.standardModalFooter}>
              <Button disabled={props.submitting} onClick={() => modalApi.close()}>
                取消
              </Button>
              <Button type="primary" loading={props.submitting} onClick={() => emit("confirm")}>
                确认执行
              </Button>
            </div>
          ),
        }}
      />
    );
  },
});
