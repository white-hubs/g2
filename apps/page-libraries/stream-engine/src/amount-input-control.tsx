import { InputNumber } from "@g2-platform/pc-ui";
import { type PropType, defineComponent } from "vue";

import { toChineseCurrency } from "./currency";

import styles from "./form-controls.module.css";

export const LEGACY_AMOUNT_MAX = Number("99999999999999.99");

export function formatLegacyAmount(value: number | string | undefined, precision: number): string {
  const amount = value ? Number.parseFloat(String(value)) : 0;
  if (!Number.isFinite(amount)) {
    return String(value ?? "");
  }
  return amount.toFixed(precision).replace(/(\d)(?=(\d{3})+\.)/gu, "$1,");
}

export function parseLegacyAmount(value: string | undefined): string {
  return (value ?? "").replace(/￥\s?|,/gu, "").replace(/^(-)*(\d+)\.(\d\d).*$/u, "$1$2.$3");
}

export const AmountInputControl = defineComponent({
  name: "StreamEngineAmountInputControl",
  props: {
    value: { type: [Number, String] as PropType<number | string | null>, default: null },
    precision: { type: Number, default: 0 },
    minNum: { type: Number, default: undefined },
    maxlength: { type: Number, default: 100000 },
    placeholder: { type: String, default: "请输入金额" },
    showChinese: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () => (
      <div class={styles.amountControl}>
        <InputNumber
          value={props.value === null || props.value === "" ? undefined : Number(props.value)}
          min={props.minNum}
          max={LEGACY_AMOUNT_MAX}
          precision={props.precision}
          {...{ maxlength: props.maxlength }}
          controls={false}
          disabled={props.readonly}
          placeholder={props.placeholder}
          style={{ width: "100%" }}
          formatter={(value, { userTyping, input }) => (userTyping ? input : formatLegacyAmount(value, props.precision))}
          parser={parseLegacyAmount}
          onUpdate:value={(value) => emit("update:value", value === null || value === undefined ? null : Number(value))}
        />
        {props.showChinese && props.value !== null && props.value !== "" ? (
          <div class={styles.amountUppercase}>大写：{toChineseCurrency(props.value)}</div>
        ) : null}
      </div>
    );
  },
});
