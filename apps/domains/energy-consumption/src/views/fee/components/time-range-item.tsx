import { DeleteOutlined } from "@ant-design/icons-vue";
import { defineComponent, reactive, ref, watchEffect, type PropType } from "vue";

import { Form, FormItem, Select, Space, TimePicker, dayjs } from "@/pc-ui-runtime";
import type { FormInstance } from "@/pc-ui-runtime";
import type { PeriodDefinesState } from "@/types/fee";

import "./fee-form-items.less";

const TimeRangePicker = TimePicker.RangePicker;

export const TimeRangeItem = defineComponent({
  name: "TimeRangeItem",
  props: {
    placeholder: { type: Array as PropType<string[]>, default: () => ["属性名称", "属性值"] },
    items: { type: Array as PropType<PeriodDefinesState[]>, default: () => [] },
    min: { type: Number, default: 1 },
  },
  emits: ["deleteItem", "update"],
  setup(props, { emit, expose }) {
    const formRef = ref<FormInstance>();
    const model = reactive<{ items: PeriodDefinesState[] }>({ items: props.items });

    const rules = {
      periodType: [{ required: true, message: `请选择${props.placeholder[0]}`, trigger: "change" }],
      time: [
        {
          required: true,
          validator: async (_rule: unknown, value: string[]) => {
            if (!value || !value.length) return Promise.reject("请选择时间范围");
            const nowDate = dayjs().format("YYYY-MM-DD");
            const date1 = dayjs(`${nowDate}${value[1]}`);
            const diff = date1.diff(`${nowDate}${value[0]}`, "minute");
            if (diff < 30) return Promise.reject("时间段至少大于等于30分钟");
            return true;
          },
          trigger: "change",
        },
      ],
    };

    const options = [
      { label: "平时", value: "PV" },
      { label: "峰时", value: "FV" },
      { label: "谷时", value: "GV" },
    ];

    const removeItem = (item: PeriodDefinesState) => {
      const index = model.items.indexOf(item);
      if (index !== -1) model.items.splice(index, 1);
      emit("deleteItem", model.items);
    };

    const addItem = () => {
      model.items.push({ periodType: undefined, time: null });
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
            <FormItem label="费率" name={["items", index, "periodType"]} rules={rules.periodType as never}>
              <Select
                v-model:value={item.periodType}
                class="fee-w-180"
                placeholder={`请选择${props.placeholder[0]}`}
                options={options}
                allowClear
              />
            </FormItem>
            <FormItem name={["items", index, "time"]} rules={rules.time as never}>
              <TimeRangePicker v-model:value={item.time} class="fee-w-280" format="HH:mm:ss" value-format="HH:mm:ss" />
            </FormItem>
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
