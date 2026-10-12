import { DeleteOutlined } from "@ant-design/icons-vue";
import { computed, defineComponent, reactive, ref, watchEffect, type PropType } from "vue";

import { Form, FormItem, InputNumber, Space } from "@/pc-ui-runtime";
import type { FormInstance } from "@/pc-ui-runtime";
import type { UsagePricesState } from "@/types/fee";
import { inputNumber } from "@/utils/common";

import "./fee-form-items.less";

export const StepItem = defineComponent({
  name: "StepItem",
  props: {
    placeholder: { type: Array as PropType<string[]>, default: () => ["最小值", "最大值", "费用"] },
    items: { type: Array as PropType<UsagePricesState[]>, default: () => [] },
    min: { type: Number, default: 1 },
    unit: { type: String, default: "kw" },
  },
  emits: ["deleteItem", "update"],
  setup(props, { emit, expose }) {
    const formRef = ref<FormInstance>();
    const model = reactive<{ items: UsagePricesState[] }>({ items: props.items });

    const preEndUsage = computed(() => (index: number) => {
      if (index) return model.items[index - 1]?.endUsage || 0;
      return null;
    });

    const minValueFn = async (_rule: { required?: boolean; min?: number; max?: number }, value: number) => {
      if (!_rule.required) return Promise.resolve();
      if (value === null || typeof value === "undefined") {
        return Promise.reject(`请输入${props.placeholder[0]}`);
      }
      if (_rule.min && value <= _rule.min) {
        return Promise.reject("最小值应大于上一个阶梯的最大值");
      }
      if (!_rule.max) return Promise.resolve();
      if (value >= _rule.max) return Promise.reject("最小值应小于最大值");
      return Promise.resolve();
    };

    const maxValueFn = async (_rule: { required?: boolean; min?: number }, value: number) => {
      if (!_rule.required) return Promise.resolve();
      if (value === null || typeof value === "undefined") {
        return Promise.reject(`请输入${props.placeholder[1]}`);
      }
      const min = _rule.min || 0;
      if (value <= min) return Promise.reject("最大值应大于最小值");
      return Promise.resolve();
    };

    const removeItem = (item: UsagePricesState) => {
      const index = model.items.indexOf(item);
      if (index !== -1) model.items.splice(index, 1);
      emit("deleteItem", model.items);
    };

    const addItem = () => {
      model.items.push({ startUsage: undefined, endUsage: undefined, price: undefined });
    };

    watchEffect(() => {
      model.items = props.items;
    });

    const validateForm = async () => {
      try {
        return await formRef.value?.validate();
      } catch {
        return undefined;
      }
    };

    const resetForm = async () => {
      try {
        formRef.value?.resetFields();
      } catch {
        /* ignore */
      }
    };

    expose({ addItem, validateForm, resetForm });

    return () => (
      <Form ref={formRef} class="feeForm" model={model}>
        {model.items.map((item, index) => (
          <Space key={index} align="baseline" style={{ width: "100%" }}>
            <FormItem
              label={`${index + 1}阶段`}
              name={["items", index, "startUsage"]}
              rules={
                [
                  {
                    required: true,
                    validator: minValueFn,
                    max: item.endUsage,
                    min: preEndUsage.value(index) || 0,
                    trigger: "change",
                  },
                ] as never
              }
            >
              <InputNumber
                v-model:value={item.startUsage}
                class="fee-w-240"
                placeholder={`请输入${props.placeholder[0]}`}
                min={0}
                max={9999999}
                onChange={() => {
                  item.startUsage = inputNumber(item.startUsage || 0);
                }}
              />
            </FormItem>
            <span class="bot">~</span>
            <FormItem
              name={["items", index, "endUsage"]}
              rules={[{ required: true, validator: maxValueFn, min: item.startUsage || 0, trigger: "change" }] as never}
            >
              <InputNumber
                v-model:value={item.endUsage}
                class="fee-w-240"
                placeholder={`请输入${props.placeholder[1]}`}
                min={0}
                max={9999999}
                onChange={() => {
                  item.endUsage = inputNumber(item.endUsage || 0);
                }}
              />
            </FormItem>
            <span class="unit">{props.unit}</span>
            <FormItem
              name={["items", index, "price"]}
              rules={[{ required: true, message: `请输入${props.placeholder[2]}`, trigger: "change" }] as never}
              labelCol={{ span: 8 }}
            >
              <InputNumber
                v-model:value={item.price}
                class="fee-w-240"
                placeholder={`请输入${props.placeholder[2]}`}
                min={0}
                max={9999999}
                onChange={() => {
                  item.price = inputNumber(item.price || 0);
                }}
              />
            </FormItem>
            <span class="unit">元 / {props.unit === "kw" ? " kw·h" : props.unit}</span>
            {model.items.length > props.min && index >= props.min ? (
              <div class="fee-delete" onClick={() => removeItem(item)}>
                <DeleteOutlined class="fee-delete-icon" />
                删除
              </div>
            ) : null}
          </Space>
        ))}
      </Form>
    );
  },
});
