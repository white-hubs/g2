import type { FormRule } from "@g2-platform/pc-ui";
import { Button, DatePicker, Form, type FormExpose, FormItem, Modal, Upload, dayjs, message } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, reactive, ref } from "vue";

import { staffSchedulingImport } from "@/api/scheduling-manage";
import { logger } from "@/logger";

/** 导入排班 */
export const ImportSchedulingTemplate = defineComponent({
  emits: ["success"],
  setup: (props, { emit }) => {
    const modalVisible = ref(false);
    const loading = ref(false);
    const formInstance = ref<FormExpose>();
    const formState = reactive<{
      month: string | undefined;
      fileList: File[];
    }>({
      month: undefined,
      fileList: [],
    });
    const checkFile = async (): Promise<void> => {
      if (formState.fileList.length === 0) {
        throw new Error("请上传模板");
      }
      return;
    };
    const formRules: Record<string, FormRule[]> = {
      month: [{ required: true, message: "请选择月份", trigger: "blur" }],
      fileList: [{ required: true, validator: checkFile, trigger: "blur" }],
    };
    const openModal = (): void => {
      formState.month = undefined;
      formState.fileList = [];
      modalVisible.value = true;
    };

    /** 确定按钮回回调 */
    const ok = async (): Promise<void> => {
      if (loading.value) {
        return;
      }
      formInstance.value?.clearValidate();
      await formInstance.value?.validate();

      try {
        loading.value = true;
        const formData = new FormData();
        formData.append("file", formState.fileList[0]);
        formData.append("yearMonth", dayjs(formState.month).format("YYYY-MM"));
        await staffSchedulingImport(formData);
        modalVisible.value = false;
        message.success("导入成功");
        emit("success");
      } catch (error) {
        logger.error(error);
      } finally {
        loading.value = false;
      }
    };
    const cancel = (): void => {
      modalVisible.value = false;
    };

    const beforeUpload = (file: File): boolean => {
      formState.fileList = [file];
      return false;
    };
    return (): VNode => (
      <>
        <Button type="primary" style="margin-left:10px" onClick={openModal} loading={loading.value}>
          导入排班表
        </Button>
        <Modal
          okText="确定"
          cancelText="取消"
          open={modalVisible.value}
          title="导入"
          width="500px"
          destroyOnClose
          onOk={ok}
          onCancel={cancel}
          confirmLoading={loading.value}
        >
          <Form ref={formInstance} model={formState} labelCol={{ style: { width: "100px" } }} rules={formRules}>
            <FormItem label="月份" name="month">
              <DatePicker value={formState.month} v-model:value={formState.month} picker="month" valueFormat="YYYY-MM" />
            </FormItem>
            <FormItem label="模板" name="fileList">
              <Upload
                maxCount={1}
                beforeUpload={beforeUpload}
                remove={() => {
                  formState.fileList.length = 0;
                }}
              >
                <Button type="primary" shape="round" class="cube-ui-file-upload-btn">
                  上传附件
                </Button>
              </Upload>
            </FormItem>
          </Form>
        </Modal>
      </>
    );
  },
});
