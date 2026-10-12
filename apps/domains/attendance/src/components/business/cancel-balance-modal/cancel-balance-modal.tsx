import type { FormRule } from "@g2-platform/pc-ui";
import { Form, type FormExpose, FormItem, Modal, Textarea, dayjs, message } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, reactive, ref } from "vue";

import { leaveBalanceCancel } from "@/api/staff-leave";
import { logger } from "@/logger";

/** 作废假期余额弹窗 */
export const CancelBalanceModal = defineComponent({
  emits: ["success"],
  setup: (props, { emit, expose }) => {
    const modalVisible = ref(false);
    const loading = ref(false);
    let requestVersion = 0;
    const formInstance = ref<FormExpose>();
    const formState = reactive({
      id: "",
      updateName: "",
      effectiveRemark: "",
      effectiveTime: "",
    });
    const type = ref<"cancel" | "confirm">("cancel");

    const formRules: Record<string, FormRule[]> = {
      effectiveRemark: [{ required: true, message: "请输入作废理由", trigger: "blur" }],
    };

    const openModal = (
      res: { id: string; updateName: string; effectiveTime: number; effectiveRemark: string },
      modalType: "cancel" | "confirm",
    ): void => {
      requestVersion++;
      loading.value = false;
      type.value = modalType;
      formState.id = res.id;
      formState.updateName = res.updateName ?? "--";
      formState.effectiveRemark = modalType === "cancel" ? "" : (res.effectiveRemark ?? "--");
      formState.effectiveTime = res.effectiveTime ? dayjs(res.effectiveTime).format("YYYY-MM-DD HH:mm:ss") : "--";
      modalVisible.value = true;
    };

    /** 确定按钮回回调 */
    const ok = async (): Promise<void> => {
      if (loading.value) {
        return;
      }
      if (type.value !== "cancel") {
        modalVisible.value = false;
        return;
      }
      const current = ++requestVersion;
      loading.value = true;
      try {
        formInstance.value?.clearValidate();
        await formInstance.value?.validate();
        if (current !== requestVersion || !modalVisible.value) {
          return;
        }
        loading.value = true;
        await leaveBalanceCancel({ ...formState });
        if (current !== requestVersion || !modalVisible.value) {
          return;
        }
        modalVisible.value = false;
        message.success("修改成功");
        emit("success");
      } catch (error) {
        logger.error(error);
        message.error("保存失败，请检查输入");
      } finally {
        if (current === requestVersion) {
          loading.value = false;
        }
      }
    };
    const cancel = (): void => {
      requestVersion++;
      modalVisible.value = false;
    };

    expose({
      openModal,
    });

    return (): VNode => (
      <Modal
        okText="确定"
        open={modalVisible.value}
        title={type.value === "cancel" ? "作废确认" : "作废详情"}
        width="500px"
        destroyOnClose
        onOk={ok}
        onCancel={cancel}
        confirmLoading={loading.value}
        footer={type.value === "confirm" ? null : undefined}
        cancelText={type.value === "cancel" ? "取消" : "关闭"}
      >
        <Form ref={formInstance} model={formState} labelCol={{ style: { width: "120px" } }} rules={formRules}>
          {type.value === "cancel" && (
            <FormItem label="作废理由" name="effectiveRemark">
              <Textarea v-model:value={formState.effectiveRemark} maxlength={200} allowClear={false} />
              作废后不可逆，请仔细确认后操作
            </FormItem>
          )}
          {type.value === "confirm" && (
            <>
              <FormItem label="作废人">
                <span style="margin-left:10px">{formState.updateName}</span>
              </FormItem>
              <FormItem label="作废时间">
                <span style="margin-left:10px">{formState.effectiveTime}</span>
              </FormItem>
              <FormItem label="作废理由">
                <Textarea v-model:value={formState.effectiveRemark} bordered={false} readonly showCount={false} />
              </FormItem>
            </>
          )}
        </Form>
      </Modal>
    );
  },
});
