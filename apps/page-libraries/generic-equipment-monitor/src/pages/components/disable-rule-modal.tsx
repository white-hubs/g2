import { Input, Modal } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

export type DisableRulePayload = {
  id: string;
  enabled: false;
  disableDuration: number | null;
};

export default defineComponent({
  name: "GemDisableRuleModal",
  emits: {
    ok: (_payload: DisableRulePayload) => true,
  },
  setup(_, { emit, expose }) {
    const visible = ref(false);
    const confirmLoading = ref(false);
    const detailId = ref("");
    const form = reactive<{ disableDuration: number | null }>({ disableDuration: null });

    const openModal = (record: { id?: unknown }) => {
      detailId.value = String(record.id || "");
      form.disableDuration = null;
      visible.value = true;
    };

    const cancel = () => {
      visible.value = false;
      form.disableDuration = null;
      detailId.value = "";
    };

    const handleOk = () => {
      if (!detailId.value) {
        return;
      }
      confirmLoading.value = true;
      try {
        emit("ok", {
          id: detailId.value,
          enabled: false,
          disableDuration: form.disableDuration,
        });
        cancel();
      } finally {
        confirmLoading.value = false;
      }
    };

    expose({ openModal });

    return () => (
      <Modal title="禁用规则" open={visible.value} confirmLoading={confirmLoading.value} width={680} onOk={handleOk} onCancel={cancel}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ width: 80, textAlign: "right" }}>禁用时长</span>
          <Input
            type="number"
            min={0}
            max={999}
            value={form.disableDuration == null ? "" : String(form.disableDuration)}
            placeholder="请输入禁用时长（若未设置禁用时长，将默认永久禁用）"
            style={{ width: 380 }}
            onUpdate:value={(v: string) => {
              form.disableDuration = v === "" ? null : Number(v);
            }}
          />
          <span>小时</span>
        </div>
      </Modal>
    );
  },
});
