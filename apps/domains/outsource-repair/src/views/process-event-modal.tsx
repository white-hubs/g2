import type { ProcessEventForm } from "@g2-client/outsource-repair/client";
import { Form, FormItem, Modal, Spin, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch } from "vue";

import { getOutsourceRepairClient } from "@/domain-context";

/** 旧页「处理详情」弹窗：按事件 ID 读取已办结节点的表单值，只读展示。 */
export const ProcessEventModal = defineComponent({
  name: "OutsourceRepairProcessEventModal",
  props: {
    open: { type: Boolean, default: false },
    eventId: { type: String, default: "" },
  },
  emits: ["update:open"],
  setup(props, { emit }) {
    const client = getOutsourceRepairClient();
    const form = ref<ProcessEventForm>({});
    const loading = ref(false);
    let token = 0;

    // 弹窗先同步打开再拉数据，加载期间保持可关闭；请求 token 忽略迟到响应。
    watch(
      () => [props.open, props.eventId] as const,
      ([open, eventId]) => {
        if (!open || !eventId) {
          return;
        }
        const current = ++token;
        form.value = {};
        loading.value = true;
        client
          .getProcessForm(eventId)
          .then((data) => {
            if (current !== token) {
              return;
            }
            if (!data) {
              message.warning("暂无详情");
              emit("update:open", false);
              return;
            }
            form.value = data;
          })
          .catch((error: unknown) => {
            if (current === token) {
              message.error(error instanceof Error ? error.message : "处理详情加载失败");
            }
          })
          .finally(() => {
            if (current === token) {
              loading.value = false;
            }
          });
      },
      { immediate: true },
    );

    return () => (
      <Modal open={props.open} title="处理详情" centered footer={null} onCancel={() => emit("update:open", false)}>
        <Spin spinning={loading.value}>
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            {(form.value.formValues ?? []).map((item, index) => (
              <FormItem key={item.formItemId ?? index} label={item.formItemName ?? ""}>
                <span>{item.val === undefined || item.val === null || item.val === "" ? "--" : String(item.val)}</span>
              </FormItem>
            ))}
            <FormItem label="结果">
              <span>{form.value.operation ? String(form.value.operation) : "--"}</span>
            </FormItem>
          </Form>
        </Spin>
      </Modal>
    );
  },
});
