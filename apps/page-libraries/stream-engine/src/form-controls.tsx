import type { StreamEngineClient } from "@g2-client/stream-engine/client";
import type { FileClient } from "@g2-contract/file";
import type { DepartmentNode, OuaaClient } from "@g2-contract/ouaa";
import {
  Button,
  Cascader,
  DatePicker,
  DeleteOutlined,
  DownloadOutlined,
  Form,
  Input,
  InputNumber,
  LinkOutlined,
  Modal,
  Rate,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tabs,
  TabPane,
  Textarea,
  TimePicker,
  Tooltip,
  TreeSelect,
  Upload,
  message,
  usePcForm,
  type PcFormSchemaProp,
  type UploadRequestOption,
} from "@g2-platform/pc-ui";
import { defineComponent, inject, markRaw, onBeforeUnmount, onMounted, ref, watch, watchEffect, type PropType } from "vue";
import { routerKey } from "vue-router";

import { alarmRecordDetailPath, alarmRecordPeriod, alarmRecordTime } from "./alarm-records";
import { AmountInputControl } from "./amount-input-control";
import { archiveFieldValue, useArchiveField } from "./archive-field";
import {
  AssetChoiceControl,
  AssetExpiredControl,
  AssetTableControl,
  ConsumablesOutReadonlyControl,
  assetControlValue,
} from "./asset-controls";
import { consumablesOutRowIssue, setPendingAssetRows } from "./asset-model";
import { renderAttendanceHrControl } from "./attendance-hr-controls";
import { CarIdControl } from "./car-id-control";
import { PERSONNEL_CONTROLS } from "./components/control-catalog";
import { openLegacyFilePreview } from "./file-preview";
import { fileSceneForBusiness } from "./file-scene";
import { normalizeSelectOptions } from "./form-options";
import {
  asIdName,
  asIdNameList,
  fieldKey,
  initialFormValue,
  parseFormData,
  syncAttachmentCounts,
  type FormSchemaItem,
} from "./form-schema";
import { matchesLegacyFormRelation } from "./form-validation";
import {
  DeviceSnapshotControl,
  OfficialAutofillControl,
  OfficialSelectControl,
  RetrofitConfirmControl,
  WorkStatusControl,
  officialControlValue,
} from "./official-retrofit-controls";
import { selectedDeviceId } from "./official-retrofit-model";
import { renderPermitParkingControl } from "./permit-parking-controls";
import {
  TARGET_OBJECT_KINDS,
  targetObjectDisplay,
  targetObjectName,
  targetObjectOptions,
  targetObjectQuery,
  targetObjectValue,
  type TargetObjectKind,
  type TargetObjectOption,
} from "./target-object-model";
import { VehicleDateRangeControl, type VehicleDateRangeValue } from "./vehicle-date-range-control";

import styles from "./form-controls.module.css";

type NamedOption = { id: string; name: string };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function hasApplication(value: unknown, code: string): boolean {
  if (Array.isArray(value)) return value.some((entry) => hasApplication(entry, code));
  if (!value || typeof value !== "object") return false;
  const record = asRecord(value);
  return record.code === code || hasApplication(record.applicationPageVOS, code) || hasApplication(record.data, code);
}

function fileKind(name: string): "image" | "video" | "audio" | "document" | "other" {
  const extension = name.toLowerCase().split(".").pop() ?? "";
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(extension)) return "image";
  if (["mp4", "avi", "wmv", "flv", "mkv"].includes(extension)) return "video";
  if (["mp3", "wav", "m4a"].includes(extension)) return "audio";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "pdf"].includes(extension)) return "document";
  return "other";
}

function fileUrl(file: Record<string, unknown>): string {
  const path = String(file.url ?? file.path ?? "");
  return path ? new URL(path, location.origin).href : "";
}

const ArchiveFieldControl = defineComponent({
  name: "StreamEngineArchiveFieldControl",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    sourceId: { type: String, default: "" },
    attr: { type: String, required: true },
    sponsor: { type: Boolean, default: false },
    placeholder: { type: String, default: "自动填充" },
    detail: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const { loading } = useArchiveField(
      props,
      (value) => emit("update:value", value),
      (error) => {
        message.error(error instanceof Error ? error.message : "人员档案加载失败");
      },
    );
    return () =>
      props.readonly ? (
        <span>{props.value?.name || "--"}</span>
      ) : (
        <Spin spinning={loading.value}>
          <Input disabled value={props.value?.name ?? ""} placeholder={props.placeholder} />
        </Spin>
      );
  },
});

function staffSourceId(value: unknown): string {
  const selected = Array.isArray(value) ? value[0] : value;
  if (selected && typeof selected === "object") return String((selected as { id?: unknown }).id ?? "");
  return selected == null ? "" : String(selected);
}

function unwrapRows(value: unknown): NamedOption[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? ((value as { records?: unknown[]; list?: unknown[] }).records ?? (value as { list?: unknown[] }).list ?? [])
      : [];
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }
      const record = item as Record<string, unknown>;
      const id = record.id ?? record.value ?? record.key;
      if (id == null) {
        return undefined;
      }
      return { id: String(id), name: String(record.name ?? record.label ?? record.title ?? id) };
    })
    .filter((item): item is NamedOption => Boolean(item));
}

type UserRow = NamedOption & { organizations: string; mobile: string; workStatus: string };

function unwrapUsers(value: unknown): UserRow[] {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const rows = data.records ?? data.list ?? data.rows ?? data.data ?? (Array.isArray(value) ? value : []);
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((item) => {
      if (!item || typeof item !== "object") {
        return undefined;
      }
      const record = item as Record<string, unknown>;
      const id = record.id ?? record.userId;
      if (id == null) {
        return undefined;
      }
      const organizations = Array.isArray(record.organizations) ? (record.organizations as Record<string, unknown>[]) : [];
      return {
        id: String(id),
        name: String(record.name ?? record.userName ?? record.username ?? id),
        organizations: organizations
          .map((entry) => String(entry.name ?? ""))
          .filter(Boolean)
          .join("/"),
        mobile: String(record.mobile ?? record.phone ?? ""),
        workStatus: String(record.workStatus ?? ""),
      };
    })
    .filter((item): item is UserRow => Boolean(item));
}

function areaPathValue(value: unknown): Array<string | number> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const id = (value as { id?: unknown }).id;
  return Array.isArray(id) ? (id as Array<string | number>) : undefined;
}

const IdNameSelect = defineComponent({
  name: "StreamEngineIdNameSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    options: { type: Array as PropType<NamedOption[]>, default: () => [] },
    placeholder: { type: String, default: "请选择" },
    loading: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () => {
      if (props.readonly) {
        return <span>{props.value?.name || "--"}</span>;
      }
      return (
        <Select
          value={props.value?.id}
          placeholder={props.placeholder}
          loading={props.loading}
          allowClear
          style={{ width: "100%" }}
          options={props.options.map((item) => ({ label: item.name, value: item.id }))}
          onUpdate:value={(next) => {
            if (next == null || next === "") {
              emit("update:value", null);
              return;
            }
            const matched = props.options.find((item) => item.id === String(next));
            emit("update:value", matched ?? { id: String(next), name: String(next) });
          }}
        />
      );
    };
  },
});

