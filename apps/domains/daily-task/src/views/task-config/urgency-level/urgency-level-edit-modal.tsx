// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { defineComponent, reactive, ref } from "vue";

import { cubeDailyTaskService } from "@/api/server";
import { Form, type FormExpose, FormItem, Input, message } from "@/pc-ui-runtime";
import { usePcModal } from "@/pc-ui-runtime";

interface Props {
  title: string;
}
export const UrgencyLevelEditModal = defineComponent({
  props: ["title"],
  emits: ["enter", "cancel"],
  setup(props: Props, { emit, expose }) {
    const formRenderRef = ref<FormExpose>();
    const formState = reactive<{
      id: string | undefined;
      name: string | undefined;
      level: number | undefined;
    }>({
      id: undefined,
      name: undefined,
      level: undefined,
    });
    const modalRules = {
      name: [{ required: true, message: "请输入名称", trigger: "blur" }],
      level: [
        { required: true, message: "请输入优先级", trigger: "blur" },
        {
          validator: async (_rule: unknown, value: unknown): Promise<Error | void> => {
            const n = typeof value === "number" ? value : Number(value);
            if (!Number.isInteger(n)) {
              throw new Error("优先级需为整数");
            }
            if (n < 1 || n > 99) {
              throw new Error("优先级范围为1-99");
            }
            return;
          },
          trigger: "change",
        },
      ],
    };
    const [PcModal, modalApi] = usePcModal({
      title: `${props.title}`,
      onConfirm: async () => {
        await formRenderRef.value?.validate();
        try {
          modalApi.setState({ confirmLoading: true });
          const params = {
            name: formState.name || "",
            level: formState.level || 0,
            dailyType: getCurrentDailyType(),
          };
          if (formState.id) {
            await cubeDailyTaskService.updateUrgency({
              id: formState.id || "",
              ...params,
            });
          } else {
            await cubeDailyTaskService.addUrgency(params);
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
        <Form model={formState} ref={formRenderRef} rules={modalRules} label-col={{ style: { width: "100px" } }}>
          <FormItem label="名称" name="name">
            <Input
              v-model:value={formState.name}
              placeholder="请输入名称"
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
          <FormItem label="优先级" name="level">
            <Input
              type="number"
              inputmode="numeric"
              pattern="[0-9]*"
              v-model:value={formState.level}
              placeholder="请输入优先级(1-99)"
              onKeydown={(e: KeyboardEvent): void => {
                const el = e.target as HTMLInputElement;
                const blocked = e.key === "-" || e.key === "e" || e.key === "E" || e.key === ".";
                const leadingZero = e.key === "0" && (el.value === "" || el.selectionStart === 0);
                if (blocked || leadingZero) {
                  e.preventDefault();
                }
              }}
              onUpdate:value={(v: string | number): void => {
                const raw = typeof v === "number" ? String(v) : (v ?? "");
                const digits = raw.replace(/[^\d]/g, "");
                const num = Number(digits);
                const clamped = Math.max(1, Math.min(99, Number.isNaN(num) ? 1 : Math.floor(num)));
                formState.level = clamped;
              }}
            />
          </FormItem>
        </Form>
      ),
    };
    return (): JSX.Element => <PcModal v-slots={modalSlots} />;
  },
});
