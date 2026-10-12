import { Select } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, ref, watch } from "vue";

import style from "./leave-limit-select.module.less";
interface Props {
  readonly: boolean;
  value: number | undefined;
}

/** 请假限制组件 */
export const LeaveLimitSelect = defineComponent({
  props: ["readonly", "value"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const selectOptions = [
      {
        value: 0,
        label: "0个月",
      },
      // {
      //   value: 0.5,
      //   label: "0.5个月",
      // },
      {
        value: 1,
        label: "1个月",
      },
      {
        value: 2,
        label: "2个月",
      },
      {
        value: 3,
        label: "3个月",
      },
      {
        value: 4,
        label: "4个月",
      },
      {
        value: 5,
        label: "5个月",
      },
      {
        value: 6,
        label: "6个月",
      },
      {
        value: 7,
        label: "7个月",
      },
      {
        value: 8,
        label: "8个月",
      },
      {
        value: 9,
        label: "9个月",
      },
      {
        value: 10,
        label: "10个月",
      },
      {
        value: 11,
        label: "11个月",
      },
      {
        value: 12,
        label: "12个月",
      },
    ];
    const value = ref(props.value);
    watch(
      () => props.value,
      () => {
        value.value = props.value;
      },
    );

    return (): VNode => (
      <div class={style["leave-limit-select"]}>
        <span>入职时长小于</span>
        <Select
          options={selectOptions}
          style="width:100px;margin:0 10px"
          v-model:value={value.value}
          onChange={() => {
            emit("update:value", value.value);
          }}
          disabled={props.readonly}
        />
        <span>个月时，不能申请此假</span>
      </div>
    );
  },
});