const AsyncIdNameSelect = defineComponent({
  name: "StreamEngineAsyncIdNameSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    loadOptions: { type: Function as PropType<() => Promise<unknown[]>>, required: true },
    dependencyKey: { type: String, default: "" },
    placeholder: { type: String, default: "请选择" },
    readonly: { type: Boolean, default: false },
    mapOption: { type: Function as PropType<(row: Record<string, unknown>) => NamedOption>, default: undefined },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<NamedOption[]>([]);
    const loading = ref(false);
    let requestVersion = 0;
    watch(
      () => [props.dependencyKey, props.readonly] as const,
      async () => {
        if (props.readonly) {
          requestVersion++;
          loading.value = false;
          return;
        }
        const version = ++requestVersion;
        loading.value = true;
        try {
          const rows = await props.loadOptions();
          if (version !== requestVersion) return;
          options.value = props.mapOption
            ? rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object").map(props.mapOption)
            : unwrapRows(rows);
        } catch (error) {
          if (version === requestVersion) message.error(error instanceof Error ? error.message : "选项加载失败");
        } finally {
          if (version === requestVersion) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () => (
      <IdNameSelect
        value={props.value}
        options={options.value}
        loading={loading.value}
        placeholder={props.placeholder}
        readonly={props.readonly}
        onUpdate:value={(next: NamedOption | null) => emit("update:value", next)}
      />
    );
  },
});

const ProblemTypeSelect = defineComponent({
  name: "StreamEngineProblemTypeSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    const options = ref<NamedOption[]>([]);
    onMounted(async () => {
      loading.value = true;
      try {
        options.value = unwrapRows(await props.client.listHiddenDangerTypes());
      } catch (error) {
        message.error(error instanceof Error ? error.message : "隐患类型加载失败");
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <IdNameSelect
        value={props.value}
        options={options.value}
        loading={loading.value}
        readonly={props.readonly}
        placeholder="请选择隐患类型"
        onUpdate:value={(value) => emit("update:value", value)}
      />
    );
  },
});

const FaultTypeSelect = defineComponent({
  name: "StreamEngineFaultTypeSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    businessType: { type: String, default: "FAULT" },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    const options = ref<NamedOption[]>([]);
    onMounted(async () => {
      loading.value = true;
      try {
        options.value = unwrapRows(await props.client.listFaultTypes(props.businessType || "FAULT"));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "故障类型加载失败");
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <IdNameSelect
        value={props.value}
        options={options.value}
        loading={loading.value}
        readonly={props.readonly}
        placeholder="请选择故障类型"
        onUpdate:value={(value) => emit("update:value", value)}
      />
    );
  },
});

const WorkReportTypeSelect = defineComponent({
  name: "StreamEngineWorkReportTypeSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    const options = ref<NamedOption[]>([]);
    onMounted(async () => {
      if (props.readonly) return;
      loading.value = true;
      try {
        const page = await props.client.pageWorkReportTypes();
        options.value = unwrapRows(page.records.filter((entry) => Boolean(entry.status)));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "汇报类型加载失败");
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <IdNameSelect
        value={props.value}
        options={options.value}
        loading={loading.value}
        readonly={props.readonly}
        placeholder="请选择汇报类型"
        onUpdate:value={(value) => emit("update:value", value)}
      />
    );
  },
});

const ProblemLevelSelect = defineComponent({
  name: "StreamEngineProblemLevelSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    const options = ref<NamedOption[]>([]);
    onMounted(async () => {
      loading.value = true;
      try {
        options.value = unwrapRows(await props.client.listHiddenDangerLevels());
      } catch (error) {
        message.error(error instanceof Error ? error.message : "隐患级别加载失败");
      } finally {
        loading.value = false;
      }
    });
    return () => (
      <IdNameSelect
        value={props.value}
        options={options.value}
        loading={loading.value}
        readonly={props.readonly}
        placeholder="请选择隐患程度"
        onUpdate:value={(value) => emit("update:value", value)}
      />
    );
  },
});

const StaticIdNameSelect = defineComponent({
  name: "StreamEngineStaticIdNameSelect",
  props: {
    value: { type: Object as PropType<NamedOption | null>, default: null },
    options: { type: Array as PropType<Array<{ label: string; value: string }>>, required: true },
    placeholder: { type: String, default: "请选择" },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () => {
      if (props.readonly) {
        const label = props.options.find((item) => item.value === props.value?.id)?.label;
        return <span>{label || props.value?.name || "--"}</span>;
      }
      return (
        <Select
          value={props.value?.id}
          placeholder={props.placeholder}
          allowClear
          style={{ width: "100%" }}
          options={props.options}
          onUpdate:value={(next) => {
            if (next == null || next === "") {
              emit("update:value", null);
              return;
            }
            const matched = props.options.find((item) => item.value === String(next));
            emit("update:value", matched ? { id: matched.value, name: matched.label } : null);
          }}
        />
      );
    };
  },
});

const AreaListSelect = defineComponent({
  name: "StreamEngineAreaListSelect",
  props: {
    value: { type: Object as PropType<{ id?: Array<string | number>; name?: string } | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    api: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<unknown[]>([]);
    const loading = ref(false);
    let version = 0;
    watch(
      () => props.api,
      async (api) => {
        const current = ++version;
        loading.value = true;
        try {
          const next = await props.client.listAreas(undefined, api);
          if (current === version) options.value = next;
        } catch (error) {
          if (current === version) message.error(error instanceof Error ? error.message : "区域加载失败");
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () => {
      if (props.readonly) {
        return <span>{props.value?.name || "--"}</span>;
      }
      return (
        <Cascader
          value={areaPathValue(props.value)}
          options={options.value as never[]}
          loading={loading.value}
          changeOnSelect
          placeholder="请选择区域"
          style={{ width: "100%" }}
          fieldNames={{ label: "name", value: "id", children: "children" }}
          onUpdate:value={(path) => {
            if (!Array.isArray(path) || path.length === 0) {
              emit("update:value", null);
              return;
            }
            const names: string[] = [];
            let nodes = options.value as Array<Record<string, unknown>>;
            for (const id of path) {
              const matched = nodes.find((item) => String(item.id) === String(id));
              if (!matched) {
                break;
              }
              names.push(String(matched.name ?? id));
              nodes = Array.isArray(matched.children) ? (matched.children as Array<Record<string, unknown>>) : [];
            }
            emit("update:value", { id: path, name: names.join("/") });
          }}
        />
      );
    };
  },
});

const FileUploadControl = defineComponent({
  name: "StreamEngineFileUploadControl",
  props: {
    value: { type: Array as PropType<unknown[]>, default: () => [] },
    getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
    placeholder: { type: String, default: "请选择附件" },
    readonly: { type: Boolean, default: false },
    businessType: { type: String, default: "HIDDENDANGER" },
    maxSize: { type: Number, default: 100 },
    accept: { type: String, default: undefined },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const activeUploads = ref(0);
    const downloading = ref("");
    const preview = ref<Record<string, unknown> | null>(null);
    const currentFiles = ref<unknown[]>([]);
    watch(
      () => props.value,
      (value) => {
        currentFiles.value = Array.isArray(value) ? value : [];
      },
      { immediate: true },
    );
    const files = () => currentFiles.value;

    const customRequest = async (option: UploadRequestOption): Promise<void> => {
      if (!props.getFileClient) {
        message.error("文件服务未就绪");
        option.onError?.(new Error("文件服务未就绪"));
        return;
      }
      activeUploads.value++;
      try {
        const client = await props.getFileClient();
        const file = option.file as File;
        if (props.maxSize > 0 && file.size > props.maxSize * 1024 * 1024) {
          const error = new Error(`单个附件不能超过${props.maxSize}MB`);
          message.warning(error.message);
          option.onError?.(error);
          return;
        }
        const sceneCode = fileSceneForBusiness(props.businessType);
        const config = (window as Window & { config?: { feature?: { useUploadTemporary?: boolean } } }).config;
        const uploaded = await client.uploadSceneFile({
          file,
          businessKey: "maintain",
          sceneCode,
          useTemporary: Boolean(config?.feature?.useUploadTemporary),
        });
        try {
          await client.persistSceneFiles(sceneCode, [uploaded.id]);
        } catch (persistError) {
          message.warning(persistError instanceof Error ? persistError.message : "附件持久化失败");
        }
        const next = [...files(), uploaded];
        currentFiles.value = next;
        emit("update:value", next);
        option.onSuccess?.(uploaded);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "上传失败");
        option.onError?.(error as Error);
      } finally {
        activeUploads.value--;
      }
    };

    const showPreview = (file: Record<string, unknown>): void => {
      const url = fileUrl(file);
      if (!url) {
        message.warning("附件地址不可用");
        return;
      }
      const name = String(file.name ?? "附件");
      if (fileKind(name) === "document") {
        openLegacyFilePreview({ name, path: url });
      } else if (fileKind(name) === "other") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        preview.value = file;
      }
    };

    const download = async (file: Record<string, unknown>): Promise<void> => {
      const url = fileUrl(file);
      if (!url) {
        message.warning("附件地址不可用");
        return;
      }
      const id = String(file.id ?? file.uid ?? url);
      if (downloading.value) return;
      downloading.value = id;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("下载失败");
        const objectUrl = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = String(file.name ?? "附件");
        link.click();
        URL.revokeObjectURL(objectUrl);
      } catch (downloadError) {
        message.error(downloadError instanceof Error ? downloadError.message : "下载失败");
      } finally {
        downloading.value = "";
      }
    };

    const fileItem = (item: unknown, index: number, readonly: boolean) => {
      const record = asRecord(item);
      const name = String(record.name ?? record.id ?? `附件${index + 1}`);
      const url = fileUrl(record);
      return (
        <div key={String(record.id ?? index)} class={styles.fileItem}>
          {fileKind(name) === "image" && url ? (
            <img src={url} alt={name} class={styles.fileThumbnail} />
          ) : (
            <span class={styles.fileFallback}>{name.split(".").pop()?.toUpperCase() || "文件"}</span>
          )}
          <span class={styles.fileName} title={name}>
            {name}
          </span>
          <div class={styles.fileActions}>
            <Tooltip title="预览">
              <Button type="text" aria-label={`预览${name}`} icon={<LinkOutlined />} onClick={() => showPreview(record)} />
            </Tooltip>
            <Tooltip title="下载">
              <Button
                type="text"
                aria-label={`下载${name}`}
                icon={<DownloadOutlined />}
                loading={downloading.value === String(record.id ?? record.uid ?? url)}
                onClick={() => void download(record)}
              />
            </Tooltip>
            {!readonly ? (
              <Tooltip title="删除">
                <Button
                  type="text"
                  danger
                  aria-label={`删除${name}`}
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    const next = files().filter((_, i) => i !== index);
                    currentFiles.value = next;
                    emit("update:value", next);
                  }}
                />
              </Tooltip>
            ) : null}
          </div>
        </div>
      );
    };

    return () => {
      return (
        <div>
          {!props.readonly ? (
            <>
              <Upload
                customRequest={customRequest}
                showUploadList={false}
                multiple
                accept={props.accept}
                disabled={!props.getFileClient || activeUploads.value > 0 || files().length >= 5}
                beforeUpload={(_file, batch) => {
                  if (batch.length > 5 - files().length) {
                    message.error("最多上传5个文件");
                    return false;
                  }
                  return true;
                }}
              >
                <Button type="primary" shape="round" loading={activeUploads.value > 0} disabled={files().length >= 5}>
                  选择附件
                </Button>
              </Upload>
              <span class={styles.fileHint}>
                {props.placeholder}|单个附件最大支持{props.maxSize}MB
              </span>
            </>
          ) : null}
          {files().length ? (
            <div class={styles.fileList}>{files().map((item, index) => fileItem(item, index, props.readonly))}</div>
          ) : props.readonly ? (
            <span>暂无附件</span>
          ) : null}
          <Modal
            open={Boolean(preview.value)}
            title={`文件预览--${String(preview.value?.name ?? "")}`}
            footer={null}
            onCancel={() => {
              preview.value = null;
            }}
          >
            {preview.value && fileKind(String(preview.value.name ?? "")) === "image" ? (
              <img class={styles.previewMedia} src={fileUrl(preview.value)} alt={String(preview.value.name ?? "附件")} />
            ) : null}
            {preview.value && fileKind(String(preview.value.name ?? "")) === "video" ? (
              <video class={styles.previewMedia} src={fileUrl(preview.value)} controls />
            ) : null}
            {preview.value && fileKind(String(preview.value.name ?? "")) === "audio" ? (
              <audio class={styles.previewMedia} src={fileUrl(preview.value)} controls />
            ) : null}
          </Modal>
        </div>
      );
    };
  },
});

export const UserPickerControl = defineComponent({
  name: "StreamEngineUserPickerControl",
  props: {
    value: { type: Array as PropType<NamedOption[]>, default: () => [] },
    client: { type: Object as PropType<StreamEngineClient>, default: undefined },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaClient>>, default: undefined },
    placeholder: { type: String, default: "请选择人员" },
    multiple: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    departmentId: { type: String, default: "" },
    requiresDepartment: { type: Boolean, default: false },
    selectRange: { type: Object as PropType<{ type: string; ids: string[] } | null>, default: null },
    disabledIds: { type: Array as PropType<string[]>, default: () => [] },
    autoOpen: { type: Boolean, default: false },
    onClose: { type: Function as PropType<() => void>, default: undefined },
    showWorkStatus: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    const rows = ref<UserRow[]>([]);
    const departments = ref<DepartmentNode[]>([]);
    const open = ref(false);
    const selected = ref<NamedOption[]>([]);
    const departmentId = ref<string | undefined>();
    const workStatus = ref<string | undefined>();
    const keyword = ref("");
    const page = ref(1);
    const total = ref(0);
    const statusAvailable = ref(false);
    const defaultDepartmentId = ref<string | undefined>();
    let requestVersion = 0;
    let applicationsLoaded = false;

    const load = async (): Promise<void> => {
      if (!open.value) return;
      const version = ++requestVersion;
      loading.value = true;
      try {
        const params = {
          pageNumber: page.value,
          pageSize: 10,
          keyword: keyword.value,
          organizationId: departmentId.value,
          workStatus: statusAvailable.value || props.showWorkStatus ? workStatus.value : undefined,
          enabled: true,
        };
        const ouaa = props.getOuaaClient ? await props.getOuaaClient() : undefined;
        const result =
          props.selectRange?.type === "ASSIGN_USER" && ouaa
            ? await ouaa.listFlowUsersByIds({ ...params, ids: props.selectRange.ids })
            : props.selectRange?.type === "ROLE" && ouaa
              ? await ouaa.listFlowUsersByRoleIds({ ...params, ids: props.selectRange.ids })
              : ouaa
                ? await ouaa.listFlowUsers(params)
                : props.client
                  ? await props.client.listStaff(params)
                  : undefined;
        const source = asRecord(result);
        const data = asRecord(source.data ?? result);
        if (version === requestVersion) {
          rows.value = unwrapUsers(result);
          total.value = Number(data.total ?? rows.value.length);
        }
      } catch (error) {
        if (version === requestVersion) message.error(error instanceof Error ? error.message : "人员加载失败");
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    };

    const showPicker = async (): Promise<void> => {
      if (open.value) return;
      if (props.requiresDepartment && !props.departmentId) {
        message.warning("请先选择部门");
        return;
      }
      selected.value = asIdNameList(props.value);
      const currentUser = typeof sessionStorage !== "undefined" ? parseFormData(sessionStorage.getItem("GH-UserInfo")) : {};
      const organizations = Array.isArray(currentUser.organizations) ? currentUser.organizations : [];
      defaultDepartmentId.value = props.departmentId || String(asRecord(organizations[0]).id ?? "") || undefined;
      departmentId.value = defaultDepartmentId.value;
      keyword.value = "";
      workStatus.value = undefined;
      page.value = 1;
      open.value = true;
      void load();
      if (!props.getOuaaClient) return;
      try {
        const ouaa = await props.getOuaaClient();
        const result = await ouaa.listFlowDepartmentOptions({ enabled: true });
        const source = asRecord(result);
        departments.value = (Array.isArray(result) ? result : Array.isArray(source.data) ? source.data : []) as DepartmentNode[];
        if (!applicationsLoaded) {
          applicationsLoaded = true;
          try {
            statusAvailable.value = hasApplication(await ouaa.getTerminalApplicationGroups(), "ATTENDANCE_MANAGEMENT");
          } catch (applicationError) {
            applicationsLoaded = false;
            message.error(applicationError instanceof Error ? applicationError.message : "应用列表加载失败");
          }
        }
      } catch (error) {
        message.error(error instanceof Error ? error.message : "部门加载失败");
      }
    };

    const close = (): void => {
      open.value = false;
      requestVersion++;
      loading.value = false;
      props.onClose?.();
    };
    watch(
      () => props.departmentId,
      (value, previous) => {
        if (previous !== undefined && value !== previous && props.requiresDepartment) emit("update:value", []);
      },
    );
    onMounted(() => {
      if (props.autoOpen) void showPicker();
    });
    const apply = (): void => {
      if (!selected.value.length) {
        message.warning("请选择人员");
        return;
      }
      emit("update:value", selected.value);
      close();
    };

    return () => {
      const current = asIdNameList(props.value);
      if (props.readonly) {
        return <span>{current.map((item) => item.name).join("、") || "--"}</span>;
      }
      if (!props.getOuaaClient && !props.client) {
        return <span style={{ color: "#8c8c8c" }}>人员服务未就绪</span>;
      }
      return (
        <div class={styles.userPicker}>
          {!props.autoOpen ? (
            <>
              <div class={styles.userPickerSelection}>
                <Button type="primary" shape="round" onClick={() => void showPicker()}>
                  选择人员
                </Button>
                <span>{props.placeholder}</span>
              </div>
              {current.length ? (
                <div class={styles.userPickerTags}>
                  {current.map((user, index) => (
                    <span key={`${user.id}-${index}`} class={styles.userPickerTag}>
                      {user.name}
                      <button
                        type="button"
                        aria-label={`移除${user.name}`}
                        onClick={() =>
                          emit(
                            "update:value",
                            current.filter((_, i) => i !== index),
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          <Form.ItemRest>
            <Modal open={open.value} width={1000} title="人员列表" okText="确定" cancelText="取消" onOk={apply} onCancel={close}>
              <div class={styles.userPickerFilters}>
                <label>
                  部门：
                  <TreeSelect
                    value={departmentId.value}
                    treeData={departments.value}
                    fieldNames={{ label: "name", value: "id", children: "children" }}
                    allowClear
                    disabled={Boolean(props.departmentId)}
                    style={{ width: "218px" }}
                    onUpdate:value={(value) => {
                      departmentId.value = value == null ? undefined : String(value);
                    }}
                  />
                </label>
                {statusAvailable.value || props.showWorkStatus ? (
                  <label>
                    状态：
                    <Select
                      value={workStatus.value}
                      allowClear
                      options={[
                        { label: "休息", value: "REST" },
                        { label: "在岗", value: "WORKING" },
                        { label: "离岗", value: "LEAVE_POST" },
                        { label: "出差", value: "AWAY_BUSINESS" },
                        { label: "请假", value: "ASK_LEAVE" },
                      ]}
                      style={{ width: "180px" }}
                      onUpdate:value={(value) => {
                        workStatus.value = value == null ? undefined : String(value);
                      }}
                    />
                  </label>
                ) : null}
                <Input
                  value={keyword.value}
                  placeholder="请输入人员名称"
                  style={{ width: "218px" }}
                  onUpdate:value={(value: string) => {
                    keyword.value = value;
                  }}
                  onPressEnter={() => {
                    page.value = 1;
                    void load();
                  }}
                />
                <Button
                  type="primary"
                  onClick={() => {
                    page.value = 1;
                    void load();
                  }}
                >
                  查询
                </Button>
                <Button
                  onClick={() => {
                    departmentId.value = defaultDepartmentId.value;
                    workStatus.value = undefined;
                    keyword.value = "";
                    page.value = 1;
                    void load();
                  }}
                >
                  重置
                </Button>
              </div>
              <Table
                rowKey="id"
                dataSource={rows.value}
                loading={loading.value}
                columns={[
                  { title: "人员名称", dataIndex: "name" },
                  { title: "部门", dataIndex: "organizations", customRender: ({ text }: { text: string }) => text || "--" },
                  { title: "联系电话", dataIndex: "mobile", customRender: ({ text }: { text: string }) => text || "--" },
                  ...(statusAvailable.value || props.showWorkStatus
                    ? [
                        {
                          title: "状态",
                          dataIndex: "workStatus",
                          customRender: ({ text }: { text: string }) =>
                            ({ REST: "休息", WORKING: "在岗", LEAVE_POST: "离岗", AWAY_BUSINESS: "出差", ASK_LEAVE: "请假" })[
                              text as "REST"
                            ] ?? "--",
                        },
                      ]
                    : []),
                ]}
                rowSelection={{
                  type: props.multiple ? "checkbox" : "radio",
                  preserveSelectedRowKeys: true,
                  selectedRowKeys: selected.value.map((user) => user.id),
                  getCheckboxProps: (row: UserRow) => ({ disabled: props.disabledIds.includes(row.id) }),
                  onChange: (keys: Array<string | number>, picked: UserRow[]) => {
                    selected.value = keys
                      .map(
                        (key) => picked.find((item) => item.id === String(key)) ?? selected.value.find((item) => item.id === String(key)),
                      )
                      .filter((item): item is NamedOption => Boolean(item));
                  },
                }}
                pagination={{
                  current: page.value,
                  pageSize: 10,
                  total: total.value,
                  onChange: (next: number) => {
                    page.value = next;
                    void load();
                  },
                }}
                scroll={{ y: 450 }}
              />
            </Modal>
          </Form.ItemRest>
        </div>
      );
    };
  },
});

export type FormControlHost = {
  client: StreamEngineClient;
  getFileClient?: () => Promise<FileClient>;
  getOuaaClient?: () => Promise<OuaaClient>;
  businessType?: string;
  callType?: string;
  processInstanceId?: string;
  formValues?: Record<string, unknown>;
  rootFormValues?: Record<string, unknown>;
  schemaItems?: FormSchemaItem[];
  rowChain?: Record<string, unknown>[];
  formPerms?: Array<{ id: string; perm: string }>;
  detail?: boolean;
  readonly?: boolean;
  setRelatedValue?: (key: string, value: unknown) => void;
};

const GroupListControl = defineComponent({
  name: "StreamEngineGroupListControl",
  props: {
    item: { type: Object as PropType<FormSchemaItem>, required: true },
    value: { type: Array as PropType<Record<string, unknown>[] | null>, default: null },
    host: { type: Object as PropType<FormControlHost>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const children = () => (Array.isArray(props.item.props?.items) ? (props.item.props.items as FormSchemaItem[]) : []);
    const sessionUser = typeof sessionStorage === "undefined" ? {} : parseFormData(sessionStorage.getItem("GH-UserInfo"));
    const token = typeof sessionStorage === "undefined" ? {} : parseFormData(sessionStorage.getItem("GH-Token"));
    const currentUser = ref<Record<string, unknown>>({
      ...sessionUser,
      id: props.host.formValues?.sponsorId ?? sessionUser.id ?? token.id,
    });
    const defaultRows = new Map<string, Record<string, unknown>>();
    let active = true;
    onBeforeUnmount(() => {
      active = false;
    });
    const createRow = (): Record<string, unknown> => {
      const row = {
        ...Object.fromEntries(
          children().map((child) => [fieldKey(child), props.host.detail ? null : initialFormValue(child, currentUser.value)]),
        ),
        sponsorId: String(currentUser.value.id ?? ""),
        subDataId: crypto.randomUUID(),
      };
      syncAttachmentCounts(children(), row, props.host.formValues);
      defaultRows.set(row.subDataId, structuredClone(row));
      return row;
    };
    const initialRow = props.value === null ? createRow() : null;
    const rowsState = ref<Record<string, unknown>[]>(props.value ?? (initialRow ? [initialRow] : []));
    watch(
      () => props.value,
      (value) => {
        rowsState.value = value ?? (initialRow ? [initialRow] : []);
      },
    );
    const commitRows = (rows: Record<string, unknown>[]): void => {
      rowsState.value = rows;
      emit("update:value", rows);
    };
    onMounted(async () => {
      if (props.value === null && initialRow) commitRows(rowsState.value);
      if (
        props.host.detail ||
        props.readonly ||
        !currentUser.value.id ||
        !children().some((child) => ["UserPicker", "DeptPicker"].includes(String(child.name)) && child.props?.defaultValue === true)
      )
        return;
      try {
        const staff = asRecord(await props.host.client.getStaffDetail(String(currentUser.value.id)));
        if (!active) return;
        currentUser.value = { ...currentUser.value, ...staff };
        let changed = false;
        const nextRows = rowsState.value.map((row) => {
          const defaults = defaultRows.get(String(row.subDataId));
          if (!defaults) return row;
          const nextRow = { ...row };
          for (const child of children()) {
            if (!["UserPicker", "DeptPicker"].includes(String(child.name)) || child.props?.defaultValue !== true) continue;
            const key = fieldKey(child);
            if (JSON.stringify(row[key]) !== JSON.stringify(defaults[key])) continue;
            const value = initialFormValue(child, currentUser.value);
            if (JSON.stringify(row[key]) !== JSON.stringify(value)) {
              nextRow[key] = value;
              changed = true;
            }
          }
          return nextRow;
        });
        if (changed) commitRows(nextRows);
      } catch (error) {
        if (active) message.error(error instanceof Error ? error.message : "默认人员加载失败");
      }
    });
    watchEffect(() => {
      let changed = false;
      const nextRows = rowsState.value.map((row) => {
        const nextRow = { ...row };
        if (syncAttachmentCounts(children(), nextRow, props.host.formValues)) changed = true;
        return nextRow;
      });
      if (changed) commitRows(nextRows);
    });
    return () => {
      const fields = children();
      const rows = rowsState.value;
      const rootValues = props.host.rootFormValues ?? props.host.formValues ?? {};
      const schemaItems = props.host.schemaItems ?? fields;
      const allChildrenReadonly = fields.every((child) => props.host.formPerms?.find((perm) => perm.id === child.id)?.perm === "R");
      const canAdd =
        !props.readonly &&
        (props.host.detail ? props.item.props?.closeAddChild === false && !allChildrenReadonly : props.item.props?.closeAdd !== true);
      const updateRow = (index: number, key: string, nextValue: unknown): void => {
        const nextRows = rowsState.value.map((row) => ({ ...row }));
        nextRows[index] = { ...nextRows[index], [key]: nextValue };
        commitRows(nextRows);
      };
      return (
        <div class={styles.groupList}>
          <div class={styles.groupHeader}>
            <strong>{props.item.title}</strong>
            {canAdd ? (
              <Button type="primary" shape="round" onClick={() => commitRows([...rowsState.value, createRow()])}>
                添加
              </Button>
            ) : null}
          </div>
          {rows.length ? (
            rows.map((row, index) => (
              <div key={String(row.subDataId ?? index)} class={styles.groupRow}>
                <div class={styles.groupFields}>
                  {fields
                    .filter(
                      (child) =>
                        child.show !== false &&
                        props.host.formPerms?.find((perm) => perm.id === child.id)?.perm !== "H" &&
                        matchesLegacyFormRelation(child, schemaItems, rootValues, [...(props.host.rowChain ?? []), row]),
                    )
                    .map((child) => {
                      const key = String(child.id ?? child.name ?? "");
                      const permission = props.host.formPerms?.find((perm) => perm.id === child.id);
                      return (
                        <div key={key} class={styles.groupField} style={{ width: `${Number(child.width ?? 100)}%` }}>
                          {child.name === "GroupList" || child.props?.hideLabel ? null : (
                            <label>
                              {child.props?.required ? <em>* </em> : null}
                              {child.title}
                            </label>
                          )}
                          {renderFormControl(child, row[key], (next) => updateRow(index, key, next), {
                            ...props.host,
                            formValues: { ...props.host.formValues, ...row },
                            rootFormValues: rootValues,
                            rowChain: [...(props.host.rowChain ?? []), row],
                            setRelatedValue: (field, next) => updateRow(index, field, next),
                            readonly: props.readonly || permission?.perm === "R",
                          })}
                        </div>
                      );
                    })}
                </div>
                {canAdd ? (
                  <Button
                    type="link"
                    danger
                    onClick={() => {
                      if (rowsState.value.length <= 1) {
                        message.warning("至少需要一组子表单");
                        return;
                      }
                      commitRows(rowsState.value.filter((_, rowIndex) => rowIndex !== index));
                    }}
                  >
                    删除
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <span>--</span>
          )}
        </div>
      );
    };
  },
});

const ConsumablesOutControl = defineComponent({
  name: "StreamEngineConsumablesOutControl",
  props: {
    value: { type: Array as PropType<Record<string, unknown>[]>, default: () => [] },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    storeId: { type: String, default: "" },
    requiresStore: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const open = ref(false);
    const loading = ref(false);
    const keyword = ref("");
    const categoryId = ref<string>();
    const categories = ref<DepartmentNode[]>([]);
    const pageNumber = ref(1);
    const total = ref(0);
    const stockRows = ref<Record<string, unknown>[]>([]);
    const selectedRows = ref<Record<string, unknown>[]>([]);
    const editing = ref<string[]>([]);
    let requestVersion = 0;

    const rowKey = (row: Record<string, unknown>, index: number): string => String(row.key ?? row.id ?? index);
    const emitRows = (rows: Record<string, unknown>[]): void => {
      setPendingAssetRows(rows, editing.value);
      emit("update:value", rows);
    };
    watch(
      () => props.value,
      (rows) => {
        const keys = new Set(rows.map(rowKey));
        editing.value = editing.value.filter((key) => keys.has(key));
        setPendingAssetRows(rows, editing.value);
      },
      { immediate: true },
    );

    const saveRow = (row: Record<string, unknown>, index: number): void => {
      const issue = consumablesOutRowIssue([row]);
      if (issue) {
        message.error(issue.replace("第1行", `第${index + 1}行`));
        return;
      }
      editing.value = editing.value.filter((key) => key !== rowKey(row, index));
      setPendingAssetRows(props.value, editing.value);
    };

    const loadStock = async (): Promise<void> => {
      const current = ++requestVersion;
      loading.value = true;
      try {
        const result = await props.client.pageConsumableStock({
          storeId: props.storeId || undefined,
          keyword: keyword.value || undefined,
          categoryId: categoryId.value,
          pageNumber: pageNumber.value,
          pageSize: 10,
        });
        if (current !== requestVersion) return;
        stockRows.value = result.records;
        total.value = result.total;
      } catch (error) {
        if (current === requestVersion) message.error(error instanceof Error ? error.message : "耗材加载失败");
      } finally {
        if (current === requestVersion) loading.value = false;
      }
    };

    const openPicker = (): void => {
      if (props.requiresStore && !props.storeId) {
        message.error("请先选择仓库");
        return;
      }
      if (open.value) return;
      selectedRows.value = [...props.value];
      pageNumber.value = 1;
      open.value = true;
      void loadStock();
      void props.client
        .listConsumableCategories()
        .then((items) => {
          if (open.value) categories.value = items as DepartmentNode[];
        })
        .catch((error: unknown) => {
          message.error(error instanceof Error ? error.message : "耗材分类加载失败");
        });
    };
    watch(
      () => props.storeId,
      (value, previous) => {
        if (props.requiresStore && previous !== undefined && value !== previous) {
          editing.value = [];
          emitRows([]);
        }
      },
    );

    const addSelected = (): void => {
      const keys = new Set(props.value.map((item) => String(item.id)));
      const next = [...props.value];
      for (const item of selectedRows.value) {
        if (!keys.has(String(item.id))) {
          next.push({ ...item, flowConvertData: false, num: 0, storeAmount: 0 });
          keys.add(String(item.id));
          editing.value = [...editing.value, String(item.id)];
        }
      }
      emitRows(next);
      open.value = false;
    };

    const setQuantity = (id: unknown, quantity: number | null): void => {
      const next = props.value.map((item) => {
        if (String(item.id) !== String(id)) return item;
        const num = Number(quantity ?? 0);
        const limit = Number(item.useLimit ?? 0);
        if (limit > 0 && num > limit) {
          message.warning(`最多领用 ${limit} 件`);
          return item;
        }
        return { ...item, num, storeAmount: Number((Number(item.avgPrice ?? 0) * num).toFixed(2)) };
      });
      emitRows(next);
    };

    const columns = [
      { title: "序号", key: "index", customRender: ({ index }: { index: number }) => index + 1 },
      {
        title: "图片",
        dataIndex: "file",
        key: "file",
        customRender: ({ text }: { text: unknown }) => {
          const files = Array.isArray(text) ? (text as Record<string, unknown>[]) : [];
          const path = String(files[0]?.path ?? "");
          return path ? <img src={path} alt="耗材图片" class={styles.consumableImage} /> : "暂无图片";
        },
      },
      { title: "耗材名称", dataIndex: "name", key: "name" },
      { title: "耗材编码", dataIndex: "code", key: "code" },
      { title: "规格型号", dataIndex: "model", key: "model" },
      { title: "品牌", dataIndex: "brand", key: "brand" },
      { title: "耗材分类", dataIndex: "categoryName", key: "categoryName" },
      { title: "单位", dataIndex: "unit", key: "unit" },
      { title: "单价", dataIndex: "avgPrice", key: "avgPrice" },
      { title: "库存量", dataIndex: "storeNum", key: "storeNum" },
      { title: "限领数量", dataIndex: "useLimit", key: "useLimit" },
      {
        title: "出库数量",
        dataIndex: "num",
        key: "num",
        customRender: ({ record, index }: { record: Record<string, unknown>; index: number }) =>
          props.readonly || !editing.value.includes(rowKey(record, index)) ? (
            String(record.num ?? "--")
          ) : (
            <InputNumber
              value={Number(record.num ?? 0)}
              min={0}
              max={Number(record.storeNum ?? Infinity)}
              onUpdate:value={(value) => setQuantity(record.id, value == null ? null : Number(value))}
            />
          ),
      },
      { title: "金额", dataIndex: "storeAmount", key: "storeAmount" },
      ...(props.readonly
        ? []
        : [
            {
              title: "操作",
              key: "action",
              fixed: "right" as const,
              width: 145,
              customRender: ({ record, index }: { record: Record<string, unknown>; index: number }) => (
                <Space size={0}>
                  <Button
                    type="link"
                    onClick={() => {
                      const key = rowKey(record, index);
                      if (editing.value.includes(key)) {
                        saveRow(record, index);
                        return;
                      }
                      editing.value = [...editing.value, key];
                      setPendingAssetRows(props.value, editing.value);
                    }}
                  >
                    {editing.value.includes(rowKey(record, index)) ? "保存" : "编辑"}
                  </Button>
                  <Button
                    type="link"
                    danger
                    onClick={() => {
                      editing.value = editing.value.filter((key) => key !== rowKey(record, index));
                      emitRows(props.value.filter((item) => item !== record));
                    }}
                  >
                    删除
                  </Button>
                </Space>
              ),
            },
          ]),
    ];

    return () => (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "10px" }}>
          <strong>耗材领用</strong>
          <span>总量：{props.value.reduce((sum, item) => sum + Number(item.num ?? 0), 0)}</span>
          <span>金额：{props.value.reduce((sum, item) => sum + Number(item.storeAmount ?? 0), 0).toFixed(2)}</span>
          {!props.readonly ? (
            <Button type="primary" shape="round" onClick={openPicker}>
              选择耗材
            </Button>
          ) : null}
        </div>
        <Table rowKey="id" dataSource={props.value} columns={columns} pagination={false} scroll={{ x: 1600 }} size="small" />
        <Modal
          open={open.value}
          width={960}
          title="耗材列表"
          okText="确定"
          cancelText="取消"
          confirmLoading={loading.value}
          onCancel={() => {
            open.value = false;
            requestVersion++;
          }}
          onOk={() => {
            if (!loading.value) addSelected();
          }}
        >
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <TreeSelect
              value={categoryId.value}
              treeData={categories.value}
              fieldNames={{ label: "name", value: "id", children: "children" }}
              allowClear
              placeholder="耗材类别"
              style={{ width: "218px" }}
              onUpdate:value={(value) => {
                categoryId.value = value == null ? undefined : String(value);
              }}
            />
            <Input
              value={keyword.value}
              placeholder="耗材编码、耗材名称"
              onUpdate:value={(value: string) => {
                keyword.value = value;
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                pageNumber.value = 1;
                void loadStock();
              }}
            >
              查询
            </Button>
            <Button
              onClick={() => {
                categoryId.value = undefined;
                keyword.value = "";
                pageNumber.value = 1;
                void loadStock();
              }}
            >
              重置
            </Button>
          </div>
          <Table
            rowKey="id"
            dataSource={stockRows.value}
            loading={loading.value}
            columns={[
              { title: "序号", key: "index", customRender: ({ index }: { index: number }) => (pageNumber.value - 1) * 10 + index + 1 },
              { title: "耗材编码", dataIndex: "code" },
              { title: "耗材名称", dataIndex: "name" },
              { title: "规格型号", dataIndex: "model" },
              { title: "品牌", dataIndex: "brand" },
              { title: "耗材分类", dataIndex: "categoryName" },
              { title: "单位", dataIndex: "unit" },
              { title: "质保期限(月)", dataIndex: "qualityPeriod" },
              { title: "限领数量", dataIndex: "useLimit" },
              { title: "库存量", dataIndex: "storeNum" },
            ]}
            rowSelection={{
              selectedRowKeys: selectedRows.value.map((item) => String(item.id)),
              preserveSelectedRowKeys: true,
              onChange: (keys: Array<string | number>, rows: Record<string, unknown>[]) => {
                const retained = selectedRows.value.filter((item) => keys.some((key) => String(key) === String(item.id)));
                const known = new Set(retained.map((item) => String(item.id)));
                selectedRows.value = [...retained, ...rows.filter((item) => !known.has(String(item.id)))];
              },
            }}
            pagination={{
              current: pageNumber.value,
              pageSize: 10,
              total: total.value,
              onChange: (page: number) => {
                pageNumber.value = page;
                void loadStock();
              },
            }}
            scroll={{ y: 400 }}
          />
        </Modal>
      </div>
    );
  },
});

function objectName(row: Record<string, unknown>): string {
  return targetObjectName(row);
}

const ObjectPickerControl = defineComponent({
  name: "StreamEngineObjectPickerControl",
  props: {
    value: { type: [Object, Array] as PropType<Record<string, unknown> | Record<string, unknown>[] | null>, default: null },
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    kind: { type: String as PropType<"TARGET" | "DEVICE" | "SMALL_ENGINEERING">, default: "TARGET" },
    outSource: { type: Boolean, default: false },
    legacyDeviceValue: { type: Boolean, default: false },
    legacyProjectValue: { type: Boolean, default: false },
    callType: { type: String, default: "" },
    businessType: { type: String, default: "" },
    sourceType: { type: String, default: "" },
    requiresType: { type: Boolean, default: false },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaClient>>, default: undefined },
    multiple: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const open = ref(false);
    const tab = ref<TargetObjectKind>("AREA");
    const filterLoading = ref(false);
    const page = ref(1);
    const total = ref(0);
    const loading = ref(false);
    const rows = ref<Record<string, unknown>[]>([]);
    const selected = ref<Record<string, unknown>[]>([]);
    let requestVersion = 0;
    let filterVersion = 0;
    let activeRequest = "";
    const queries = new Map<TargetObjectKind, Record<string, unknown>>();
    type OptionSource =
      | "products"
      | "categories"
      | "tags"
      | "areas"
      | "departments"
      | "assetTypes"
      | "stallTypes"
      | "pointTypes"
      | "riskTypes";
    const optionRows: Record<OptionSource, TargetObjectOption[]> = {
      products: [],
      categories: [],
      tags: [],
      areas: [],
      departments: [],
      assetTypes: [],
      stallTypes: [],
      pointTypes: [],
      riskTypes: [],
    };
    const loadedOptions = new Set<OptionSource>();
    const optionRequests = new Map<OptionSource, Promise<void>>();

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      cache: false,
      schema: [],
      showCollapseButton: true,
      handleSubmit: () => {
        page.value = 1;
        void load();
      },
      handleReset: () => {
        page.value = 1;
        void load();
      },
    });

    const querySchema = (): PcFormSchemaProp[] => {
      const options = (source: OptionSource) => optionRows[source];
      const field = (
        fieldName: string,
        label: string,
        component: PcFormSchemaProp["component"],
        componentProps: Record<string, unknown> = {},
      ): PcFormSchemaProp => ({
        fieldName,
        label,
        component,
        defaultValue: fieldName === "tagCodes" ? [] : undefined,
        componentProps: { allowClear: true, placeholder: label, onChange: () => {}, ...componentProps },
      });
      const select = (key: string, label: string, source: OptionSource) =>
        field(key, label, "Select", {
          options: options(source),
          loading: filterLoading.value,
          showSearch: true,
          optionFilterProp: "label",
        });
      const tree = (key: string, label: string, source: OptionSource) =>
        field(key, label, markRaw(TreeSelect), {
          treeData: options(source),
          loading: filterLoading.value,
          treeNodeFilterProp: "label",
          showSearch: true,
        });
      const input = (key: string, label: string, placeholder: string) => field(key, label, "Input", { placeholder });
      if (tab.value === "AREA") return [];
      if (props.outSource || props.legacyDeviceValue) return [input("keyword", "", "请输入名称或编码")];
      if (tab.value === "DEVICE")
        return [
          select("productId", "所属产品", "products"),
          field("categoryCode", "产品品类", "Cascader", {
            options: options("categories"),
            loading: filterLoading.value,
            changeOnSelect: true,
          }),
          tree("anyMatchedAreaId", "所在区域", "areas"),
          tree("anyMatchedDepartmentId", "维护部门", "departments"),
          field("tagCodes", "设备标签", "Select", {
            options: options("tags"),
            loading: filterLoading.value,
            mode: "multiple",
            maxTagCount: 3,
            showSearch: true,
            optionFilterProp: "label",
          }),
          input("keyword", "设备名称", "设备名称"),
        ];
      if (tab.value === "PROPERTY")
        return [select("typeId", "类型", "assetTypes"), tree("receiveDepId", "部门", "departments"), input("keyword", "", "资产名称")];
      if (tab.value === "STALL")
        return [select("type", "档位类型", "stallTypes"), tree("areaId", "所在区域", "areas"), input("keyword", "", "档位名称")];
      if (tab.value === "SITE_POINT")
        return [select("typeId", "类型", "pointTypes"), tree("receiveDepId", "部门", "departments"), input("pointName", "", "现场点名称")];
      if (tab.value === "PATROL_POINT") return [tree("areaId", "所属区域", "areas"), input("keyword", "", "巡更点名称")];
      if (tab.value === "RISK_SOURCE") return [input("keyword", "", "风险源名称"), tree("typeCode", "风险源类别", "riskTypes")];
      return [
        field("status", "状态", "Select", {
          placeholder: "请选择状态",
          options: [
            { label: "全部", value: "" },
            { label: "进行中", value: "UNDERWAY" },
            { label: "已完成", value: "COMPLETED" },
            { label: "待验收", value: "WAIT_ACCEPT" },
          ],
        }),
        tree("depId", props.legacyProjectValue ? "部门" : "监管部门", "departments"),
        input("keyword", "", props.legacyProjectValue ? "请输入名称" : "工程名称"),
      ];
    };

    const closePicker = (): void => {
      queries.set(tab.value, { ...formApi.formValues });
      open.value = false;
      requestVersion++;
      filterVersion++;
      activeRequest = "";
      loading.value = false;
      filterLoading.value = false;
    };

    watch(
      () => props.sourceType,
      (value, previous) => {
        if (props.requiresType && previous !== undefined && value !== previous) {
          selected.value = [];
          emit("update:value", null);
          closePicker();
          queries.clear();
        }
      },
    );

    const current = () => (Array.isArray(props.value) ? props.value : props.value ? [props.value] : []);
    const load = async (): Promise<void> => {
      const params = targetObjectQuery(tab.value, formApi.formValues, page.value, 10, {
        legacyDevice: props.legacyDeviceValue,
        outSource: props.outSource,
        rectify: props.legacyProjectValue,
      });
      const requestKey = JSON.stringify([tab.value, props.outSource, params]);
      if (loading.value && activeRequest === requestKey) return;
      const version = ++requestVersion;
      activeRequest = requestKey;
      loading.value = true;
      try {
        const result = props.outSource
          ? await props.client.pageOutsourceDevices(params)
          : await props.client.pageTargetObjects(tab.value, params);
        if (version !== requestVersion) return;
        rows.value = props.outSource
          ? result.records.map((row) => ({
              ...row,
              id: String(row.deviceId ?? row.id ?? ""),
              code: String(row.deviceCode ?? row.code ?? ""),
              name: String(row.deviceName ?? row.name ?? ""),
            }))
          : (result.records as Record<string, unknown>[]);
        total.value = result.total;
      } catch (error) {
        if (version === requestVersion) message.error(error instanceof Error ? error.message : "对象加载失败");
      } finally {
        if (version === requestVersion) {
          loading.value = false;
          activeRequest = "";
        }
      }
    };

    const loadFilterOptions = async (): Promise<void> => {
      const version = ++filterVersion;
      const kind = tab.value;
      filterLoading.value = true;
      formApi.updateSchema(querySchema());
      const ensureOptions = (
        source: OptionSource,
        loadOptions: () => Promise<unknown>,
        fields?: { label?: string; value?: string; children?: string },
      ): Promise<void> => {
        if (loadedOptions.has(source)) return Promise.resolve();
        const pending = optionRequests.get(source);
        if (pending) return pending;
        const request = loadOptions()
          .then((value) => {
            optionRows[source] = targetObjectOptions(value, fields);
            loadedOptions.add(source);
          })
          .finally(() => {
            optionRequests.delete(source);
          });
        optionRequests.set(source, request);
        return request;
      };
      try {
        const tasks: Promise<void>[] = [];
        if (["DEVICE", "STALL", "PATROL_POINT"].includes(kind) && !props.outSource && !props.legacyDeviceValue)
          tasks.push(ensureOptions("areas", () => props.client.listAreas()));
        if (
          ["DEVICE", "PROPERTY", "SITE_POINT", "SMALL_ENGINEERING"].includes(kind) &&
          props.getOuaaClient &&
          !props.outSource &&
          !props.legacyDeviceValue
        ) {
          tasks.push(
            ensureOptions("departments", () =>
              props.getOuaaClient!().then((ouaa) =>
                props.legacyProjectValue ? ouaa.listFlowDepartmentOptions({}) : ouaa.getDepartments({ enabled: true }),
              ),
            ),
          );
        }
        if (kind === "DEVICE" && !props.outSource && !props.legacyDeviceValue)
          tasks.push(
            ensureOptions("products", () => props.client.listTargetDeviceProducts(), { label: "prodName" }),
            ensureOptions("categories", () => props.client.listTargetDeviceCategories(), { label: "categoryName", value: "categoryCode" }),
            ensureOptions("tags", () => props.client.listTargetDeviceTags(), { label: "tagName", value: "tagCode" }),
          );
        if (kind === "PROPERTY") tasks.push(ensureOptions("assetTypes", () => props.client.listAssetClassifications("assetType")));
        if (kind === "STALL") tasks.push(ensureOptions("stallTypes", () => props.client.listTargetStallTypes()));
        if (kind === "SITE_POINT") tasks.push(ensureOptions("pointTypes", () => props.client.listInspectPointTypes()));
        if (kind === "RISK_SOURCE")
          tasks.push(ensureOptions("riskTypes", () => props.client.listTargetRiskSourceTypes(), { value: "code", children: "nextList" }));
        await Promise.all(tasks);
      } catch (error) {
        if (open.value && version === filterVersion) message.error(error instanceof Error ? error.message : "对象筛选条件加载失败");
      } finally {
        if (version === filterVersion) {
          filterLoading.value = false;
          if (open.value) formApi.updateSchema(querySchema());
        }
      }
    };

    const openPicker = (): void => {
      if (props.kind === "TARGET" && props.callType !== "INTERNAL") return;
      if (props.requiresType && !props.sourceType) {
        message.error("请先选择对象类型");
        return;
      }
      if (open.value) return;
      selected.value =
        props.kind === "TARGET" ? current().filter((row) => TARGET_OBJECT_KINDS.some((entry) => entry.value === row.type)) : current();
      tab.value =
        props.kind === "DEVICE"
          ? "DEVICE"
          : props.kind === "SMALL_ENGINEERING"
            ? "SMALL_ENGINEERING"
            : (TARGET_OBJECT_KINDS.find((entry) => entry.value === current()[0]?.type)?.value ?? tab.value);
      formApi.updateSchema(querySchema());
      for (const key of Object.keys(formApi.formValues)) delete formApi.formValues[key];
      formApi.setFormValues(queries.get(tab.value) ?? {});
      page.value = 1;
      open.value = true;
      void load();
      void loadFilterOptions();
    };

    const apply = (): void => {
      emit(
        "update:value",
        targetObjectValue(selected.value, tab.value, {
          compact: props.legacyDeviceValue || props.legacyProjectValue,
          array: props.kind !== "TARGET" || props.multiple,
        }),
      );
      queries.set(tab.value, { ...formApi.formValues });
      closePicker();
    };

    const columns = () => {
      const text = (title: string, dataIndex: string, render?: (row: Record<string, unknown>) => unknown) => ({
        title,
        dataIndex,
        key: dataIndex,
        width: 170,
        customRender: ({ record }: { record: Record<string, unknown> }) => targetObjectDisplay(render ? render(record) : record[dataIndex]),
      });
      if (props.outSource) return [text("名称", "name", objectName), text("类别", "deviceCategory"), text("区域", "areaName")];
      if (props.legacyDeviceValue) return [text("名称", "name", objectName), text("编码", "code")];
      if (tab.value === "AREA") return [text("区域名称", "name"), text("区域编号", "code")];
      if (tab.value === "DEVICE")
        return [
          text("设备编号", "code"),
          text("设备名称", "name", objectName),
          text("所属产品", "productInfo", (row) => asRecord(row.productInfo).name),
          text("产品品类", "productCategory", (row) => asRecord(asRecord(row.productInfo).productCategory).name),
          text("维护部门", "department"),
          text("所在区域", "area", (row) => asRecord(row.area).pathName),
        ];
      if (tab.value === "PATROL_POINT") return [text("名称", "patrolLocationName", objectName), text("区域", "area")];
      if (tab.value === "SMALL_ENGINEERING")
        return [
          ...(props.legacyProjectValue
            ? [{ title: "序号", key: "index", width: 80, customRender: ({ index }: { index: number }) => index + 1 }]
            : []),
          text("名称", "projectName", objectName),
          text("类别", "projectTypeName"),
          text("部门", "depName"),
        ];
      return [
        text("名称", "name", objectName),
        text("类别", "typeName"),
        text("部门", tab.value === "SITE_POINT" ? "depName" : tab.value === "STALL" ? "deptNames" : "receiveDepName"),
        text("区域", tab.value === "STALL" ? "areaNames" : "areaName"),
      ];
    };

    return () => {
      const names = current().map(objectName).filter(Boolean).join("、");
      if (props.readonly) return <span>{names || "--"}</span>;
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
          {props.kind === "TARGET" ? (
            <Input
              value={names}
              placeholder="请输入或选择对象"
              maxlength={50}
              onUpdate:value={(text: string) =>
                emit("update:value", text ? { id: 0, name: text, type: "CUSTOM", flowConvertData: false } : null)
              }
            />
          ) : (
            <Select
              mode={props.multiple || props.legacyProjectValue ? "multiple" : undefined}
              open={false}
              value={props.multiple || props.legacyProjectValue ? current().map((row) => String(row.id)) : String(current()[0]?.id ?? "")}
              options={current().map((row) => ({ label: objectName(row), value: String(row.id) }))}
              style={{ flex: 1 }}
              onUpdate:value={(ids) => {
                const keys = Array.isArray(ids) ? ids : ids ? [ids] : [];
                emit(
                  "update:value",
                  targetObjectValue(
                    current().filter((row) => keys.includes(String(row.id))),
                    tab.value,
                    { compact: props.legacyDeviceValue || props.legacyProjectValue, array: true },
                  ),
                );
              }}
            />
          )}
          {props.kind !== "TARGET" || props.callType === "INTERNAL" ? (
            <Button type="primary" onClick={openPicker}>
              {props.legacyDeviceValue ? "请选择" : props.kind === "DEVICE" ? "关联设备" : "选择对象"}
            </Button>
          ) : null}
          <Modal
            open={open.value}
            width={props.legacyProjectValue ? 1200 : 1000}
            title={
              props.legacyDeviceValue
                ? "选择对象"
                : props.kind === "DEVICE"
                  ? "关联设备"
                  : `选择${props.businessType === "FAULT" ? "故障" : props.businessType === "HIDDENDANGER" ? "隐患" : ""}对象`
            }
            okText="确定"
            cancelText="取消"
            confirmLoading={loading.value}
            onCancel={closePicker}
            onOk={apply}
          >
            {props.kind === "TARGET" ? (
              <Tabs
                activeKey={tab.value}
                onUpdate:activeKey={(value) => {
                  queries.set(tab.value, { ...formApi.formValues });
                  tab.value = TARGET_OBJECT_KINDS.find((entry) => entry.value === value)?.value ?? "AREA";
                  formApi.updateSchema(querySchema());
                  for (const key of Object.keys(formApi.formValues)) delete formApi.formValues[key];
                  formApi.setFormValues(queries.get(tab.value) ?? {});
                  page.value = 1;
                  void load();
                  void loadFilterOptions();
                }}
              >
                {TARGET_OBJECT_KINDS.map((kind) => (
                  <TabPane key={kind.value} tab={kind.label} />
                ))}
              </Tabs>
            ) : null}
            {tab.value !== "AREA" ? (
              <div style={{ margin: "12px 0" }}>
                <PcForm />
              </div>
            ) : null}
            <Table
              rowKey={(row: Record<string, unknown>) => String(row.id ?? row.deviceId ?? row.targetId ?? "")}
              dataSource={rows.value}
              loading={loading.value}
              columns={columns()}
              rowSelection={{
                type: props.multiple ? "checkbox" : "radio",
                preserveSelectedRowKeys: true,
                selectedRowKeys: selected.value
                  .filter((row) => props.kind !== "TARGET" || row.type === tab.value)
                  .map((row) => String(row.id ?? row.deviceId ?? row.targetId)),
                onChange: (keys: Array<string | number>, picked: Record<string, unknown>[]) => {
                  const known = new Map(
                    [...selected.value, ...picked.filter(Boolean)].map((row) => [String(row.id ?? row.deviceId ?? row.targetId), row]),
                  );
                  selected.value = keys
                    .map((key) => known.get(String(key)))
                    .filter((row): row is Record<string, unknown> => Boolean(row))
                    .map((row) => ({ ...row, type: tab.value }));
                },
              }}
              pagination={
                tab.value === "AREA"
                  ? false
                  : {
                      current: page.value,
                      pageSize: 10,
                      total: total.value,
                      onChange: (next: number) => {
                        page.value = next;
                        void load();
                      },
                    }
              }
              scroll={{ x: tab.value === "DEVICE" && !props.legacyDeviceValue && !props.outSource ? 1100 : undefined, y: 400 }}
            />
            <div style={{ marginTop: "12px" }}>已选{selected.value.length}项</div>
          </Modal>
        </div>
      );
    };
  },
});

const DepartmentPickerControl = defineComponent({
  name: "StreamEngineDepartmentPickerControl",
  props: {
    value: { type: Array as PropType<NamedOption[]>, default: () => [] },
    getOuaaClient: { type: Function as PropType<() => Promise<OuaaClient>>, default: undefined },
    multiple: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    placeholder: { type: String, default: "请选择部门" },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const rows = ref<DepartmentNode[]>([]);
    const selected = ref<NamedOption[]>([]);
    const loading = ref(false);
    const open = ref(false);
    const keyword = ref("");
    let requestVersion = 0;
    const load = async (): Promise<void> => {
      if (!props.getOuaaClient || !open.value) return;
      const version = ++requestVersion;
      loading.value = true;
      try {
        const result = await (await props.getOuaaClient()).listFlowDepartments({ name: keyword.value, enabled: true });
        const source = asRecord(result);
        const list = Array.isArray(result)
          ? result
          : Array.isArray(source.data)
            ? source.data
            : Array.isArray(source.records)
              ? source.records
              : [];
        if (version === requestVersion) rows.value = list as DepartmentNode[];
      } catch (error) {
        if (version === requestVersion) message.error(error instanceof Error ? error.message : "部门加载失败");
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    };
    const close = (): void => {
      open.value = false;
      requestVersion++;
      loading.value = false;
    };
    const showPicker = (): void => {
      selected.value = asIdNameList(props.value);
      keyword.value = "";
      open.value = true;
      void load();
    };
    const apply = (): void => {
      if (selected.value.length === 0) {
        message.warning("请选择部门");
        return;
      }
      emit("update:value", selected.value);
      close();
    };
    return () =>
      props.readonly ? (
        <span>{props.value.map((entry) => entry.name).join("、") || "--"}</span>
      ) : (
        <div class={styles.userPicker}>
          <div class={styles.userPickerSelection}>
            <Button type="primary" shape="round" onClick={showPicker}>
              选择部门
            </Button>
            <span>{props.placeholder}</span>
          </div>
          {props.value.length > 0 ? (
            <div class={styles.userPickerTags}>
              {props.value.map((entry, index) => (
                <span key={`${entry.id}-${index}`} class={styles.userPickerTag}>
                  {entry.name}
                  <button
                    type="button"
                    aria-label={`移除${entry.name}`}
                    onClick={() =>
                      emit(
                        "update:value",
                        props.value.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <Form.ItemRest>
            <Modal open={open.value} width={1000} title="部门列表" okText="确定" cancelText="取消" onOk={apply} onCancel={close}>
              <div class={styles.userPickerFilters}>
                <Input
                  value={keyword.value}
                  placeholder="请输入部门名称"
                  style={{ width: "218px" }}
                  onUpdate:value={(value: string) => {
                    keyword.value = value;
                  }}
                  onPressEnter={() => void load()}
                />
                <Button type="primary" onClick={() => void load()}>
                  查询
                </Button>
                <Button
                  onClick={() => {
                    keyword.value = "";
                    void load();
                  }}
                >
                  重置
                </Button>
              </div>
              <Table
                rowKey="id"
                dataSource={rows.value}
                loading={loading.value}
                columns={[{ title: "部门名称", dataIndex: "name" }]}
                rowSelection={{
                  type: props.multiple ? "checkbox" : "radio",
                  selectedRowKeys: selected.value.map((entry) => entry.id),
                  onChange: (keys: Array<string | number>, picked: DepartmentNode[]) => {
                    selected.value = keys
                      .map(
                        (key) =>
                          picked.find((entry) => String(entry.id) === String(key)) ??
                          selected.value.find((entry) => entry.id === String(key)),
                      )
                      .filter((entry): entry is NamedOption => Boolean(entry))
                      .map((entry) => ({ id: String(entry.id), name: entry.name }));
                  },
                }}
                pagination={false}
                scroll={{ y: 450 }}
              />
            </Modal>
          </Form.ItemRest>
        </div>
      );
  },
});

const AlarmRecordsControl = defineComponent({
  name: "StreamEngineAlarmRecordsControl",
  props: {
    client: { type: Object as PropType<StreamEngineClient>, required: true },
    devices: { type: Array as PropType<Record<string, unknown>[]>, default: () => [] },
    period: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup(props) {
    const router = inject(routerKey, undefined);
    const rows = ref<Record<string, unknown>[]>([]);
    const page = ref(1);
    const total = ref(0);
    const loading = ref(false);
    const navigating = ref("");
    let requestVersion = 0;
    const load = async (): Promise<void> => {
      const ids = props.devices.map((device) => device.id ?? device.deviceId).filter((id) => id != null && id !== "");
      if (!ids.length) {
        requestVersion++;
        rows.value = [];
        total.value = 0;
        loading.value = false;
        return;
      }
      const version = ++requestVersion;
      loading.value = true;
      try {
        const result = await props.client.pageAlarmRecords({
          pageNumber: page.value,
          pageSize: 10,
          deviceIds: ids.join(","),
          period: alarmRecordPeriod(props.period),
        });
        if (version !== requestVersion) return;
        rows.value = result.records as Record<string, unknown>[];
        total.value = result.total;
      } catch (error) {
        if (version === requestVersion) message.error(error instanceof Error ? error.message : "预警记录加载失败");
      } finally {
        if (version === requestVersion) loading.value = false;
      }
    };
    const goDetail = async (record: Record<string, unknown>): Promise<void> => {
      if (navigating.value) return;
      const target = alarmRecordDetailPath(
        record,
        router?.getRoutes().map((route) => route.path),
      );
      if (!target) return;
      navigating.value = String(record.id ?? record.businessKey ?? "");
      try {
        if (router && target.startsWith("/d/")) await router.push(target);
        else window.location.assign(target);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "预警详情打开失败");
      } finally {
        navigating.value = "";
      }
    };
    watch(
      [() => props.devices.map((device) => String(device.id ?? device.deviceId)).join(","), () => props.period.join(",")],
      () => {
        page.value = 1;
        void load();
      },
      { immediate: true },
    );
    return () => (
      <Table
        rowKey={(row: Record<string, unknown>) => String(row.id ?? row.businessKey ?? row.alarmEventName ?? row.alarmEvent ?? "")}
        dataSource={rows.value}
        loading={loading.value}
        size="small"
        columns={[
          {
            title: "预警事件名称",
            key: "alarmEventName",
            customRender: ({ record }: { record: Record<string, unknown> }) =>
              String(record.alarmEventName ?? record.alarmEvent ?? record.alarmTypeName ?? "--"),
          },
          {
            title: "时间",
            key: "alarmTime",
            customRender: ({ record }: { record: Record<string, unknown> }) => alarmRecordTime(record.alarmTime ?? record.createTime),
          },
          {
            title: "设备名称",
            key: "alarmTargetName",
            customRender: ({ record }: { record: Record<string, unknown> }) => String(record.alarmTargetName ?? record.deviceName ?? "--"),
          },
          {
            title: "处理状态",
            key: "alarmStatusName",
            customRender: ({ record }: { record: Record<string, unknown> }) => (
              <Tag color={record.alarmStatus === "ALARM_HANDLER" || record.alarmStatusName === "已处理" ? "green" : "orange"}>
                {String(record.alarmStatusName ?? (record.alarmStatus === "ALARM_HANDLER" ? "已处理" : "处理中"))}
              </Tag>
            ),
          },
          {
            title: "操作",
            key: "action",
            width: 80,
            customRender: ({ record }: { record: Record<string, unknown> }) => (
              <Button
                type="link"
                size="small"
                loading={navigating.value === String(record.id ?? record.businessKey ?? "")}
                onClick={() => void goDetail(record)}
              >
                详情
              </Button>
            ),
          },
        ]}
        pagination={{
          current: page.value,
          pageSize: 10,
          total: total.value,
          onChange: (next: number) => {
            page.value = next;
            void load();
          },
        }}
        scroll={{ x: 650 }}
      />
    );
  },
});

export function renderFormControl(item: FormSchemaItem, value: unknown, onChange: (next: unknown) => void, host: FormControlHost) {
  const name = String(item.name ?? "");
  const placeholder = String(item.props?.placeholder ?? "");
  const readonly = Boolean(host.readonly);

  const personnel = PERSONNEL_CONTROLS.find((control) => control.id === name);
  if (personnel) {
    const source = item.props?.params ? host.formValues?.[String(item.props.params)] : host.formValues?.sponsorId;
    let sourceId = staffSourceId(source) || staffSourceId(host.formValues?.sponsorId);
    if (!sourceId && typeof sessionStorage !== "undefined") {
      try {
        sourceId = staffSourceId(JSON.parse(sessionStorage.getItem("GH-UserInfo") || "null"));
      } catch {
        sourceId = "";
      }
    }
    return (
      <ArchiveFieldControl
        value={archiveFieldValue(value)}
        client={host.client}
        sourceId={sourceId}
        attr={String(item.props?.attr ?? item.attr ?? personnel.attr)}
        sponsor={name === "SponsorInput"}
        placeholder={placeholder || `默认为发起人${personnel.title}`}
        detail={Boolean(host.detail)}
        readonly={readonly}
        onUpdate:value={(next) => onChange(next)}
      />
    );
  }

  const attendanceHr = renderAttendanceHrControl(item, value, onChange, host);
  if (attendanceHr) return attendanceHr;
  const permitParking = renderPermitParkingControl(item, value, onChange, host);
  if (permitParking) return permitParking;

  switch (name) {
    case "AssetSource":
    case "AssetTypeSelect":
    case "ScrappingReason":
    case "WareHouseSelect":
      return (
        <AssetChoiceControl
          kind={name}
          value={assetControlValue(value)}
          client={host.client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "AssetIsExpired":
      return <AssetExpiredControl value={typeof value === "boolean" ? value : null} readonly={readonly} onUpdate:value={onChange} />;
    case "OfficialSealList":
    case "FocusWorkTypeList":
    case "FocusWorkList":
    case "FocusWorkStatusList":
      return (
        <OfficialSelectControl
          kind={name}
          value={officialControlValue(value)}
          client={host.client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "FocusWork":
    case "FocusWorkRequirement":
    case "FocusWorkCompleteTime": {
      const related = host.formValues?.[String(item.props?.params ?? "")];
      const routeId =
        typeof location === "undefined"
          ? ""
          : new URLSearchParams(location.search).get("businessKey") ||
            new URLSearchParams(location.hash.split("?")[1] || "").get("businessKey") ||
            "";
      return (
        <OfficialAutofillControl
          kind={name}
          value={officialControlValue(value)}
          client={host.client}
          sourceId={name === "FocusWorkRequirement" ? staffSourceId(related) : routeId}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    }
    case "WorkList": {
      const progressKey = String(item.props?.params ?? "");
      return (
        <WorkStatusControl
          value={officialControlValue(value)}
          progress={host.formValues?.[progressKey] as number | string | null}
          readonly={readonly}
          onUpdate:value={onChange}
          onUpdate:progress={(next: number) => {
            if (progressKey) host.setRelatedValue?.(progressKey, next);
          }}
        />
      );
    }
    case "DeviceStatus":
    case "DeviceChangeStatus": {
      const related = host.formValues?.[String(item.props?.params ?? "")];
      return (
        <DeviceSnapshotControl
          kind={name}
          value={Array.isArray(value) ? value : []}
          deviceId={selectedDeviceId(related)}
          client={host.client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    }
    case "RetrofitConfirmSelect":
      return <RetrofitConfirmControl value={officialControlValue(value)} readonly={readonly} onUpdate:value={onChange} />;
    case "AddAssetTable":
    case "ChooseAssetTable":
    case "ConsumablesEnter": {
      const department = host.formValues?.[String(item.props?.params ?? "")];
      const receiveDepId = Array.isArray(department) ? staffSourceId(department[0]) : staffSourceId(department);
      return (
        <AssetTableControl
          kind={name}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          client={host.client}
          readonly={readonly}
          businessType={host.businessType}
          receiveDepId={receiveDepId}
          renderCell={(childName, cellValue, update, row) =>
            renderFormControl({ id: childName, name: childName, title: childName, props: {} }, cellValue, update, {
              ...host,
              formValues: { ...host.formValues, ...row },
              rootFormValues: host.rootFormValues ?? host.formValues,
            })
          }
          onUpdate:value={onChange}
        />
      );
    }
    case "GroupList": {
      return (
        <GroupListControl
          item={item}
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : null}
          host={host}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    }
    case "ConsumablesOut": {
      if (readonly) return <ConsumablesOutReadonlyControl value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []} />;
      const store = host.formValues?.[String(item.props?.params ?? "")];
      const storeId = store && typeof store === "object" ? String((store as { id?: unknown }).id ?? "") : "";
      return (
        <ConsumablesOutControl
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          client={host.client}
          storeId={storeId}
          requiresStore={Boolean(item.props?.params)}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    }
    case "OutsiderConcat": {
      const contact = value && typeof value === "object" ? (value as { name?: string; tel?: string }) : {};
      if (readonly)
        return (
          <div>
            <div>姓名：{contact.name || "--"}</div>
            <div>电话：{contact.tel || "--"}</div>
          </div>
        );
      return (
        <div style={{ display: "grid", gap: "10px" }}>
          <Input
            addonBefore="姓名:"
            value={contact.name ?? ""}
            placeholder="请输入姓名"
            onUpdate:value={(next: string) => onChange({ ...contact, name: next })}
          />
          <Input
            addonBefore="电话:"
            value={contact.tel ?? ""}
            maxlength={11}
            placeholder="请输入电话"
            onUpdate:value={(next: string) => onChange({ ...contact, tel: next })}
          />
        </div>
      );
    }
    case "SwitchSelect":
      return readonly ? (
        <span>{value ? "是" : "否"}</span>
      ) : (
        <Switch checked={Boolean(value)} onUpdate:checked={(next) => onChange(Boolean(next))} />
      );
    case "FaultTypeSelect":
      return (
        <FaultTypeSelect
          value={asIdName(value) ?? null}
          client={host.client}
          businessType={host.businessType}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "WorKReportSelect":
      return (
        <WorkReportTypeSelect
          value={asIdName(value) ?? null}
          client={host.client}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "OutSourceCom": {
      const deviceId = staffSourceId(host.formValues?.[String(item.props?.params ?? "")]);
      return (
        <AsyncIdNameSelect
          value={asIdName(value) ?? null}
          dependencyKey={deviceId}
          loadOptions={() => host.client.listOutsourceCompanies(deviceId || undefined)}
          placeholder="请选择委外公司"
          readonly={readonly}
          onUpdate:value={(next: NamedOption | null) => onChange(next)}
        />
      );
    }
    case "OutSourceMode": {
      const companyId = staffSourceId(host.formValues?.[String(item.props?.params ?? "")]);
      return (
        <AsyncIdNameSelect
          value={asIdName(value) ?? null}
          dependencyKey={companyId}
          loadOptions={() => host.client.listOutsourceModes(companyId || undefined)}
          placeholder="请选择委外类型"
          readonly={readonly}
          onUpdate:value={(next: NamedOption | null) => onChange(next)}
        />
      );
    }
    case "ProjectName":
      return (
        <AsyncIdNameSelect
          value={asIdName(value) ?? null}
          loadOptions={() => host.client.listProjectNames()}
          mapOption={(row) => ({ id: String(row.ApplyId ?? ""), name: String(row.projectName ?? "") })}
          placeholder="请选择工程名称"
          readonly={readonly}
          onUpdate:value={(next: NamedOption | null) => onChange(next)}
        />
      );
    case "OutSourceHandleResult":
      return (
        <StaticIdNameSelect
          value={asIdName(value) ?? null}
          options={[
            { label: "未解决", value: "UNRESOLVED" },
            { label: "已解决", value: "RESOLVED" },
          ]}
          placeholder="请选择处理结果"
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "OutSourceResult":
      return (
        <StaticIdNameSelect
          value={asIdName(value) ?? null}
          options={[
            { label: "确认维修", value: "CONFIRM_REPAIR" },
            { label: "暂不处理", value: "NO_PROCESS" },
          ]}
          placeholder="请选择确认结果"
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "DeviceSelect":
      return (
        <ObjectPickerControl
          kind="DEVICE"
          outSource={Boolean(item.props?.outSource)}
          legacyDeviceValue
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : null}
          client={host.client}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "RectifyTargetSelect":
      return (
        <ObjectPickerControl
          kind="SMALL_ENGINEERING"
          legacyProjectValue
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : null}
          client={host.client}
          getOuaaClient={host.getOuaaClient}
          businessType={host.businessType}
          sourceType={staffSourceId(host.formValues?.[String(item.props?.params ?? "")])}
          requiresType={Boolean(item.props?.params)}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "FaultLevelSelect":
      return (
        <StaticIdNameSelect
          value={asIdName(value) ?? null}
          options={[
            { label: "一般", value: "NORMAL" },
            { label: "重要", value: "IMPORTANCE" },
            { label: "紧急", value: "URGENCY" },
          ]}
          placeholder="请选择紧急程度"
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "FaultComfirmSelect":
      return (
        <StaticIdNameSelect
          value={asIdName(value) ?? null}
          options={[
            { label: "确认故障", value: "CONFIRMED" },
            { label: "暂不处理", value: "NO_PROCESS" },
          ]}
          placeholder="请选择"
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "TextareaInput":
      if (readonly) {
        return <span style={{ lineHeight: "32px", whiteSpace: "pre-wrap" }}>{String(value ?? "") || "--"}</span>;
      }
      return (
        <Textarea
          value={String(value ?? "")}
          maxlength={500}
          rows={Math.max(2, Number(item.props?.rows ?? 4))}
          placeholder={placeholder || `请输入${item.title ?? ""}`}
          onUpdate:value={(next: string) => onChange(next)}
        />
      );
    case "NumberInput":
      if (readonly) {
        return <span style={{ lineHeight: "32px" }}>{value == null || value === "" ? "--" : String(value)}</span>;
      }
      return (
        <InputNumber
          value={value == null || value === "" ? undefined : Number(value)}
          min={item.props?.minNum === "" || item.props?.minNum == null ? undefined : Number(item.props.minNum)}
          max={item.props?.maxNum === "" || item.props?.maxNum == null ? undefined : Number(item.props.maxNum)}
          precision={Number(item.props?.precision ?? 0)}
          disabled={Boolean(item.props?.params)}
          style={{ width: "100%" }}
          placeholder={placeholder || `请输入${item.title ?? ""}`}
          onUpdate:value={(next) => onChange(next == null ? undefined : Number(next))}
        />
      );
    case "AmountInput": {
      return (
        <AmountInputControl
          value={value == null || value === "" ? null : Number(value)}
          minNum={item.props?.minNum === "" || item.props?.minNum == null ? undefined : Number(item.props.minNum)}
          precision={Number(item.props?.precision ?? 0)}
          maxlength={Number(item.props?.maxlength ?? 100000)}
          placeholder={placeholder || "请输入金额"}
          readonly={readonly}
          showChinese={Boolean(item.props?.showChinese)}
          onUpdate:value={onChange}
        />
      );
    }
    case "SelectInput":
      if (readonly) {
        const options = normalizeSelectOptions(item.props?.options);
        const matched = options.find((option) => option.value === String(value ?? ""));
        return <span style={{ lineHeight: "32px" }}>{matched?.label || String(value ?? "") || "--"}</span>;
      }
      return (
        <Select
          value={value as string | undefined}
          options={normalizeSelectOptions(item.props?.options)}
          placeholder={placeholder || `请选择${item.title ?? ""}`}
          allowClear
          style={{ width: "100%" }}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "MultipleSelect":
      if (readonly) return <span style={{ lineHeight: "32px" }}>{Array.isArray(value) ? value.join("、") || "--" : "--"}</span>;
      return (
        <Select
          mode="multiple"
          value={Array.isArray(value) ? value : []}
          options={normalizeSelectOptions(item.props?.options)}
          placeholder={placeholder || `请选择${item.title ?? ""}`}
          allowClear
          style={{ width: "100%" }}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "DateTime": {
      if (readonly) return <span style={{ lineHeight: "32px" }}>{String(value ?? "") || "--"}</span>;
      const format = String(item.props?.format ?? "yyyy-MM-dd HH:mm:ss")
        .replace("yyyy", "YYYY")
        .replace("dd", "DD");
      return (
        <DatePicker
          value={value as never}
          showTime={format.includes("HH")}
          picker={format === "YYYY" ? "year" : format === "YYYY-MM" ? "month" : undefined}
          format={format}
          valueFormat={format}
          style={{ width: "100%" }}
          placeholder={placeholder || `请选择${item.title ?? ""}`}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    }
    case "DateTimeRange": {
      const placeholders = Array.isArray(item.props?.placeholder) ? item.props.placeholder : ["开始时间", "结束时间"];
      return (
        <VehicleDateRangeControl
          value={Array.isArray(value) && value.length === 2 ? (value as VehicleDateRangeValue) : null}
          client={host.client}
          params={String(item.props?.params ?? "")}
          formValues={host.formValues ?? {}}
          rootFormValues={host.rootFormValues}
          rowChain={host.rowChain}
          format={String(item.props?.format ?? "yyyy-MM-dd HH:mm:ss")}
          placeholder={[String(placeholders[0] ?? "开始时间"), String(placeholders[1] ?? "结束时间")]}
          showLength={Boolean(item.props?.showLength)}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    }
    case "TimePickerRange": {
      const range = Array.isArray(value) ? (value as string[]) : [];
      if (readonly) return <span>{range.length ? range.join(" 至 ") : "--"}</span>;
      const format = String(item.props?.format ?? "HH:mm:ss");
      const placeholders = Array.isArray(item.props?.placeholder) ? item.props.placeholder : ["开始时间", "结束时间"];
      return (
        <Space>
          <TimePicker
            value={range[0] as never}
            valueFormat={format}
            format={format}
            placeholder={String(placeholders[0] ?? "开始时间")}
            onUpdate:value={(next) => onChange([next, range[1] ?? null])}
          />
          <span>至</span>
          <TimePicker
            value={range[1] as never}
            valueFormat={format}
            format={format}
            placeholder={String(placeholders[1] ?? "结束时间")}
            onUpdate:value={(next) => onChange([range[0] ?? null, next])}
          />
        </Space>
      );
    }
    case "CarId":
      return (
        <CarIdControl
          value={value == null ? null : String(value)}
          client={host.client}
          params={String(item.props?.params ?? "")}
          formValues={host.rootFormValues ?? host.formValues ?? {}}
          detail={Boolean(host.detail)}
          readonly={readonly}
          defaultValue={String(item.props?.defaultValue ?? "")}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "TelPhone":
    case "IDNumber": {
      if (readonly) return <span>{String(value ?? "") || "--"}</span>;
      const filter = typeof item.props?.onkeyup === "string" ? item.props.onkeyup : "";
      return (
        <Input
          value={String(value ?? "")}
          maxlength={500}
          placeholder={placeholder || (name === "TelPhone" ? "请输入电话号码" : "请输入身份证号")}
          onUpdate:value={(next: string) => onChange(filter ? next.replace(filter, "") : next)}
        />
      );
    }
    case "RateInput":
      return (
        <Rate
          value={Number(value ?? 0)}
          count={Number(item.props?.rateNum ?? 5)}
          allowHalf
          allowClear
          disabled={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "ProblemTypeSelect":
      return (
        <ProblemTypeSelect
          value={asIdName(value) ?? null}
          client={host.client}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "ProblemLevelSelect":
      return (
        <ProblemLevelSelect
          value={asIdName(value) ?? null}
          client={host.client}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "ProblemComfirmSelect":
      return (
        <StaticIdNameSelect
          value={asIdName(value) ?? null}
          options={[
            { label: "确认隐患", value: "CONFIRMED" },
            { label: "暂不处理", value: "NO_PROCESS" },
          ]}
          placeholder={placeholder || "请选择"}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "SolutionResult":
      return (
        <StaticIdNameSelect
          value={asIdName(value) ?? null}
          options={[
            { label: "未解决", value: "UNRESOLVED" },
            { label: "已解决", value: "RESOLVED" },
          ]}
          placeholder={placeholder || "请选择"}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "AreaList":
      return (
        <AreaListSelect
          value={(value as { id?: Array<string | number>; name?: string } | null) ?? null}
          client={host.client}
          api={String(item.props?.api ?? "")}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "FileUpload":
      return (
        <FileUploadControl
          value={Array.isArray(value) ? value : []}
          getFileClient={host.getFileClient}
          placeholder={placeholder || "请选择附件"}
          readonly={readonly}
          businessType={host.businessType}
          maxSize={Number(item.props?.maxSize ?? 100)}
          accept={typeof item.props?.accept === "string" ? item.props.accept : undefined}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "UserPicker": {
      const source = item.props?.params ? host.formValues?.[String(item.props.params)] : undefined;
      return (
        <UserPickerControl
          value={asIdNameList(value)}
          client={host.client}
          getOuaaClient={host.getOuaaClient}
          placeholder={placeholder || "请选择人员"}
          multiple={Boolean(item.props?.multiple)}
          readonly={readonly}
          requiresDepartment={Boolean(item.props?.params)}
          departmentId={staffSourceId(source)}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    }
    case "TargetObjectSelect":
      return (
        <ObjectPickerControl
          value={value && typeof value === "object" ? (value as Record<string, unknown>) : null}
          client={host.client}
          getOuaaClient={host.getOuaaClient}
          callType={host.callType}
          businessType={host.businessType}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "RelatedDeviceSelect":
      return (
        <ObjectPickerControl
          kind="DEVICE"
          value={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          client={host.client}
          getOuaaClient={host.getOuaaClient}
          multiple={Boolean(item.props?.multiple)}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "DeptPicker":
      return (
        <DepartmentPickerControl
          value={asIdNameList(value)}
          getOuaaClient={host.getOuaaClient}
          multiple={Boolean(item.props?.multiple)}
          placeholder={placeholder || "请选择部门"}
          readonly={readonly}
          onUpdate:value={(next) => onChange(next)}
        />
      );
    case "AlarmRecords": {
      const devices = host.formValues?.[String(item.props?.params ?? "")];
      const period = host.formValues?.[String(item.props?.params2 ?? "")];
      return (
        <AlarmRecordsControl
          client={host.client}
          devices={Array.isArray(devices) ? (devices as Record<string, unknown>[]) : []}
          period={Array.isArray(period) ? (period as string[]) : []}
        />
      );
    }
    case "Description":
      return <span style={{ color: String(item.props?.color ?? "#B1B1B1") }}>{String(item.props?.placeholder ?? item.title ?? "")}</span>;
    case "TextInput":
    default:
      if (readonly) {
        const text = typeof value === "object" && value ? String((value as { name?: string }).name ?? "") : String(value ?? "");
        return <span style={{ lineHeight: "32px" }}>{text || "--"}</span>;
      }
      return (
        <Input
          value={String(value ?? "")}
          maxlength={500}
          placeholder={placeholder || `请输入${item.title ?? ""}`}
          onUpdate:value={(next: string) => onChange(next)}
          onKeyup={(event: KeyboardEvent) => {
            if (
              name === "TextInput" &&
              typeof item.props?.onkeyup === "string" &&
              item.props.onkeyup &&
              event.target instanceof HTMLInputElement
            ) {
              onChange(event.target.value.replace(item.props.onkeyup, ""));
            }
          }}
        />
      );
  }
}
