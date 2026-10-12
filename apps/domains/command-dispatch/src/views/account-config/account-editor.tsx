import type { DispatchDevice } from "@g2-contract/command-dispatch";
import type { FormInstance, FormRule } from "@g2-platform/pc-ui/types";
import { type PropType, defineComponent, reactive, ref } from "vue";

import { getCommandDispatchClient } from "../../domain-context";
import { Alert, Form, FormItem, Input, InputNumber, InputPassword, message, Modal, Switch } from "../../pc-ui-runtime";
import { errorText } from "../radio-record/list-state";
import { type DeviceForm, buildDevicePayload } from "./account-state";

import styles from "../radio-record/list.module.css";

export const AccountEditor = defineComponent({
  name: "CommandDispatchAccountEditor",
  props: { device: { type: Object as PropType<DispatchDevice>, required: true } },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const client = getCommandDispatchClient();
    const formRef = ref<FormInstance>();
    const form = reactive<DeviceForm>({
      id: props.device.id,
      code: props.device.code,
      name: props.device.name,
      password: "",
      type: props.device.type,
      deviceLevel: props.device.deviceLevel,
      isRecord: props.device.isRecord,
      isVideo: props.device.isVideo,
    });
    const pending = ref(false);
    const error = ref("");
    const rules: Record<string, FormRule[]> = {
      name: [{ required: true, whitespace: true, message: "请输入账号名称" }],
      code: [{ required: true, message: "缺少通讯号码" }],
      deviceLevel: [{ required: true, type: "integer", min: 0, max: 100, message: "请输入 0–100 的整数等级" }],
      password: [{ required: true, message: "请输入密码" }],
    };
    const save = async (): Promise<void> => {
      if (pending.value) {
        return;
      }
      pending.value = true;
      error.value = "";
      try {
        await formRef.value?.validate();
        await client.updateDevice(props.device.id, buildDevicePayload(form));
        void message.success("编辑成功");
        emit("saved");
      } catch (cause) {
        if (cause instanceof Error) {
          error.value = errorText(cause, "保存失败，请重试");
        }
      } finally {
        pending.value = false;
      }
    };
    return () => (
      <Modal
        open
        title="账号编辑"
        width={720}
        maskClosable={false}
        keyboard={!pending.value}
        closable={!pending.value}
        confirmLoading={pending.value}
        cancelButtonProps={{ disabled: pending.value }}
        onOk={save}
        onCancel={() => {
          if (!pending.value) {
            emit("close");
          }
        }}
      >
        {error.value ? <Alert class={styles.error} type="error" showIcon message={error.value} /> : null}
        <Form ref={formRef} model={form} rules={rules} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} disabled={pending.value}>
          <FormItem label="账号名称" name="name">
            <Input placeholder="请输入账号名称" v-model:value={form.name} />
          </FormItem>
          <FormItem label="通讯号码" name="code">
            <Input disabled v-model:value={form.code} />
          </FormItem>
          <FormItem label="账号等级" name="deviceLevel">
            <InputNumber class={styles.levelInput} min={0} max={100} precision={0} v-model:value={form.deviceLevel} />
          </FormItem>
          <FormItem label="密码" name="password">
            <InputPassword placeholder="请输入密码" autocomplete="new-password" v-model:value={form.password} />
          </FormItem>
          <FormItem label="是否录音" name="isRecord">
            <Switch checkedChildren="是" unCheckedChildren="否" v-model:checked={form.isRecord} />
          </FormItem>
          <FormItem label="是否录像" name="isVideo">
            <Switch checkedChildren="是" unCheckedChildren="否" v-model:checked={form.isVideo} />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
