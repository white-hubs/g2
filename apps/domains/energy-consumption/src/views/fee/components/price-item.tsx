import { DeleteOutlined } from "@ant-design/icons-vue";
import { defineComponent, reactive, ref, watchEffect, type PropType } from "vue";

import { Form, FormItem, InputNumber, Select, Space } from "@/pc-ui-runtime";
import type { FormInstance } from "@/pc-ui-runtime";
import type { PeriodPricesState } from "@/types/fee";
import { inputNumber } from "@/utils/common";

import "./fee-form-items.less";

export const PriceItem = defineComponent({
  name: "PriceItem",
  props: {
    placeholder: { type: Array as PropType<string[]>, default: () => ["属性名称", "属性值"] },
    items: { type: Array as PropType<PeriodPricesState[]>, default: () => [] },
    min: { type: Number, default: 1 },
  },
  emits: ["deleteItem", "update"],
  setup(props, { emit, expose }) {
    const formRef = ref<FormInstance>();
    const model = reactive<{ items: PeriodPricesState[] }>({ items: props.items });

    const checkPeriodType = async (_rule: unknown, value: string) => {
      if (!value) return Promise.resolve();
      const types = model.items.map((item) => item.periodType);
      const idx = types.indexOf(value);
      types.splice(idx, 1);
      if (types.includes(value)) return Promise.reject("该费率时段已存在");
      return Promise.resolve();
    };

    const rules = {
      periodType: [
        { required: true, message: `请选择${props.placeholder[0]}`, trigger: "change" },
        { required: true, validator: checkPeriodType, trigger: "change" },
      ],
      price: [{ required: true, message: `请输入${props.placeholder[1]}`, trigger: "change" }],
    };

    const options = [
      { label: "平时", value: "PV" },
      { label: "峰时", value: "FV" },
      { label: "谷时", value: "GV" },
    ];

    const removeItem = (item: PeriodPricesState) => {
      const index = model.items.indexOf(item);
      if (index !== -1) model.items.splice(index, 1);
      emit("deleteItem", model.items);
    };

    const addItem = () => {
      model.items.push({ periodType: undefined, price: undefined });
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
            <FormItem label="时段" name={["items", index, "periodType"]} rules={rules.periodType as never}>
              <Select
                v-model:value={item.periodType}
                class="fee-w-180"
                placeholder={`请选择${props.placeholder[0]}`}
                options={options}
                allowClear
              />
            </FormItem>
            <FormItem name={["items", index, "price"]} rules={rules.price as never} labelCol={{ span: 8 }}>
              <InputNumber
                v-model:value={item.price}
                class="fee-w-280"
                placeholder={`请输入${props.placeholder[1]}`}
                min={0}
                max={9999999}
                onChange={() => {
                  item.price = inputNumber(item.price || 0);
                }}
              />
            </FormItem>
            <span class="unit">元</span>
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
