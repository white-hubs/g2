// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { defineComponent, reactive, ref } from "vue";

import { cubeDailyTaskService } from "@/api/server";
import { Form, type FormExpose, FormItem, Input, message } from "@/pc-ui-runtime";
import { usePcModal } from "@/pc-ui-runtime";

interface Props {
  title: string;
}
export const TypeEditModal = defineComponent({
  props: ["title"],
  emits: ["enter", "cancel"],
  setup(props: Props, { emit, expose }) {
    const formRenderRef = ref<FormExpose>();
    const formState = reactive<{
      id: string | undefined;
      name: string | undefined;
    }>({
      id: undefined,
      name: undefined,
    });
    const modalRules = {
      name: [{ required: true, message: "请输入任务类型名称", trigger: "blur" }],
    };
    const [PcModal, modalApi] = usePcModal({
      title: `${props.title}`,
      onConfirm: async () => {
        await formRenderRef.value?.validate();
        try {
          modalApi.setState({ confirmLoading: true });
          const params = {
            dailyType: getCurrentDailyType(),
            name: formState.name || "",
          };
          if (formState.id) {
            await cubeDailyTaskService.updateTaskCategory({ id: formState.id, ...params });
          } else {
            await cubeDailyTaskService.addTaskCategory(params);
          }
          message.success("操作成功");
          modalApi.close();
          emit("enter");
        } catch (error) {
          message.error((error as { errorMessage: string })?.errorMessage ?? "操作失败");
        } finally {
          modalApi.setState({ confirmLoading: false });
        }
      },
      onCancel: () => {
        formRenderRef.value?.resetFields();
        modalApi.close();
        emit("cancel");
      },
    });
    const openModal = (record?: { id: string }): void => {
      modalApi.open();
      for (const key in formState) {
        (formState as Record<string, unknown>)[key] = undefined;
      }
      if (record?.id) {
        modalApi.setState({ title: `编辑${props.title}` });
        Object.assign(formState, record);
      } else {
        modalApi.setState({ title: `新增${props.title}` });
      }
    };
    expose({
      openModal,
    });
    const modalSlots = {
      default: (): JSX.Element => (
        <Form model={formState} ref={formRenderRef} rules={modalRules} label-col={{ style: { width: "80px" } }}>
          <FormItem label="类型名称" name="name">
            <Input
              v-model:value={formState.name}
              placeholder="请输入任务类型名称"
              onKeydown={(e: KeyboardEvent): void => {
                if (e.key === " " || e.code === "Space") {
                  e.preventDefault();
                }
              }}
              onUpdate:value={(v: string): void => {
                formState.name = (v ?? "").replace(/\s+/g, "");
              }}
            />
          </FormItem>
        </Form>
      ),
    };
    return (): JSX.Element => <PcModal v-slots={modalSlots} />;
  },
});
