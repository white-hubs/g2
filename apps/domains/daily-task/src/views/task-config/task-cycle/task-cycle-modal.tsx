// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { defineComponent, reactive, ref } from "vue";

import { cubeDailyTaskService } from "@/api/server";
import { Form, type FormExpose, FormItem, Input, Textarea, message } from "@/pc-ui-runtime";
import { usePcModal } from "@/pc-ui-runtime";

interface Props {
  title: string;
}
export const TaskCycleModal = defineComponent({
  props: ["title"],
  emits: ["enter", "cancel"],
  setup(props: Props, { emit, expose }) {
    const formRenderRef = ref<FormExpose>();
    const formState = reactive<{
      id: string | undefined;
      name: string | undefined;
      cron: string | undefined;
      description: string | undefined;
    }>({
      id: undefined,
      name: undefined,
      cron: undefined,
      description: undefined,
    });
    const modalRules = {
      name: [{ required: true, message: "请输入周期名称", trigger: "blur" }],
      cron: [{ required: true, message: "请输入表达式", trigger: "blur" }],
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
            cron: formState.cron || "",
            description: formState.description || "",
          };
          if (formState.id) {
            await cubeDailyTaskService.updateTaskCycle({
              id: formState.id || "",
              ...params,
            });
          } else {
            await cubeDailyTaskService.addTaskCycle(params);
          }
          message.success("操作成功");
          modalApi.close();
          emit("enter");
        } catch {
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
    const openModal = (record?: unknown): void => {
      modalApi.open();
      for (const key in formState) {
        (formState as Record<string, unknown>)[key] = undefined;
      }
      if (record) {
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
          <FormItem label="周期名称" name="name">
            <Input
              v-model:value={formState.name}
              placeholder="请输入周期名称"
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
          <FormItem label="表达式" name="cron">
            <Textarea v-model:value={formState.cron} placeholder="请输入表达式" maxlength={200} />
          </FormItem>
          <FormItem label="描述" name="description">
            <Textarea v-model:value={formState.description} placeholder="请输入描述" maxlength={200} />
          </FormItem>
        </Form>
      ),
    };
    return (): JSX.Element => <PcModal v-slots={modalSlots} />;
  },
});
