// @ts-nocheck
import { defineComponent, reactive, ref } from "vue";

import { getEmergencyManagementClient } from "@/domain-context";
import { Form, FormItem, InputNumber, message, usePcModal } from "@/pc-ui-runtime";

export const DisEnableModal = defineComponent({
  name: "DisEnableModal",
  emits: ["ok"],
  setup(_, { emit, expose }) {
    const detail = ref<Record<string, unknown>>({});
    const form = reactive<{ disableDuration: number | null }>({ disableDuration: null });

    const [PcModal, modalApi] = usePcModal({
      title: "禁用规则",
      width: "680px",
      onConfirm: async () => {
        try {
          modalApi.setState({ confirmLoading: true });
          await getEmergencyManagementClient().setRuleEnabled({
            id: detail.value.id,
            enabled: false,
            disableDuration: form.disableDuration,
          });
          message.success("操作成功！");
          modalApi.close();
          emit("ok");
        } catch (error) {
          message.error(error instanceof Error ? error.message : "操作失败");
        } finally {
          modalApi.setState({ confirmLoading: false });
        }
      },
      onCancel: () => {
        form.disableDuration = null;
        modalApi.close();
      },
    });

    expose({
      openModal: (record: Record<string, unknown>) => {
        detail.value = record;
        form.disableDuration = null;
        modalApi.open();
      },
    });

    return () => (
      <PcModal>
        <Form label-col={{ span: 5 }} model={form}>
          <FormItem label="禁用时长">
            <InputNumber
              min={0}
              max={999}
              precision={0}
              style={{ width: "380px" }}
              placeholder="请输入禁用时长（若未设置禁用时长，将默认永久禁用）"
              value={form.disableDuration}
              onUpdate:value={(v) => (form.disableDuration = v)}
            />
            <span style={{ marginLeft: "8px" }}>小时</span>
          </FormItem>
        </Form>
      </PcModal>
    );
  },
});
