import type { IntercomGroup } from "@g2-contract/command-dispatch";
import type { FormInstance, FormRule } from "@g2-platform/pc-ui/types";
import { type PropType, defineComponent, reactive, ref } from "vue";

import { getCommandDispatchClient } from "../../domain-context";
import { Alert, Form, FormItem, Input, InputNumber, message, Modal, Switch } from "../../pc-ui-runtime";
import { errorText } from "../radio-record/list-state";
import { type GroupForm, buildGroupPayload } from "./group-state";

import styles from "../radio-record/list.module.css";

export const GroupEditor = defineComponent({
  name: "CommandDispatchGroupEditor",
  props: { group: { type: Object as PropType<IntercomGroup>, default: undefined } },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const client = getCommandDispatchClient();
    const formRef = ref<FormInstance>();
    const form = reactive<GroupForm>({
      ...(props.group ? { id: props.group.id } : {}),
      code: props.group?.code ?? "",
      name: props.group?.name ?? "",
      groupLevel: props.group?.groupLevel ?? 0,
      type: props.group?.type ?? 0,
      isRecord: props.group?.isRecord ?? false,
    });
    const pending = ref(false);
    const error = ref("");
    const rules: Record<string, FormRule[]> = {
      code: [
        { required: true, message: "请输入对讲组编号" },
        { pattern: /^\d{1,5}$/, message: "请输入 0–99999 的数字编号" },
      ],
      name: [{ required: true, whitespace: true, message: "请输入对讲组名称" }],
      groupLevel: [{ required: true, type: "integer", min: 0, max: 100, message: "请输入 0–100 的整数等级" }],
    };
    const save = async (): Promise<void> => {
      if (pending.value) {
        return;
      }
      pending.value = true;
      error.value = "";
      try {
        await formRef.value?.validate();
        const payload = buildGroupPayload(form);
        if (props.group) {
          await client.updateGroup(props.group.id, payload);
        } else {
          await client.createGroup(payload);
        }
        void message.success(props.group ? "编辑成功" : "新增成功");
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
        title={props.group ? "编辑对讲组" : "新增对讲组"}
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
          <FormItem label="对讲组编号" name="code">
            <Input placeholder="输入对讲组编号" maxlength={5} v-model:value={form.code} />
          </FormItem>
          <FormItem label="对讲组名称" name="name">
            <Input placeholder="输入对讲组名称" v-model:value={form.name} />
          </FormItem>
          <FormItem label="对讲组等级" name="groupLevel">
            <InputNumber class={styles.levelInput} min={0} max={100} precision={0} v-model:value={form.groupLevel} />
          </FormItem>
          <FormItem label="是否录音" name="isRecord">
            <Switch checkedChildren="是" unCheckedChildren="否" v-model:checked={form.isRecord} />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
