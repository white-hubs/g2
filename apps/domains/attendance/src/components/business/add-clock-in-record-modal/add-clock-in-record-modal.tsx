import type { FormRule } from "@g2-platform/pc-ui";
import { DatePicker, Form, type FormExpose, FormItem, Modal, Select, dayjs, message } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, reactive, ref, watch } from "vue";

import { clockInLogByDate, clockInRecordInsert } from "@/api/staff-clock-in";
import { type AttendanceUser, UserPickerInput } from "@/components/business/user-picker-table/user-picker-modal";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";
import { type ClockInStatus, ClockInStatusOptions } from "@/types/classes";

export const AddClockInRecordModal = defineComponent({
  emits: ["success"],
  setup: (props, { expose, emit }) => {
    const modalVisible = ref(false);
    const loading = ref(false);
    const formInstance = ref<FormExpose>();
    const formState = reactive<{ user?: AttendanceUser[]; date?: string; time?: string; id?: string }>({
      user: undefined,
      date: undefined,
      time: undefined,
      /** 异常打卡记录ID */
      id: undefined,
    });
    const formRules: Record<string, FormRule[]> = {
      user: [{ required: true, message: `请选择${KEYWORD_ALIAS.staff}`, trigger: "blur" }],
      date: [{ required: true, message: "请选择打卡日期", trigger: "blur" }],
      time: [{ required: true, message: "请选择打卡时间", trigger: "blur" }],
      id: [{ required: true, message: "请选择异常打卡记录", trigger: "blur" }],
    };
    const openModal = (): void => {
      request++;
      recordLoading.value = false;
      formState.user = undefined;
      formState.date = undefined;
      formState.time = undefined;
      formState.id = undefined;
      recordSelectOptions.value = [];
      modalVisible.value = true;
    };
    const recordSelectOptions = ref<{ label: string; value: string }[]>([]);

    /** 确定按钮回回调 */
    const ok = async (): Promise<void> => {
      if (loading.value) {
        return;
      }
      loading.value = true;
      try {
        formInstance.value?.clearValidate();
        await formInstance.value?.validate();
        const user = formState.user as unknown as { id: string }[];
        const params = {
          id: formState.id,
          userId: user[0].id,
          actualClockInTime: formState.time ?? "",
        };
        await clockInRecordInsert(params);
        modalVisible.value = false;
        emit("success");
      } catch (error) {
        logger.error(error);
      } finally {
        loading.value = false;
      }
    };
    const cancel = (): void => {
      modalVisible.value = false;
      request++;
      recordLoading.value = false;
    };
    const recordLoading = ref(false);
    let request = 0;
    const getClockRecord = async (): Promise<void> => {
      const version = ++request;
      recordSelectOptions.value = [];
      formState.id = undefined;
      const user = formState.user?.[0];
      if (!user || !formState.date || !modalVisible.value) {
        recordLoading.value = false;
        return;
      }
      recordLoading.value = true;
      try {
        const params = {
          clockInDate: formState.date,
          userId: user.id,
        };
        const res = await clockInLogByDate(params);
        if (version !== request || !modalVisible.value) {
          return;
        }
        if (res.data) {
          recordSelectOptions.value = (res.data as unknown as unknown[]).map((e) => {
            const item = e as {
              requireClockInTime: number;
              actualClockInTime: number;
              ways: "GPS" | "DEVEICE" | "";
              id: string;
              clockType: string;
              state: ClockInStatus;
            };
            return {
              label: `${dayjs(item.requireClockInTime).format("HH:mm")} ${item.clockType === "START" ? "上班" : "下班"}${ClockInStatusOptions.find((op) => op.value === item.state)?.label} ${item.ways && (item.ways === "GPS" ? "/ GPS打卡" : " /考勤机打卡")}`,
              value: item.id,
            };
          });
        }
      } catch (error) {
        logger.debug(error);
        message.error("打卡记录加载失败");
      } finally {
        if (version === request) {
          recordLoading.value = false;
        }
      }
    };
    watch(
      () => formState.date,
      () => {
        getClockRecord();
      },
    );
    watch(
      () => formState.user,
      () => {
        getClockRecord();
      },
    );

    expose({
      openModal,
    });

    return (): VNode => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={modalVisible.value}
        title="新增"
        width="500px"
        destroyOnClose
        onOk={ok}
        onCancel={cancel}
        confirmLoading={loading.value}
      >
        <Form ref={formInstance} model={formState} labelCol={{ style: { width: "100px" } }} rules={formRules}>
          <FormItem label={`${KEYWORD_ALIAS.staff}`} name="user">
            <UserPickerInput value={formState.user} v-model:value={formState.user} />
          </FormItem>
          <FormItem label="打卡日期" name="date">
            <DatePicker valueFormat="YYYY-MM-DD" value={formState.date} v-model:value={formState.date} />
          </FormItem>
          <FormItem label="打卡时间" name="time">
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="YYYY-MM-DD HH:mm"
              valueFormat="YYYY-MM-DD HH:mm"
              value={formState.time}
              v-model:value={formState.time}
            />
          </FormItem>
          <FormItem label="打卡班次" name="id">
            <Select
              loading={recordLoading.value}
              placeholder="请选择异常打卡记录"
              value={formState.id}
              v-model:value={formState.id}
              options={recordSelectOptions.value}
            />
          </FormItem>
        </Form>
      </Modal>
    );
  },
});
