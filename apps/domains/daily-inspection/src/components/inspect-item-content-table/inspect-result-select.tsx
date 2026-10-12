// @ts-nocheck
import { defineComponent, onMounted, ref } from "vue";

import type { InspectResultItem } from "./type";
import type { InspectBusinessTypeValue } from "@/compat/constants";
import { getDailyInspectionClient } from "@/domain-context";
import { Select } from "@/pc-ui-runtime";

interface Props {
  value?: string;
  mode?: string;
  width?: string;
  businessType?: InspectBusinessTypeValue | string;
  disabled?: boolean;
}

/** 巡检结果下拉框 */
export const InspectResultSelect = defineComponent({
  name: "InspectResultSelect",
  props: ["value", "width", "mode", "businessType", "disabled"],
  emits: ["update:value", "change"],
  setup: (props: Props, { emit }) => {
    const options = ref<Array<{ name?: string; id?: string }>>([]);
    const list = ref<InspectResultItem[]>([]);
    const getData = async (): Promise<void> => {
      const params = props.businessType !== undefined ? { businessType: props.businessType } : {};
      const res = await getDailyInspectionClient().listResultOptions(params);
      options.value = (res ?? []).map((e) => ({
        name: String(e.name ?? e.resultName ?? e.id ?? "--"),
        id: String(e.id ?? ""),
      }));
      list.value = (res ?? []).map((e) => ({
        ...e,
        id: e.id ? String(e.id) : undefined,
        name: e.name ? String(e.name) : e.resultName ? String(e.resultName) : undefined,
        options: Array.isArray(e.options)
          ? e.options.map((opt: Record<string, unknown>) => ({
              itemName: String(opt.itemName ?? ""),
              itemValue: String(opt.itemValue ?? ""),
              errorFlag: Boolean(opt.errorFlag),
            }))
          : [],
      }));
      const selectValue = list.value.find((e) => e.id === props.value);
      emit("change", props.value, selectValue);
    };
    onMounted(() => {
      void getData();
    });
    return (): JSX.Element => (
      <Select
        value={props.value}
        options={options.value}
        placeholder="请选择巡检结果"
        style={{ width: props.width ?? "180px" }}
        fieldNames={{ label: "name", value: "id" }}
        onUpdate:value={(value: string) => {
          emit("update:value", value);
        }}
        onChange={(value: unknown) => {
          emit(
            "change",
            value,
            list.value.find((e) => e.id === value),
          );
        }}
        mode={props.mode || undefined}
        disabled={props.disabled}
        allowClear
      />
    );
  },
});
