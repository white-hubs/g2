import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons-vue";
import { type InspectionRecord } from "@g2-contract/daily-inspection";
import { Button, Checkbox, Form, FormItem, Input, Modal, Spin, Switch, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, reactive, ref, watch } from "vue";

import { getDailyInspectionClient } from "@/domain-context";

interface ResultOption {
  key: string;
  itemName: string;
  itemValue: string;
  errorFlag: boolean;
}

interface ResultForm {
  name: string;
  code: string;
  enable: boolean;
  options: ResultOption[];
}

let nextOptionKey = 0;

function newOption(index: number): ResultOption {
  nextOptionKey += 1;
  return { key: `new-${Date.now()}-${nextOptionKey}`, itemName: "", itemValue: String(index + 1), errorFlag: false };
}

function readDetail(record: InspectionRecord): ResultForm {
  const options = Array.isArray(record.options) ? record.options : [];
  return {
    name: String(record.name ?? ""),
    code: String(record.code ?? ""),
    enable: record.enable !== false,
    options: options.map((raw, index) => {
      const option = raw as Record<string, unknown>;
      return {
        key: String(option.key ?? newOption(index).key),
        itemName: String(option.itemName ?? ""),
        itemValue: String(option.itemValue ?? index + 1),
        errorFlag: option.errorFlag === true,
      };
    }),
  };
}

/** 巡检结果使用旧应用的状态与动态结果项协议，不复用通用配置表单。 */
export const InspectResultModal = defineComponent({
  name: "InspectResultModal",
  props: {
    open: { type: Boolean, required: true },
    id: { type: String as PropType<string>, default: "" },
  },
  emits: ["close", "saved"],
  setup(props, { emit }) {
    const form = reactive<ResultForm>({ name: "", code: "", enable: true, options: [] });
    const loading = ref(false);
    const loadFailed = ref(false);
    const saving = ref(false);
    const nameError = ref("");
    const optionsError = ref("");
    let requestVersion = 0;

    watch(
      () => [props.open, props.id] as const,
      ([open, id]) => {
        requestVersion += 1;
        const version = requestVersion;
        if (!open) {
          loading.value = false;
          return;
        }
        Object.assign(form, { name: "", code: "", enable: true, options: [] });
        nameError.value = "";
        optionsError.value = "";
        loadFailed.value = false;
        if (!id) {
          loading.value = false;
          return;
        }
        loading.value = true;
        void getDailyInspectionClient()
          .getConfig("result", id)
          .then((detail) => {
            if (version === requestVersion) {
              Object.assign(form, readDetail(detail));
            }
          })
          .catch(() => {
            if (version === requestVersion) {
              loadFailed.value = true;
              message.error("巡检结果详情加载失败");
            }
          })
          .finally(() => {
            if (version === requestVersion) {
              loading.value = false;
            }
          });
      },
      { immediate: true },
    );

    const close = (): void => {
      requestVersion += 1;
      emit("close");
    };

    const addOption = (): void => {
      form.options.push(newOption(form.options.length));
      optionsError.value = "";
    };

    const removeOption = (index: number): void => {
      form.options.splice(index, 1);
      form.options.forEach((option, optionIndex) => {
        option.itemValue = String(optionIndex + 1);
      });
    };

    const save = async (): Promise<void> => {
      if (loading.value || loadFailed.value || saving.value) {
        return;
      }
      nameError.value = form.name.trim() ? "" : "请输入结果名称";
      optionsError.value =
        form.options.length === 0
          ? "请添加结果项"
          : form.options.some((option) => !option.itemName.trim())
            ? "请输入结果项描述"
            : !form.options.some((option) => option.errorFlag)
              ? "请至少选择一项异常项"
              : "";
      if (nameError.value || optionsError.value) {
        return;
      }

      saving.value = true;
      const version = requestVersion;
      try {
        const payload: InspectionRecord = {
          ...(props.id ? { id: props.id } : {}),
          code: form.code,
          name: form.name.trim(),
          enable: form.enable,
          options: form.options.map((option) => ({
            key: option.key,
            itemName: option.itemName.trim(),
            itemValue: option.itemValue,
            errorFlag: option.errorFlag,
          })),
        };
        if (props.id) {
          await getDailyInspectionClient().updateConfig("result", props.id, payload);
        } else {
          await getDailyInspectionClient().createConfig("result", payload);
        }
        message.success("操作成功");
        emit("saved");
        if (version === requestVersion) {
          close();
        }
      } catch {
        if (version === requestVersion) {
          message.error("保存失败，请稍后重试");
        }
      } finally {
        saving.value = false;
      }
    };

    return () => (
      <Modal
        open={props.open}
        title={`${props.id ? "编辑" : "新增"}巡检结果`}
        width={600}
        okText="确定"
        cancelText="取消"
        okButtonProps={{ disabled: loading.value || loadFailed.value }}
        confirmLoading={saving.value}
        onOk={() => void save()}
        onCancel={close}
      >
        <Spin spinning={loading.value}>
          <Form model={form} labelCol={{ style: { width: "80px" } }}>
            <FormItem label="结果名称" required validateStatus={nameError.value ? "error" : undefined} help={nameError.value}>
              <Input
                v-model:value={form.name}
                maxlength={20}
                showCount
                placeholder="请输入结果名称"
                onInput={() => (nameError.value = "")}
              />
            </FormItem>
            <FormItem label="状态">
              <Switch v-model:checked={form.enable} />
            </FormItem>
            <FormItem label="结果项" required validateStatus={optionsError.value ? "error" : undefined} help={optionsError.value}>
              <Button type="dashed" onClick={addOption}>
                <PlusOutlined /> 添加
              </Button>
              {form.options.map((option, index) => (
                <div key={option.key} style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                  <Input
                    v-model:value={option.itemName}
                    maxlength={16}
                    showCount
                    placeholder="请输入结果项描述"
                    style={{ width: "280px" }}
                    onInput={() => (optionsError.value = "")}
                  />
                  <Checkbox v-model:checked={option.errorFlag} onChange={() => (optionsError.value = "")}>
                    异常点
                  </Checkbox>
                  <Button type="link" danger size="small" title="删除" onClick={() => removeOption(index)}>
                    <MinusCircleOutlined />
                  </Button>
                </div>
              ))}
            </FormItem>
          </Form>
        </Spin>
      </Modal>
    );
  },
});
