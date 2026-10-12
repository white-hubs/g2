import { Cascader, DatePicker, Radio, RadioGroup } from "@g2-platform/pc-ui";
import { defineComponent, type PropType } from "vue";

export type CascaderFieldNames = { label: string; value: string; children: string };
export type CascaderPath = Array<string | number>;
export type ServicePeriodValue = { radioValue: string; date: string };

const defaultFieldNames: CascaderFieldNames = { label: "label", value: "value", children: "children" };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function cascaderPathLabels(options: unknown[], path: CascaderPath, fields: CascaderFieldNames = defaultFieldNames): string[] {
  const labels: string[] = [];
  let level = options;
  for (const segment of path) {
    const node = level.find((option) => String(asRecord(option)[fields.value] ?? "") === String(segment));
    const record = asRecord(node);
    labels.push(String(record[fields.label] ?? segment));
    level = Array.isArray(record[fields.children]) ? (record[fields.children] as unknown[]) : [];
  }
  return labels;
}

export const CascaderInputControl = defineComponent({
  name: "StreamEngineCascaderInputControl",
  props: {
    value: { type: Array as PropType<CascaderPath | null>, default: null },
    options: { type: Array as PropType<unknown[]>, default: () => [] },
    fieldNames: { type: Object as PropType<CascaderFieldNames>, default: () => ({ ...defaultFieldNames }) },
    placeholder: { type: String, default: "请选择" },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () =>
      props.readonly ? (
        <span>{props.value?.length ? cascaderPathLabels(props.options, props.value, props.fieldNames).join(" / ") : "--"}</span>
      ) : (
        <Cascader
          value={props.value ?? []}
          options={props.options as never[]}
          fieldNames={props.fieldNames}
          placeholder={props.placeholder}
          style={{ width: "100%" }}
          onUpdate:value={(path) => emit("update:value", Array.isArray(path) ? path : [])}
        />
      );
  },
});

export function servicePeriodValue(value: unknown): ServicePeriodValue {
  const record = asRecord(value);
  return {
    radioValue: String(record.radioValue ?? "limited"),
    date: String(record.date ?? ""),
  };
}

/** 旧 ServicePeriod.validator：驻场人员必须选有期限，并指定期限日期。 */
export function validateServicePeriod(value: unknown, relatedValue: unknown): string | undefined {
  if (relatedValue !== "ZCRY") return undefined;
  const period = servicePeriodValue(value);
  if (period.radioValue !== "limited") return "驻场人员必须选择有期限";
  if (!period.date) return "请选择期限时间";
  return undefined;
}

export const ServicePeriodControl = defineComponent({
  name: "StreamEngineServicePeriodControl",
  props: {
    value: { type: Object as PropType<ServicePeriodValue | null>, default: null },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const update = (patch: Partial<ServicePeriodValue>): void => {
      emit("update:value", { ...servicePeriodValue(props.value), ...patch });
    };
    return () => {
      const period = servicePeriodValue(props.value);
      if (props.readonly) {
        return (
          <span>
            {period.radioValue === "limited"
              ? `有期限${period.date ? `：${period.date}` : ""}`
              : period.radioValue === "unlimited"
                ? "无期限"
                : "--"}
          </span>
        );
      }
      return (
        <RadioGroup value={period.radioValue} onUpdate:value={(value) => update({ radioValue: String(value) })}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <Radio value="limited">有期限</Radio>
            {period.radioValue === "limited" ? (
              <DatePicker
                value={period.date || undefined}
                valueFormat="YYYY-MM-DD"
                format="YYYY-MM-DD"
                allowClear
                onUpdate:value={(value) => update({ date: String(value ?? "") })}
              />
            ) : null}
          </div>
          <Radio value="unlimited">无期限</Radio>
        </RadioGroup>
      );
    };
  },
});
