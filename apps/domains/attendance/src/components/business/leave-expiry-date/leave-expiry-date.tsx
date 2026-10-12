import { InputNumber, Radio, RadioGroup, Select } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, ref } from "vue";

import type { Validity } from "@/api/staff-leave";

import "./leave-expiry-date.less";
interface Props {
  value?: Validity | string | null;
  readonly?: boolean;
}

/** 请假规则-有效期 */
export const LeaveExpiryDate = defineComponent({
  props: ["value", "readonly"],
  emits: ["update:value"],
  setup: (props: Props, { emit }) => {
    const dateConfigOptions = [
      { label: "日", value: "DAY" },
      { label: "月", value: "MONTH" },
      { label: "年", value: "YEAR" },
    ];
    const natureYear = ref<number | null>();
    const validityNumber = ref<number | null>();
    const validityUnit = ref("DAY");
    const radioSelect = ref<string>();

    const emitValue = (): void => {
      const res = {
        longTerm: radioSelect.value === "ALONG",
        natureYear: natureYear.value,
        validityNumber: validityNumber.value,
        validityUnit: validityUnit.value,
      };
      if (radioSelect.value === "ALONG") {
        res.natureYear = null;
        res.validityNumber = null;
        res.validityUnit = "DAY";
      }
      if (radioSelect.value === "CALENDAR_YEAR") {
        validityNumber.value = null;
        res.validityNumber = null;
        res.validityUnit = "DAY";
      }
      if (radioSelect.value === "FULL") {
        natureYear.value = null;
        res.natureYear = null;
      }

      emit("update:value", res);
    };
    const itemChange = (val: string): void => {
      radioSelect.value = val;
      emitValue();
    };
    const selectOption = (val: string): void => {
      if (props.readonly) {
        return;
      }
      if (radioSelect.value !== val) {
        itemChange(val);
      }
    };

    onMounted(() => {
      if (props.value && typeof props.value !== "string") {
        if (props.value.longTerm) {
          radioSelect.value = "ALONG";
        } else if (props.value.natureYear) {
          radioSelect.value = "CALENDAR_YEAR";
          natureYear.value = props.value.natureYear;
        } else {
          radioSelect.value = "FULL";
          validityNumber.value = props.value.validityNumber;
          validityUnit.value = props.value.validityUnit;
        }
      }
    });

    return (): VNode => (
      <RadioGroup disabled={props.readonly} onChange={emitValue} v-model:value={radioSelect.value}>
        <div
          class={["leave-expiry-date-option", radioSelect.value === "ALONG" && "leave-expiry-date-option-checked"]}
          onClick={() => selectOption("ALONG")}
        >
          <Radio class="leave-expiry-date-radio leave-expiry-date-radio-only" value="ALONG">
            长期有效
          </Radio>
        </div>
        <div
          class={["leave-expiry-date-option", radioSelect.value === "CALENDAR_YEAR" && "leave-expiry-date-option-checked"]}
          onClick={() => selectOption("CALENDAR_YEAR")}
        >
          <Radio class="leave-expiry-date-radio" value="CALENDAR_YEAR">
            发放日起
          </Radio>
          <div class="leave-expiry-date-input-number">
            <InputNumber
              disabled={props.readonly}
              min={1}
              v-model:value={natureYear.value}
              onChange={() => {
                itemChange("CALENDAR_YEAR");
              }}
            />
          </div>
          <span class="leave-expiry-date-description">个自然年有效</span>
        </div>
        <div
          class={["leave-expiry-date-option", radioSelect.value === "FULL" && "leave-expiry-date-option-checked"]}
          onClick={() => selectOption("FULL")}
        >
          <Radio class="leave-expiry-date-radio" value="FULL">
            发放日起
          </Radio>
          <div class="leave-expiry-date-input-number">
            <InputNumber
              disabled={props.readonly}
              min={1}
              v-model:value={validityNumber.value}
              onChange={() => {
                itemChange("FULL");
              }}
            />
          </div>
          <div class="leave-expiry-date-unit">
            <Select
              disabled={props.readonly}
              v-model:value={validityUnit.value}
              options={dateConfigOptions}
              getPopupContainer={(trigger: HTMLElement) => trigger.parentElement ?? document.body}
              onChange={() => {
                itemChange("FULL");
              }}
            />
          </div>
          <span class="leave-expiry-date-description">内有效</span>
        </div>
      </RadioGroup>
    );
  },
});
