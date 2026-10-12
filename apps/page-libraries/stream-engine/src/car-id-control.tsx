import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import { Select, message } from "@g2-platform/pc-ui";
import { defineComponent, onScopeDispose, ref, watch, type PropType } from "vue";

type VehicleLookupClient = Pick<StreamEngineClient, "getVehicleNumbers">;

export interface CarIdData {
  client: VehicleLookupClient;
  params: string;
  formValues: Record<string, unknown>;
  value: string | null;
  defaultValue: string;
  detail: boolean;
}

export function carIdSourceId(value: unknown): string {
  const selected = Array.isArray(value) ? value[0] : value;
  if (selected && typeof selected === "object") return String((selected as { id?: unknown }).id ?? "");
  return selected == null ? "" : String(selected);
}

/** 关联字段变化后查询车牌；只接受当前关联对象的响应。 */
export function useCarIdOptions(data: CarIdData, onValue: (value: string) => void, onError: (error: unknown) => void) {
  const options = ref<string[]>([]);
  const loading = ref(false);
  let requestVersion = 0;

  watch(
    () => carIdSourceId(data.formValues[data.params]),
    async (sourceId) => {
      const version = ++requestVersion;
      options.value = [];
      if (!sourceId) {
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        const plates = await data.client.getVehicleNumbers(sourceId);
        if (version !== requestVersion) return;
        options.value = plates;
        if (!data.detail && plates.length > 0) onValue(plates[0]!);
      } catch (error) {
        if (version === requestVersion) onError(error);
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    },
    { immediate: true },
  );

  if (!data.detail && data.defaultValue && !data.value) onValue(data.defaultValue);
  onScopeDispose(() => {
    requestVersion++;
  });
  return { options, loading };
}

export const CarIdControl = defineComponent({
  name: "StreamEngineCarIdControl",
  props: {
    value: { type: String as PropType<string | null>, default: null },
    client: { type: Object as PropType<VehicleLookupClient>, required: true },
    params: { type: String, required: true },
    formValues: { type: Object as PropType<Record<string, unknown>>, required: true },
    detail: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    defaultValue: { type: String, default: "" },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const { options, loading } = useCarIdOptions(
      props,
      (value) => emit("update:value", value),
      (error) => {
        message.error(error instanceof Error ? error.message : "车牌号加载失败");
      },
    );
    return () =>
      props.readonly ? (
        <span>{props.value || "--"}</span>
      ) : (
        <Select
          value={props.value ?? undefined}
          options={options.value.map((plate) => ({ value: plate, label: plate }))}
          loading={loading.value}
          placeholder="请选择车牌号"
          style={{ width: "100%" }}
          onUpdate:value={(value) => emit("update:value", String(value ?? ""))}
        />
      );
  },
});
