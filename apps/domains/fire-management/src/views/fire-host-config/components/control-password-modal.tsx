import type { FireHostRecord } from "@g2-contract/fire-management";
import { defineComponent, shallowRef } from "vue";

import { setControlPassword } from "@/api/server";
import { usePcModal } from "@/pc-ui-runtime";
import { Form, FormItem, InputPassword, message } from "@/pc-ui-runtime";

import styles from "../fire-host-config.module.css";

export const ControlPasswordModal = defineComponent({
  name: "ControlPasswordModal",
  emits: ["saved"],
  setup: (_props, { emit, expose }) => {
    const currentHost = shallowRef<FireHostRecord | null>(null);
    const password = shallowRef("");

    const savePassword = async (): Promise<void> => {
      if (!/^\d{6}$/.test(password.value)) {
        message.warning("请输入 6 位数字控制密码");
        return;
      }
      if (!currentHost.value) {
        return;
      }

      modalApi.setConfirmLoading(true);
      try {
        await setControlPassword({ id: currentHost.value!.id, password: password.value });
        message.success("控制密码已更新");
        modalApi.close();
        emit("saved");
      } catch (error) {
        message.error((error as Error).message || "控制密码更新失败");
      } finally {
        modalApi.setConfirmLoading(false);
      }
    };

    const [PcModal, modalApi] = usePcModal({
      title: "配置控制密码",
      width: "520px",
      centered: true,
      closeOnClickModal: false,
      onConfirm: savePassword,
      onCancel: () => modalApi.close(),
      onClosed: () => {
        currentHost.value = null;
        password.value = "";
      },
    });

    const openModal = (record: FireHostRecord): void => {
      currentHost.value = record;
      password.value = "";
      modalApi.setState({ title: `配置控制密码 - ${record.deviceName ?? record.name}` });
      modalApi.open();
    };

    expose({ openModal });

    const modalSlots = {
      default: () => (
        <div class={styles["password-form"]}>
          <Form layout="vertical">
            <FormItem label="新控制密码" required>
              <InputPassword
                value={password.value}
                placeholder="请输入 6 位数字"
                maxlength={6}
                showCount={false}
                onInput={(event: Event) => {
                  password.value = (event.target as HTMLInputElement).value.replace(/\D/g, "").slice(0, 6);
                }}
              />
            </FormItem>
          </Form>
          <div class={styles["password-tip"]}>
            密码用于远程控制操作的二次鉴权。鉴权通过后 15 分钟内该主机操作免密；修改密码不会影响已有免密会话。
          </div>
        </div>
      ),
    };

    return () => <PcModal v-slots={modalSlots} />;
  },
});
