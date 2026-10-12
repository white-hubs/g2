import { Descriptions, DescriptionsItem, Input, Select, Spin, Textarea, message } from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType } from "vue";

import {
  RETROFIT_CONFIRM_OPTIONS,
  WORK_STATUS_OPTIONS,
  asBusinessChoice,
  normalizeBusinessChoices,
  resolveDeviceProperties,
  workStatusFromProgress,
  type BusinessChoice,
  type DeviceProperty,
  type OfficialRetrofitClient,
} from "./official-retrofit-model";

type SelectKind = "OfficialSealList" | "FocusWorkTypeList" | "FocusWorkList" | "FocusWorkStatusList";
type AutofillKind = "FocusWork" | "FocusWorkRequirement" | "FocusWorkCompleteTime";
type DeviceStatusKind = "DeviceStatus" | "DeviceChangeStatus";

const placeholders: Record<SelectKind, string> = {
  OfficialSealList: "请选择印章类别",
  FocusWorkTypeList: "请选择事项类型",
  FocusWorkList: "请选择事项",
  FocusWorkStatusList: "请选择督办事项状态",
};

export const OfficialSelectControl = defineComponent({
  name: "StreamEngineOfficialSelectControl",
  props: {
    kind: { type: String as PropType<SelectKind>, required: true },
    value: { type: Object as PropType<BusinessChoice | null>, default: null },
    client: { type: Object as PropType<OfficialRetrofitClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<BusinessChoice[]>([]);
    const loading = ref(false);
    let requestVersion = 0;
    watch(
      () => [props.kind, props.readonly] as const,
      async () => {
        const version = ++requestVersion;
        if (props.readonly) {
          loading.value = false;
          return;
        }
        loading.value = true;
        try {
          const result =
            props.kind === "OfficialSealList"
              ? await props.client.listOfficialSeals()
              : props.kind === "FocusWorkTypeList"
                ? await props.client.listFocusWorkTypes()
                : props.kind === "FocusWorkList"
                  ? await props.client.listFocusWork()
                  : await props.client.listFocusWorkStatuses();
          if (version === requestVersion) options.value = normalizeBusinessChoices(result);
        } catch (error) {
          if (version === requestVersion) message.error(error instanceof Error ? error.message : "选项加载失败");
        } finally {
          if (version === requestVersion) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () =>
      props.readonly ? (
        <span>{props.value?.name || "--"}</span>
      ) : (
        <Select
          value={props.value?.id}
          options={options.value.map((item) => ({ label: item.name, value: item.id }))}
          loading={loading.value}
          allowClear
          placeholder={placeholders[props.kind]}
          style={{ width: "100%" }}
          onUpdate:value={(next) => {
            if (next == null || next === "") {
              emit("update:value", null);
              return;
            }
            emit(
              "update:value",
              options.value.find((entry) => String(entry.id) === String(next)) ?? { id: String(next), name: String(next) },
            );
          }}
        />
      );
  },
});

const autofillPlaceholders: Record<AutofillKind, string> = {
  FocusWork: "自动带入督办事项",
  FocusWorkRequirement: "自动带入工作要求",
  FocusWorkCompleteTime: "自动带入完成时间",
};

export const OfficialAutofillControl = defineComponent({
  name: "StreamEngineOfficialAutofillControl",
  props: {
    kind: { type: String as PropType<AutofillKind>, required: true },
    value: { type: Object as PropType<BusinessChoice | null>, default: null },
    client: { type: Object as PropType<OfficialRetrofitClient>, required: true },
    sourceId: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    let requestVersion = 0;
    watch(
      () => [props.kind, props.sourceId, props.readonly] as const,
      async (_current, previous) => {
        const version = ++requestVersion;
        if (props.readonly || !props.sourceId) {
          if (!props.readonly && previous?.[1] && props.value) emit("update:value", null);
          loading.value = false;
          return;
        }
        if (previous?.[1] === undefined && props.value?.id) return;
        if (previous?.[1] && previous[1] !== props.sourceId && props.value) emit("update:value", null);
        loading.value = true;
        try {
          const result =
            props.kind === "FocusWork"
              ? await props.client.getFocusWork(props.sourceId)
              : props.kind === "FocusWorkRequirement"
                ? await props.client.getFocusWorkRequirement(props.sourceId)
                : await props.client.getFocusWorkCompleteTime(props.sourceId);
          if (version === requestVersion) emit("update:value", asBusinessChoice(result));
        } catch (error) {
          if (version === requestVersion) message.error(error instanceof Error ? error.message : "督办事项加载失败");
        } finally {
          if (version === requestVersion) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () =>
      props.kind === "FocusWorkCompleteTime" ? (
        <Input
          disabled
          value={props.value?.name ?? ""}
          placeholder={loading.value ? "正在读取完成时间" : autofillPlaceholders[props.kind]}
        />
      ) : (
        <Textarea
          disabled
          value={props.value?.name ?? ""}
          rows={4}
          placeholder={loading.value ? "正在读取督办事项" : autofillPlaceholders[props.kind]}
        />
      );
  },
});

export const WorkStatusControl = defineComponent({
  name: "StreamEngineWorkStatusControl",
  props: {
    value: { type: Object as PropType<BusinessChoice | null>, default: null },
    progress: { type: [Number, String] as PropType<number | string | null>, default: null },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value", "update:progress"],
  setup(props, { emit }) {
    watch(
      () => props.progress,
      (next) => {
        if (props.readonly) return;
        const status = workStatusFromProgress(next);
        if (status && status.id !== props.value?.id) emit("update:value", status);
      },
    );
    return () =>
      props.readonly ? (
        <span>{props.value?.name || "--"}</span>
      ) : (
        <Select
          value={props.value?.id}
          options={WORK_STATUS_OPTIONS.map((item) => ({ label: item.name, value: item.id }))}
          placeholder="请选择事项状态"
          style={{ width: "100%" }}
          onUpdate:value={(next) => {
            const status = WORK_STATUS_OPTIONS.find((item) => item.id === next) ?? null;
            emit("update:value", status);
            if (status) emit("update:progress", status.id === "FINISHED" ? 100 : 0);
          }}
        />
      );
  },
});

export const RetrofitConfirmControl = defineComponent({
  name: "StreamEngineRetrofitConfirmControl",
  props: {
    value: { type: Object as PropType<BusinessChoice | null>, default: null },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () =>
      props.readonly ? (
        <span>{RETROFIT_CONFIRM_OPTIONS.find((item) => item.id === props.value?.id)?.name || props.value?.name || "--"}</span>
      ) : (
        <Select
          value={props.value?.id}
          options={RETROFIT_CONFIRM_OPTIONS.map((item) => ({ label: item.name, value: item.id }))}
          placeholder="请选择"
          style={{ width: "100%" }}
          onUpdate:value={(next) => emit("update:value", RETROFIT_CONFIRM_OPTIONS.find((item) => item.id === next) ?? null)}
        />
      );
  },
});

export const DeviceSnapshotControl = defineComponent({
  name: "StreamEngineDeviceSnapshotControl",
  props: {
    kind: { type: String as PropType<DeviceStatusKind>, required: true },
    value: { type: Array as PropType<DeviceProperty[]>, default: () => [] },
    deviceId: { type: String, default: "" },
    client: { type: Object as PropType<OfficialRetrofitClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    let requestVersion = 0;
    watch(
      () => [props.deviceId, props.kind, props.readonly] as const,
      async (_current, previous) => {
        const version = ++requestVersion;
        if (props.readonly || !props.deviceId) {
          loading.value = false;
          return;
        }
        if (props.kind === "DeviceChangeStatus" && previous?.[0] === undefined && props.value.length) return;
        if (previous?.[0] && previous[0] !== props.deviceId) emit("update:value", []);
        loading.value = true;
        try {
          const detail = await props.client.getNorthDeviceDetail(props.deviceId);
          if (version === requestVersion) emit("update:value", resolveDeviceProperties(detail));
        } catch (error) {
          if (version === requestVersion) message.error(error instanceof Error ? error.message : "设备状态加载失败");
        } finally {
          if (version === requestVersion) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () => (
      <Spin spinning={loading.value}>
        <div style={{ minHeight: "32px" }}>
          {props.value.length ? (
            <Descriptions column={2} size="small">
              {props.value.map((item, index) => (
                <DescriptionsItem key={`${item.name}-${index}`} label={item.name}>
                  <span>
                    {item.value === "" || item.value == null ? "--" : String(item.value)}
                    {item.unitName ? ` ${item.unitName}` : ""}
                  </span>
                </DescriptionsItem>
              ))}
            </Descriptions>
          ) : !loading.value ? (
            <span>--</span>
          ) : null}
        </div>
      </Spin>
    );
  },
});

export function officialControlValue(value: unknown): BusinessChoice | null {
  return asBusinessChoice(value);
}
