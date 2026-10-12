import type { Dayjs, FormRule } from "@g2-platform/pc-ui";
import { dayjs } from "@g2-platform/pc-ui";
import { DatePicker, Form, type FormExpose, FormItem, InputNumber, Modal, Textarea, message } from "@g2-platform/pc-ui";
import { type VNode, computed, defineComponent, reactive, ref } from "vue";

import { leaveBalanceUpdate } from "@/api/staff-leave";
import { logger } from "@/logger";

export const ChangeBalanceModal = defineComponent({
  emits: ["success"],
  setup: (props, { emit, expose }) => {
    const modalVisible = ref(false);
    const loading = ref(false);
    let requestVersion = 0;
    const formInstance = ref<FormExpose>();
    const formState = reactive({
      availableBalance: null as number | null,
      deadline: undefined as string | undefined,
      remark: "",
      staffId: "",
      holidayRuleId: "",
    });
    const unit = ref("天");
    const balanceStep = computed(() => (unit.value === "小时" ? 0.1 : 0.5));
    const checkRemark = async (): Promise<void> => {
      if (!formState.remark) {
        return;
      }

      if (!/^[\u4E00-\u9FA5\w\d]+$/.test(formState.remark)) {
        throw new Error("仅支持包含中英文字符及数字");
      }
      return;
    };
    const formRules: Record<string, FormRule[]> = {
      availableBalance: [{ required: true, message: "请输入余额", trigger: "blur" }],
      remark: [{ validator: checkRemark }],
    };
    const disableDate = (current: Dayjs): boolean => {
      if (current && (current.isAfter(dayjs()) || current.startOf("day").isSame(dayjs().startOf("day")))) {
        return false;
      }
      return true;
    };

    const openModal = (res: { staffId: string; holidayRuleId: string; availableBalance: number }, outerUnit: "天" | "小时"): void => {
      requestVersion++;
      loading.value = false;
      formState.staffId = res.staffId;
      formState.holidayRuleId = res.holidayRuleId;
      formState.availableBalance = null;
      formState.deadline = undefined;
      formState.remark = "";
      modalVisible.value = true;
      unit.value = outerUnit;
    };

    /** 确定按钮回回调 */
    const ok = async (): Promise<void> => {
      if (loading.value) {
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
        await leaveBalanceUpdate({ ...formState, deadline: formState.deadline ?? "", unit: unit.value, incrementalUpdate: true });
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
        cancelText="取消"
        open={modalVisible.value}
        title="新增余额"
        width="500px"
        destroyOnClose
        onOk={ok}
        onCancel={cancel}
        confirmLoading={loading.value}
      >
        <Form ref={formInstance} model={formState} labelCol={{ style: { width: "120px" } }} rules={formRules}>
          <FormItem label={`余额新增(${unit.value})`} name="availableBalance">
            <InputNumber
              v-model:value={formState.availableBalance}
              min={0}
              max={999}
              precision={1}
              step={balanceStep.value}
              style="margin-right:5px"
            />
          </FormItem>
          <FormItem label="有效期" name="date">
            <DatePicker valueFormat="YYYY-MM-DD" v-model:value={formState.deadline} disabledDate={disableDate} />
          </FormItem>
          <FormItem label="备注" name="remark">
            <Textarea v-model:value={formState.remark} maxlength={200} allowClear={false} />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
