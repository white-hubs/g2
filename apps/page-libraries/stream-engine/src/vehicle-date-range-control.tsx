import type { StreamEngineClient, StreamEngineVehiclePeriod } from "@g2-client/stream-engine/client";
import { RangePicker, Spin, message } from "@g2-platform/pc-ui";
import { type PropType, defineComponent, onScopeDispose, ref, watch } from "vue";

import { formatCurrentDateTime, formatDateRangeLength } from "./form-date";

import styles from "./form-controls.module.css";

type VehiclePeriodClient = Pick<StreamEngineClient, "getVehicleNumberTime">;
export type VehicleDateRangeValue = [string | null, string | null];

export interface VehicleDateRangeData {
  client: VehiclePeriodClient;
  params: string;
  formValues: Record<string, unknown>;
  rootFormValues?: Record<string, unknown>;
  rowChain?: Record<string, unknown>[];
  format: string;
  readonly: boolean;
}

export function vehicleDateRangePlate(data: Pick<VehicleDateRangeData, "params" | "formValues" | "rootFormValues" | "rowChain">): string {
  if (!data.params) {
    return "";
  }
  const path = data.params.split(">");
  const field = path.at(-1)!;
  for (let index = (data.rowChain?.length ?? 0) - 1; index >= 0; index--) {
    const row = data.rowChain![index]!;
    if (Object.hasOwn(row, field)) {
      return typeof row[field] === "string" ? row[field] : "";
    }
  }
  if (path.length === 1) {
    const value = Object.hasOwn(data.formValues, field) ? data.formValues[field] : data.rootFormValues?.[field];
    return typeof value === "string" ? value : "";
  }
  // 旧表单保存 parentId>childId；分组外关联沿用最后一行，分组内优先当前行。
  let value: unknown = data.rootFormValues ?? data.formValues;
  for (const key of path) {
    if (Array.isArray(value)) {
      value = value.at(-1);
    }
    if (!value || typeof value !== "object") {
      return "";
    }
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === "string" ? value : "";
}

export function vehicleDateRangeValue(period: StreamEngineVehiclePeriod | null, format: string): VehicleDateRangeValue {
  if (!period?.begin || !period.end) {
    return [null, null];
  }
  const begin = new Date(period.begin);
  const end = new Date(period.end);
  if (!Number.isFinite(begin.getTime()) || !Number.isFinite(end.getTime())) {
    return [null, null];
  }
  return [formatCurrentDateTime(format, begin), formatCurrentDateTime(format, end)];
}

export function useVehicleDateRange(
  data: VehicleDateRangeData,
  onValue: (value: VehicleDateRangeValue) => void,
  onError: (error: unknown) => void,
) {
  const loading = ref(false);
  let requestVersion = 0;
  watch(
    [() => vehicleDateRangePlate(data), () => data.format, () => data.readonly] as const,
    async ([plate, format, readonly]) => {
      const version = ++requestVersion;
      if (readonly || !plate) {
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        const period = await data.client.getVehicleNumberTime(plate);
        if (version === requestVersion) {
          onValue(vehicleDateRangeValue(period, format));
        }
      } catch (error) {
        if (version === requestVersion) {
          onError(error);
        }
      } finally {
        if (version === requestVersion) {
          loading.value = false;
        }
      }
    },
    { immediate: true },
  );
  onScopeDispose(() => {
    requestVersion++;
  });
  return { loading };
}

export const VehicleDateRangeControl = defineComponent({
  name: "StreamEngineVehicleDateRangeControl",
  props: {
    value: { type: Array as PropType<(string | null)[] | null>, default: null },
    client: { type: Object as PropType<VehiclePeriodClient>, required: true },
    params: { type: String, default: "" },
    formValues: { type: Object as PropType<Record<string, unknown>>, required: true },
    rootFormValues: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    rowChain: { type: Array as PropType<Record<string, unknown>[]>, default: undefined },
    format: { type: String, default: "yyyy-MM-dd HH:mm:ss" },
    placeholder: { type: Array as PropType<string[]>, default: () => ["开始时间", "结束时间"] },
    showLength: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const { loading } = useVehicleDateRange(
      props,
      (value) => emit("update:value", value),
      (error) => {
        message.error(error instanceof Error ? error.message : "车辆有效期加载失败");
      },
    );
    return () => {
      const range = props.value?.length === 2 && props.value.every(Boolean) ? props.value : undefined;
      const format = props.format.replace("yyyy", "YYYY").replace("dd", "DD");
      return (
        <div>
          {props.readonly ? (
            <span>{range?.join(" - ") || "--"}</span>
          ) : (
            <Spin spinning={loading.value}>
              <RangePicker
                value={range as never}
                valueFormat={format}
                format={format}
                showTime={format.includes("HH")}
                picker={format === "YYYY" ? "year" : format === "YYYY-MM" ? "month" : undefined}
                placeholder={[props.placeholder[0] ?? "开始时间", props.placeholder[1] ?? "结束时间"]}
                style={{ width: "100%" }}
                onUpdate:value={(value) => emit("update:value", value)}
              />
            </Spin>
          )}
          {props.showLength ? <div class={styles.rangeDuration}>时长：{formatDateRangeLength(range)}</div> : null}
        </div>
      );
    };
  },
});
