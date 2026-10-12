import type { ProcessTaskCompletePayload, ProcessTaskForm } from "@g2-client/outsource-repair/client";
import {
  CheckboxGroup,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Radio,
  RadioGroup,
  Rate,
  Select,
  Spin,
  Switch,
  Textarea,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { getOutsourceRepairClient } from "@/domain-context";
import { designFormData, initialDesignValues, missingDesignField, parseDesignFields, type DesignField } from "@/utils/process-design-form";

/**
 * 旧页流程处理弹窗（验收审批 / 申请审批）：读取待办任务表单，选择处理结果并提交。
 *
 * 旧页有两套提交体：工单详情走 `formValueModifyParam.formValues`（`formItemVOS` 输入项），
 * 维修单详情走 `formValueModifyParam.formData`（自定义表单设计 `definition`）。
 */
export const ProcessTaskModal = defineComponent({
  name: "OutsourceRepairProcessTaskModal",
  props: {
    open: { type: Boolean, default: false },
    taskId: { type: String, default: "" },
    title: { type: String, default: "流程处理" },
    submitMode: { type: String as PropType<"formValues" | "formData">, default: "formValues" },
  },
  emits: ["update:open", "done"],
  setup(props, { emit }) {
    const client = getOutsourceRepairClient();
    const taskForm = ref<ProcessTaskForm>({});
    const designFields = ref<DesignField[]>([]);
    const designValues = reactive<Record<string, unknown>>({});
    const itemValues = reactive<Record<string, string>>({});
    const outcome = ref("");
    const loading = ref(false);
    const submitting = ref(false);
    let token = 0;

    const resetDraft = (): void => {
      outcome.value = "";
      for (const key of Object.keys(itemValues)) {
        delete itemValues[key];
      }
      for (const key of Object.keys(designValues)) {
        delete designValues[key];
      }
    };

    const close = (): void => {
      emit("update:open", false);
    };

    // 先同步打开弹窗再拉表单；无表单时按旧页提示并关闭。
    watch(
      () => [props.open, props.taskId] as const,
      ([open, taskId]) => {
        if (!open) {
          return;
        }
        resetDraft();
        taskForm.value = {};
        designFields.value = [];
        if (!taskId) {
          message.warning("暂无处理表单信息");
          close();
          return;
        }
        const current = ++token;
        loading.value = true;
        client
          .getProcessTaskForm(taskId)
          .then((data) => {
            if (current !== token) {
              return;
            }
            if (!data) {
              message.warning("暂无处理表单信息");
              close();
              return;
            }
            taskForm.value = data;
            for (const item of data.formItemVOS ?? []) {
              if (item.id) {
                itemValues[String(item.id)] = item.defaultValue ?? "";
              }
            }
            const fields = parseDesignFields(data.definition);
            designFields.value = fields;
            Object.assign(designValues, initialDesignValues(fields));
          })
          .catch((error: unknown) => {
            if (current === token) {
              message.error(error instanceof Error ? error.message : "处理表单加载失败");
              close();
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

    const buildPayload = (): ProcessTaskCompletePayload => {
      const base = { processId: props.taskId, formId: taskForm.value.id };
      if (props.submitMode === "formData") {
        return {
          taskId: props.taskId,
          outcome: outcome.value,
          formValueModifyParam: { ...base, formData: designFormData(designFields.value, designValues) },
        };
      }
      return {
        taskId: props.taskId,
        outcome: outcome.value,
        formValueModifyParam: {
          ...base,
          formValues: (taskForm.value.formItemVOS ?? []).map((item) => ({
            formItemId: item.id,
            val: itemValues[String(item.id)] ?? "",
          })),
        },
      };
    };

    const submit = async (): Promise<void> => {
      if (submitting.value || loading.value) {
        return;
      }
      if (!outcome.value) {
        message.warning("请选择处理结果");
        return;
      }
      if (props.submitMode === "formValues") {
        const missing = (taskForm.value.formItemVOS ?? []).find((item) => !itemValues[String(item.id)]);
        if (missing) {
          message.warning(`${missing.type === "input" ? "请选择" : "请输入"}${missing.name ?? ""}`);
          return;
        }
      } else {
        const missing = missingDesignField(designFields.value, designValues);
        if (missing) {
          message.warning(`请填写${missing.label ?? ""}`);
          return;
        }
      }
      submitting.value = true;
      try {
        await client.completeProcessTask(buildPayload());
        message.success("操作成功");
        close();
        emit("done");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "提交失败");
      } finally {
        submitting.value = false;
      }
    };

    /** 自定义表单设计字段：只覆盖旧页设计器实际使用的控件类型。 */
    const renderDesignField = (field: DesignField): JSX.Element => {
      const key = String(field.model);
      const options = (field.options?.options ?? []).map((item) => ({
        label: String(item.label ?? item.value ?? ""),
        value: item.value ?? "",
      }));
      const update = (value: unknown): void => {
        designValues[key] = value;
      };
      switch (field.type) {
        case "textarea":
          return (
            <Textarea
              value={designValues[key] as string | undefined}
              maxlength={field.options?.maxlength ?? 200}
              placeholder={field.options?.placeholder ?? field.label}
              autoSize={{ minRows: 2, maxRows: 8 }}
              onUpdate:value={update}
            />
          );
        case "number":
          return <InputNumber value={designValues[key] as number | undefined} style={{ width: "100%" }} onUpdate:value={update} />;
        case "select":
          return (
            <Select
              value={designValues[key] as string | string[] | undefined}
              mode={field.options?.mode === "multiple" ? "multiple" : undefined}
              options={options}
              allowClear
              placeholder={field.options?.placeholder ?? "请选择"}
              onUpdate:value={update}
            />
          );
        case "radio":
          return (
            <RadioGroup value={designValues[key] as string | undefined} onUpdate:value={update}>
              {options.map((item) => (
                <Radio key={String(item.value)} value={item.value}>
                  {item.label}
                </Radio>
              ))}
            </RadioGroup>
          );
        case "checkbox":
          return <CheckboxGroup value={designValues[key] as string[] | undefined} options={options} onUpdate:value={update} />;
        case "date":
          return (
            <DatePicker
              value={designValues[key] as string | undefined}
              valueFormat="YYYY-MM-DD"
              style={{ width: "100%" }}
              onUpdate:value={update}
            />
          );
        case "rate":
          return <Rate value={(designValues[key] as number | undefined) ?? 0} onUpdate:value={update} />;
        case "switch":
          return <Switch checked={Boolean(designValues[key])} onUpdate:checked={update} />;
        default:
          return (
            <Input
              value={designValues[key] as string | undefined}
              placeholder={field.options?.placeholder ?? field.label}
              onUpdate:value={update}
            />
          );
      }
    };

    return () => (
      <Modal
        open={props.open}
        title={props.title}
        centered
        okText="确定"
        cancelText="取消"
        confirmLoading={submitting.value}
        onOk={() => void submit()}
        onCancel={close}
      >
        <Spin spinning={loading.value}>
          <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
            <FormItem label="处理结果" required>
              <RadioGroup
                value={outcome.value}
                onUpdate:value={(value: unknown) => {
                  outcome.value = String(value ?? "");
                }}
              >
                {(taskForm.value.actions ?? []).map((action) => (
                  <Radio key={action} value={action}>
                    {action}
                  </Radio>
                ))}
              </RadioGroup>
            </FormItem>
            {props.submitMode === "formValues"
              ? (taskForm.value.formItemVOS ?? []).map((item) => (
                  <FormItem key={item.id} label={item.name ?? ""} required>
                    <Input
                      value={itemValues[String(item.id)] ?? ""}
                      placeholder={item.name ?? ""}
                      onUpdate:value={(value: unknown) => {
                        itemValues[String(item.id)] = String(value ?? "");
                      }}
                    />
                  </FormItem>
                ))
              : designFields.value.map((field) => (
                  <FormItem key={String(field.model)} label={field.label ?? ""} required={Boolean(field.options?.required)}>
                    {renderDesignField(field)}
                  </FormItem>
                ))}
          </Form>
        </Spin>
      </Modal>
    );
  },
});
