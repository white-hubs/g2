// @ts-nocheck
import { defineComponent, type PropType } from "vue";

import { Select } from "@/pc-ui-runtime";

/** 巡检标签 */
export const InspectTagSelect = defineComponent({
  name: "InspectTagSelect",
  props: {
    value: {
      type: String as PropType<string>,
      default: undefined,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:value", "change"],
  setup: (props, { emit }) => {
    const options = [
      { value: "CHARGE", label: "违规充电" },
      { value: "PARKING", label: "违规停放" },
    ];
    return (): JSX.Element => (
      <Select
        value={props.value}
        disabled={props.disabled}
        onUpdate:value={(value: string) => {
          emit("update:value", value);
        }}
        onChange={(value: unknown, option: unknown) => {
          emit("change", value, option);
        }}
        options={options}
        placeholder="请选择标签"
        allowClear
      />
    );
  },
});
