// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { DailyTaskType, getCurrentDailyType } from "@g2-client/daily-task/client";
import { type PropType, computed, defineComponent, reactive, ref, watch } from "vue";

import { AssocType, AssociationTabs } from "../association-tabs/association-tabs";
import { DailyTaskTypeSelect } from "@/components/daily-task-widgets";
import { Form, type FormExpose, FormItem, Input, Textarea } from "@/pc-ui-runtime";
import { getTaskTypeLabel } from "@/utils/daily-task-edit-common";

export const TaskBasicInfo = defineComponent({
  props: {
    modelValue: {
      type: Object as PropType<{
        name: string;
        categoryIds: string[] | undefined;
        categoryNames: string | undefined;
        description: string;
        enable: boolean;
        targetTypeRelations: {
          type: string;
          targetTypeId: string;
        }[];
      }>,
      required: true,
    },
    type: {
      type: String as PropType<"add" | "edit" | "detail">,
      default: "detail",
    },
  },
  emits: ["update:modelValue"],
  setup(props, { expose, emit }) {
    const disabled = computed(() => props.type === "detail");
    const visibleTabs = computed(() => {
      const dailyType = getCurrentDailyType();
      if (dailyType === DailyTaskType.SmallInspection) {
        return [AssocType.SMALL_ENGINEERING];
      }
      return undefined;
    });

    const formState = reactive<{
      name: string | undefined;
      categoryIds: string[] | undefined;
      categoryNames: string | undefined;
      description: string | undefined;
      enable: boolean;
      targetTypeRelations: {
        type: string;
        targetTypeId: string;
      }[];
    }>({
      name: props.modelValue.name || undefined,
      categoryIds: props.modelValue.categoryIds || undefined,
      categoryNames: props.modelValue.categoryNames || undefined,
      description: props.modelValue.description || undefined,
      enable: props.modelValue.enable ?? true,
      targetTypeRelations: props.modelValue.targetTypeRelations || [],
    });

    watch(
      () => props.modelValue,
      (nv) => {
        if (!nv) {
          return;
        }
        formState.name = nv.name || "";
        formState.categoryIds = nv.categoryIds || undefined;
        formState.categoryNames = nv.categoryNames || undefined;
        formState.description = nv.description || undefined;
        formState.enable = nv.enable ?? true;
        formState.targetTypeRelations = nv.targetTypeRelations || [];
      },
      { deep: true, immediate: true },
    );

    watch(
      formState,
      (val) => {
        emit("update:modelValue", {
          name: val.name || undefined,
          categoryIds: val.categoryIds || undefined,
          categoryNames: val.categoryNames || undefined,
          description: val.description || undefined,
          enable: val.enable ?? true,
          targetTypeRelations: val.targetTypeRelations || [],
        });
      },
      { deep: true },
    );

    const formRenderRef = ref<FormExpose>();
    const modalRules = {
      name: [{ required: true, message: "请输入标准名称", trigger: "blur" }],
      categoryIds: [{ required: true, message: "请选择适用范围", trigger: "change" }],
    };

    const validate = async (): Promise<Record<string, unknown>> => {
      await formRenderRef.value?.validate();
      return {
        ...formState,
        categoryIds: formState.categoryIds?.join(",") || undefined,
      };
    };

    expose({ validate });

    return (): JSX.Element => (
      <div>
        <Form model={formState} ref={formRenderRef} rules={modalRules}>
          <div style={{ display: "flex", gap: "16px" }}>
            <FormItem label="名称" name="name" style={{ flex: 1 }}>
              {!disabled.value ? (
                <Input v-model:value={formState.name} placeholder={"请输入标准名称"} maxlength={20} />
              ) : (
                <span>{formState.name ? formState.name : "--"}</span>
              )}
            </FormItem>
            <FormItem label="适用范围" name="categoryIds" style={{ flex: 1 }}>
              {!disabled.value ? (
                <DailyTaskTypeSelect
                  width="240px"
                  multiple={true}
                  value={formState.categoryIds}
                  placeholder={`请选择${getTaskTypeLabel(getCurrentDailyType())}`}
                  onUpdate:value={(v: string[]) => {
                    formState.categoryIds = v;
                  }}
                />
              ) : (
                <span>{formState.categoryNames ? formState.categoryNames : "--"}</span>
              )}
            </FormItem>
          </div>
          <FormItem label="说明" name="description">
            {!disabled.value ? (
              <Textarea v-model:value={formState.description} showCount maxlength={200} placeholder="请输入标准说明" />
            ) : (
              <span>{formState.description ? formState.description : "--"}</span>
            )}
          </FormItem>

          <FormItem label="关联" name="targetTypeRelations">
            <AssociationTabs
              disabled={disabled.value}
              modelValue={formState.targetTypeRelations}
              onUpdate:modelValue={(v: { type: string; targetTypeId: string }[]) => {
                formState.targetTypeRelations = v;
              }}
              {...(visibleTabs.value ? { visibleTabs: visibleTabs.value } : {})}
            />
          </FormItem>
        </Form>
      </div>
    );
  },
});
