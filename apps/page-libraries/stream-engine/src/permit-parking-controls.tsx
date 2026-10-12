import type { FileClient } from "@g2-contract/file";
import {
  Button,
  DeleteOutlined,
  Empty,
  Input,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Spin,
  Textarea,
  Upload,
  message,
  type UploadRequestOption,
} from "@g2-platform/pc-ui";
import { defineComponent, ref, watch, type PropType, type VNode } from "vue";

import { fileSceneForBusiness } from "./file-scene";
import type { FormControlHost } from "./form-controls";
import type { FormSchemaItem } from "./form-schema";
import {
  effectiveWorkPermitItems,
  mergeWorkPermitItems,
  parseWorkPermitRecognition,
  workPermitItemKey,
  type WorkPermitItem,
} from "./permit-parking-model";

import styles from "./permit-parking-controls.module.css";

type Named = { id: string; name: string };
type WorkType = { id: string | number; typeName: string };
type WorkKind = "RISK_CHECK" | "ACCEPTANCE";
type ParkingVehicle = { vehicleNo?: string; customerName?: string; customerMobile?: string };
type WorkItem = WorkPermitItem;

export interface PermitParkingClient {
  listWorkPermitTypes(params?: { typeName?: string }): Promise<unknown[]>;
  listWorkPermitLevels(params?: { typeName?: string }): Promise<unknown[]>;
  pageWorkPermitItems(
    kind: WorkKind,
    params: { pageNumber: number; pageSize: number; typeName?: string; workPermitLevel?: string },
  ): Promise<{ records: unknown[]; total: number }>;
  recognizeWorkPermitItem(payload: { itemContent: string; fileIds: string[] }): Promise<unknown>;
  pageParkingVehicles(params: { pageNumber: number; pageSize: number; vehicleNo?: string }): Promise<{ records: unknown[]; total: number }>;
  listParkingLots(): Promise<unknown[]>;
}

type ControlHost = FormControlHost & { client: PermitParkingClient };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function relatedValue(host: ControlHost, key: unknown): unknown {
  if (!key) return undefined;
  const field = String(key);
  for (let index = (host.rowChain?.length ?? 0) - 1; index >= 0; index--) {
    const row = host.rowChain?.[index];
    if (row && Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  }
  return (host.rootFormValues ?? host.formValues ?? {})[field];
}

function relatedText(value: unknown, ...fields: string[]): string {
  if (typeof value === "string") return value;
  const entry = record(value);
  return String(fields.map((field) => entry[field]).find((field) => field != null && field !== "") ?? "");
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const WorkPermitTypeControl = defineComponent({
  props: {
    value: { type: Object as PropType<WorkType | null>, default: null },
    client: { type: Object as PropType<PermitParkingClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<WorkType[]>([]);
    const loading = ref(false);
    let version = 0;
    watch(
      () => props.value,
      (value) => {
        if (value?.id != null && !options.value.some((option) => String(option.id) === String(value.id))) {
          options.value = [value, ...options.value];
        }
      },
      { immediate: true },
    );
    const load = async (keyword = "") => {
      const current = ++version;
      loading.value = true;
      try {
        const rows = await props.client.listWorkPermitTypes({ typeName: keyword });
        if (current === version) {
          const remote = rows
            .map((row) => {
              const entry = record(row);
              return {
                id: typeof entry.id === "number" ? entry.id : String(entry.id ?? ""),
                typeName: String(entry.typeName ?? entry.name ?? ""),
              };
            })
            .filter((row) => row.id && row.typeName);
          options.value =
            props.value?.id != null && !remote.some((row) => String(row.id) === String(props.value?.id))
              ? [props.value, ...remote]
              : remote;
        }
      } catch (error) {
        if (current === version) message.error(errorText(error, "作业类型加载失败"));
      } finally {
        if (current === version) loading.value = false;
      }
    };
    watch(
      () => props.readonly,
      (readonly) => {
        if (!readonly) void load();
      },
      { immediate: true },
    );
    return () =>
      props.readonly ? (
        <span>{props.value?.typeName || "--"}</span>
      ) : (
        <Select
          value={props.value?.id}
          showSearch
          filterOption={false}
          allowClear
          loading={loading.value}
          style={{ width: "100%" }}
          placeholder="请选择作业类型"
          options={options.value.map((row) => ({ label: row.typeName, value: row.id }))}
          onSearch={(keyword: string) => void load(keyword)}
          onUpdate:value={(id) => emit("update:value", options.value.find((row) => String(row.id) === String(id)) ?? null)}
        />
      );
  },
});

const WorkPermitLevelControl = defineComponent({
  props: {
    value: { type: String as PropType<string | null>, default: null },
    typeName: { type: String, default: "" },
    client: { type: Object as PropType<PermitParkingClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<string[]>([]);
    const loading = ref(false);
    let version = 0;
    watch(
      () => [props.typeName, props.readonly] as const,
      async ([typeName, readonly], previous) => {
        if (previous && previous[0] !== typeName && props.value) emit("update:value", null);
        if (readonly) {
          version++;
          loading.value = false;
          return;
        }
        const current = ++version;
        loading.value = true;
        try {
          const rows = await props.client.listWorkPermitLevels(typeName ? { typeName } : undefined);
          if (current === version) options.value = rows.map((row) => String(row));
        } catch (error) {
          if (current === version) message.error(errorText(error, "作业等级加载失败"));
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () =>
      props.readonly ? (
        <span>{props.value || "--"}</span>
      ) : (
        <Select
          value={props.value ?? undefined}
          showSearch
          allowClear
          loading={loading.value}
          style={{ width: "100%" }}
          placeholder="请选择作业等级"
          options={options.value.map((name) => ({ label: name, value: name }))}
          onUpdate:value={(next) => emit("update:value", next == null ? null : String(next))}
        />
      );
  },
});

const WorkPermitItemsControl = defineComponent({
  props: {
    value: { type: Array as PropType<WorkItem[]>, default: () => [] },
    kind: { type: String as PropType<WorkKind>, required: true },
    typeName: { type: String, default: "" },
    level: { type: String, default: "" },
    client: { type: Object as PropType<PermitParkingClient>, required: true },
    getFileClient: { type: Function as PropType<() => Promise<FileClient>>, default: undefined },
    businessType: { type: String, default: "" },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const rows = ref<WorkItem[]>([]);
    const loading = ref(false);
    const confirmOpen = ref(false);
    const confirming = ref(false);
    const recognizing = ref(false);
    const activeUploads = ref(0);
    const currentKey = ref("");
    const result = ref<"NORMAL" | "ABNORMAL">("NORMAL");
    const description = ref("");
    const attachments = ref<NonNullable<WorkItem["attachments"]>>([]);
    let version = 0;
    let aiVersion = 0;
    let uploadVersion = 0;
    let loadedDependency = "";
    const label = () => (props.kind === "ACCEPTANCE" ? "验收项" : "检查项");
    const keyOf = workPermitItemKey;
    const selected = () => effectiveWorkPermitItems(props.value);
    const display = () => {
      const byKey = new Map<string, WorkItem>();
      for (const row of rows.value) byKey.set(keyOf(row), row);
      for (const row of props.value) byKey.set(keyOf(row), { ...byKey.get(keyOf(row)), ...row });
      return [...byKey.values()];
    };
    const update = (item: WorkItem, patch: Partial<WorkItem>) => {
      let found = false;
      const next = props.value.map((entry) => {
        if (keyOf(entry) !== keyOf(item)) return entry;
        found = true;
        return { ...entry, ...patch };
      });
      if (!found) next.push({ ...item, ...patch });
      emit("update:value", next);
    };
    const load = async (force = false) => {
      const current = ++version;
      if (props.readonly) {
        rows.value = [];
        loading.value = false;
        return;
      }
      if (!force && props.value.some((item) => !item.custom)) {
        rows.value = props.value.filter((item) => !item.custom);
        loading.value = false;
        return;
      }
      loading.value = true;
      try {
        const page = await props.client.pageWorkPermitItems(props.kind, {
          pageNumber: 1,
          pageSize: 1000,
          typeName: props.typeName || undefined,
          workPermitLevel: props.level || undefined,
        });
        if (current !== version) return;
        const remote = page.records.filter((row): row is WorkItem => Boolean(row) && typeof row === "object" && !Array.isArray(row));
        rows.value = remote;
        emit("update:value", mergeWorkPermitItems(remote, props.value));
      } catch (error) {
        if (current === version) message.error(errorText(error, `${label()}加载失败`));
      } finally {
        if (current === version) loading.value = false;
      }
    };
    watch(
      () => [props.kind, props.typeName, props.level, props.readonly] as const,
      () => {
        const dependency = `${props.kind}:${props.typeName}:${props.level}`;
        const force = Boolean(loadedDependency && loadedDependency !== dependency);
        loadedDependency = dependency;
        void load(force);
      },
      { immediate: true },
    );
    const openConfirm = (item: WorkItem) => {
      aiVersion++;
      uploadVersion++;
      recognizing.value = false;
      activeUploads.value = 0;
      currentKey.value = keyOf(item);
      result.value = item.confirmResult ?? "NORMAL";
      description.value = item.description ?? "";
      attachments.value = [...(item.attachments ?? [])];
      confirmOpen.value = true;
    };
    const currentItem = () => display().find((item) => keyOf(item) === currentKey.value);
    const saveConfirm = () => {
      const item = currentItem();
      if (!item) return;
      if (activeUploads.value > 0 || recognizing.value) {
        message.warning(activeUploads.value > 0 ? "附件上传中" : "AI识别中");
        return;
      }
      confirming.value = true;
      try {
        aiVersion++;
        uploadVersion++;
        update(item, {
          confirmResult: result.value,
          description: description.value.trim(),
          attachments: [...attachments.value],
          confirmSource: "MANUAL",
          aiRecognitionStatus: undefined,
          aiRecognitionMessage: undefined,
        });
        confirmOpen.value = false;
      } finally {
        confirming.value = false;
      }
    };
    const upload = async (option: UploadRequestOption) => {
      if (!props.getFileClient) {
        option.onError?.(new Error("文件服务未就绪"));
        return;
      }
      const file = option.file as File;
      if (attachments.value.length + activeUploads.value >= 9 || file.size > 100 * 1024 * 1024) {
        const error = new Error(attachments.value.length + activeUploads.value >= 9 ? "最多上传9个附件" : "附件上传大小不能超过100MB");
        message.warning(error.message);
        option.onError?.(error);
        return;
      }
      const current = uploadVersion;
      activeUploads.value++;
      try {
        const client = await props.getFileClient();
        const sceneCode = fileSceneForBusiness(props.businessType);
        const uploaded = await client.uploadSceneFile({ file, businessKey: "maintain", sceneCode });
        try {
          await client.persistSceneFiles(sceneCode, [uploaded.id]);
        } catch (error) {
          message.warning(errorText(error, "附件持久化失败"));
        }
        if (current !== uploadVersion || !confirmOpen.value) return;
        attachments.value = [...attachments.value, uploaded];
        option.onSuccess?.(uploaded);
      } catch (error) {
        message.error(errorText(error, "上传失败"));
        option.onError?.(error instanceof Error ? error : new Error("上传失败"));
      } finally {
        if (current === uploadVersion) activeUploads.value--;
      }
    };
    const recognize = async () => {
      const item = currentItem();
      if (!item?.aiRecognitionEnabled || recognizing.value) return;
      const fileIds = attachments.value.map((file) => String(file.id ?? "")).filter(Boolean);
      if (!fileIds.length) {
        message.warning("请先上传图片后再进行AI识别");
        return;
      }
      const current = ++aiVersion;
      recognizing.value = true;
      try {
        const response = await props.client.recognizeWorkPermitItem({ itemContent: description.value || item.itemName || "", fileIds });
        if (current !== aiVersion || !confirmOpen.value) return;
        const recognition = parseWorkPermitRecognition(response);
        if (recognition.status !== "SUCCESS") {
          update(item, {
            attachments: [...attachments.value],
            confirmSource: "AI",
            aiRecognitionStatus: recognition.status,
            aiRecognitionMessage: recognition.message,
          });
          message.warning(`${recognition.status === "FAILED" ? "AI识别失败" : "AI未识别"}：${recognition.message}`);
        } else {
          update(item, {
            confirmResult: recognition.result,
            description: recognition.description,
            attachments: [...attachments.value],
            confirmSource: "AI",
            aiRecognitionStatus: "SUCCESS",
            aiRecognitionMessage: undefined,
          });
          message.success("AI识别完成");
        }
        confirmOpen.value = false;
      } catch (error) {
        if (current !== aiVersion || !confirmOpen.value) return;
        update(item, {
          attachments: [...attachments.value],
          confirmSource: "AI",
          aiRecognitionStatus: "FAILED",
          aiRecognitionMessage: "AI识别失败，请手动确认",
        });
        message.error(errorText(error, "AI识别失败，请手动确认"));
      } finally {
        if (current === aiVersion) recognizing.value = false;
      }
    };
    const renderDetail = (item: WorkItem) =>
      item.confirmResult || item.description || item.attachments?.length || item.aiRecognitionStatus ? (
        <div class={styles.confirmDetail}>
          <div>结果：{item.confirmResult === "NORMAL" ? "正常" : item.confirmResult === "ABNORMAL" ? "异常" : "--"}</div>
          <div>备注：{item.description || "--"}</div>
          {item.attachments?.length ? (
            <div class={styles.images}>
              {item.attachments.map((file, index) => (
                <img key={String(file.id ?? index)} src={String(file.path ?? file.url ?? "")} alt="确认图片" />
              ))}
            </div>
          ) : null}
          {item.aiRecognitionStatus && item.aiRecognitionStatus !== "SUCCESS" ? (
            <div class={styles.aiStatus}>
              {item.aiRecognitionStatus === "FAILED" ? "AI识别失败" : "AI未识别"}：{item.aiRecognitionMessage || "请手动确认"}
            </div>
          ) : null}
        </div>
      ) : null;
    return () => {
      const visible = props.readonly ? selected() : display();
      if (props.readonly && !visible.length) return <span>--</span>;
      const confirmed = selected().filter((item) => item.confirmResult);
      const abnormal = confirmed.filter((item) => item.confirmResult === "ABNORMAL");
      return (
        <div class={styles.items}>
          {!props.readonly ? (
            <div class={styles.summary}>
              <span>
                确认项 {confirmed.length}；异常 {abnormal.length}；AI异常项 {abnormal.filter((item) => item.confirmSource === "AI").length}
              </span>
              <Button
                type="primary"
                size="small"
                onClick={() =>
                  emit("update:value", [
                    ...props.value,
                    { id: crypto.randomUUID(), itemName: "", typeName: props.typeName, workPermitLevel: props.level, custom: true },
                  ])
                }
              >
                添加{label()}
              </Button>
            </div>
          ) : null}
          <Spin spinning={loading.value}>
            <div class={styles.rows}>
              {visible.length ? (
                visible.map((item, index) => (
                  <div
                    class={[styles.row, item.confirmResult || props.readonly ? styles.checked : "", item.custom ? styles.manual : ""]}
                    key={keyOf(item)}
                  >
                    <span class={styles.index}>{index + 1}</span>
                    <div class={styles.rowBody}>
                      {item.custom && !props.readonly ? (
                        <Input
                          value={item.itemName ?? ""}
                          placeholder={`请输入${label()}内容`}
                          onUpdate:value={(next: string) => update(item, { itemName: next })}
                        />
                      ) : (
                        <span>
                          {item.itemName || `#${item.id ?? ""}`}
                          {item.aiRecognitionEnabled ? <span class={styles.aiBadge}>AI</span> : null}
                        </span>
                      )}
                      {renderDetail(item)}
                    </div>
                    {!props.readonly ? (
                      <>
                        <Button type="primary" size="small" onClick={() => openConfirm(item)}>
                          {item.confirmResult ? "编辑" : "确认"}
                        </Button>
                        {item.custom ? (
                          <Button
                            type="text"
                            danger
                            aria-label={`移除${label()}`}
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              emit(
                                "update:value",
                                props.value.filter((entry) => keyOf(entry) !== keyOf(item)),
                              )
                            }
                          />
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ))
              ) : (
                <Empty description={`暂无${label()}`} />
              )}
            </div>
          </Spin>
          <Modal
            open={confirmOpen.value}
            title={`${label()}确认`}
            okText="确定"
            cancelText="取消"
            confirmLoading={confirming.value}
            onOk={saveConfirm}
            onCancel={() => {
              aiVersion++;
              uploadVersion++;
              recognizing.value = false;
              activeUploads.value = 0;
              confirmOpen.value = false;
            }}
          >
            <div class={styles.confirmForm}>
              <label>
                结果{" "}
                <RadioGroup
                  value={result.value}
                  onUpdate:value={(next) => {
                    result.value = next as "NORMAL" | "ABNORMAL";
                  }}
                >
                  <Radio value="NORMAL">正常</Radio>
                  <Radio value="ABNORMAL">异常</Radio>
                </RadioGroup>
              </label>
              <label>
                备注{" "}
                <Textarea
                  value={description.value}
                  rows={4}
                  placeholder="请输入确认备注"
                  onUpdate:value={(next: string) => {
                    description.value = next;
                  }}
                />
              </label>
              <label>
                附件{" "}
                <span class={styles.uploadLine}>
                  <Upload
                    customRequest={upload}
                    showUploadList={false}
                    multiple
                    accept="image/*"
                    disabled={!props.getFileClient || attachments.value.length + activeUploads.value >= 9}
                  >
                    <Button loading={activeUploads.value > 0}>上传图片</Button>
                  </Upload>
                  {currentItem()?.aiRecognitionEnabled ? (
                    <Button type="primary" loading={recognizing.value} disabled={activeUploads.value > 0} onClick={() => void recognize()}>
                      AI识别
                    </Button>
                  ) : null}
                </span>
              </label>
              {attachments.value.length ? (
                <div class={styles.attachmentList}>
                  {attachments.value.map((file, index) => (
                    <div key={String(file.id ?? index)}>
                      {file.path || file.url ? (
                        <a href={String(file.path ?? file.url)} target="_blank" rel="noopener noreferrer">
                          {file.name || `附件${index + 1}`}
                        </a>
                      ) : (
                        <span>{file.name || `附件${index + 1}`}</span>
                      )}
                      <Button
                        type="text"
                        danger
                        aria-label="移除附件"
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          attachments.value = attachments.value.filter((_, at) => at !== index);
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Modal>
        </div>
      );
    };
  },
});

const ObjectSelectControl = defineComponent({
  props: {
    value: { type: Object as PropType<Named | null>, default: null },
    options: { type: Array as PropType<Named[]>, required: true },
    placeholder: { type: String, required: true },
    readonly: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    return () =>
      props.readonly ? (
        <span>{props.options.find((option) => option.id === props.value?.id)?.name || props.value?.name || "--"}</span>
      ) : (
        <Select
          value={props.value?.id}
          allowClear
          showSearch
          loading={props.loading}
          style={{ width: "100%" }}
          placeholder={props.placeholder}
          options={props.options.map((option) => ({ label: option.name, value: option.id }))}
          onUpdate:value={(next) => emit("update:value", props.options.find((option) => option.id === String(next)) ?? null)}
        />
      );
  },
});

const ParkingLotControl = defineComponent({
  props: {
    value: { type: Object as PropType<Named | null>, default: null },
    client: { type: Object as PropType<PermitParkingClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<Named[]>([]);
    const loading = ref(false);
    let version = 0;
    watch(
      () => props.readonly,
      async () => {
        const current = ++version;
        loading.value = true;
        try {
          const rows = await props.client.listParkingLots();
          if (current !== version) return;
          options.value = rows
            .map((row) => {
              const entry = record(row);
              return { id: String(entry.code ?? ""), name: String(entry.name ?? "") };
            })
            .filter((row) => row.id && row.name);
        } catch (error) {
          if (current === version) message.error(errorText(error, "停车场加载失败"));
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () => (
      <ObjectSelectControl
        value={props.value}
        options={options.value}
        placeholder="请选择停车场"
        readonly={props.readonly}
        loading={loading.value}
        onUpdate:value={(next) => emit("update:value", next)}
      />
    );
  },
});

const VehicleNumberControl = defineComponent({
  props: {
    value: { type: String as PropType<string | null>, default: null },
    client: { type: Object as PropType<PermitParkingClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<Array<{ label: string; value: string }>>([]);
    const loading = ref(false);
    const keyword = ref("");
    const page = ref(1);
    const total = ref(0);
    let version = 0;
    const load = async (text: string, more = false) => {
      if (!text) {
        version++;
        options.value = [];
        total.value = 0;
        loading.value = false;
        return;
      }
      if (more && loading.value) return;
      const current = ++version;
      keyword.value = text;
      if (!more) {
        page.value = 1;
        options.value = [{ label: text, value: text }];
      }
      loading.value = true;
      try {
        const result = await props.client.pageParkingVehicles({ pageNumber: page.value, pageSize: 20, vehicleNo: text });
        if (current !== version) return;
        total.value = result.total;
        const next = result.records
          .map((raw) => {
            const row = record(raw);
            return { label: `${row.vehicleNo ?? ""} - ${row.customerName ?? ""}`, value: String(row.vehicleNo ?? "") };
          })
          .filter((row) => row.value);
        const merged = more ? [...options.value, ...next] : [{ label: text, value: text }, ...next];
        options.value = [...new Map(merged.map((option) => [option.value, option])).values()];
      } catch (error) {
        if (current === version) message.error(errorText(error, "车辆加载失败"));
      } finally {
        if (current === version) loading.value = false;
      }
    };
    return () =>
      props.readonly ? (
        <span>{props.value || "--"}</span>
      ) : (
        <Select
          value={props.value ?? undefined}
          showSearch
          filterOption={false}
          allowClear
          loading={loading.value}
          optionLabelProp="value"
          showArrow={false}
          defaultActiveFirstOption={false}
          style={{ width: "100%" }}
          placeholder="请输入车牌号码"
          options={options.value}
          onSearch={(text: string) => void load(text)}
          onPopupScroll={(event: Event) => {
            const element = event.target as HTMLElement;
            if (element.scrollTop + element.clientHeight < element.scrollHeight - 10 || loading.value || page.value * 20 >= total.value)
              return;
            page.value += 1;
            void load(keyword.value, true);
          }}
          onUpdate:value={(next) => emit("update:value", next == null ? null : String(next))}
        />
      );
  },
});

const VehicleOwnerControl = defineComponent({
  props: {
    value: { type: String as PropType<string | null>, default: null },
    vehicleNo: { type: String, default: "" },
    field: { type: String as PropType<"customerName" | "customerMobile">, required: true },
    client: { type: Object as PropType<PermitParkingClient>, required: true },
    readonly: { type: Boolean, default: false },
  },
  emits: ["update:value"],
  setup(props, { emit }) {
    const loading = ref(false);
    let version = 0;
    watch(
      () => [props.vehicleNo, props.readonly] as const,
      async ([vehicleNo, readonly]) => {
        const current = ++version;
        if (!vehicleNo || readonly) {
          loading.value = false;
          return;
        }
        loading.value = true;
        try {
          const page = await props.client.pageParkingVehicles({ pageNumber: 1, pageSize: 20, vehicleNo });
          const vehicles = page.records.map((row) => record(row) as ParkingVehicle);
          const vehicle = vehicles.find((row) => row.vehicleNo === vehicleNo) ?? vehicles[0];
          if (current === version && vehicle?.[props.field]) emit("update:value", String(vehicle[props.field]));
        } catch (error) {
          if (current === version) message.error(errorText(error, "车主信息加载失败"));
        } finally {
          if (current === version) loading.value = false;
        }
      },
      { immediate: true },
    );
    return () =>
      props.readonly ? (
        <span>{props.value || "--"}</span>
      ) : (
        <Input
          value={props.value ?? ""}
          placeholder={props.field === "customerMobile" ? "请输入车主联系方式" : "请输入车主姓名"}
          suffix={loading.value ? <Spin size="small" /> : undefined}
          onUpdate:value={(next: string) => {
            version++;
            loading.value = false;
            emit("update:value", next);
          }}
        />
      );
  },
});

const PARKING_LEVELS: Named[] = [
  { id: "GENERAL", name: "一般" },
  { id: "SERIOUS", name: "严重" },
  { id: "LIGHT", name: "轻微" },
  { id: "FATAL", name: "致命" },
];
const PLATE_COLORS: Named[] = [
  { id: "BLUE", name: "蓝色" },
  { id: "YELLOW", name: "黄色" },
  { id: "GREEN", name: "绿色" },
  { id: "BLACK", name: "黑色" },
  { id: "WHITE", name: "白色" },
  { id: "OTHER", name: "其他" },
];

function namedValue(value: unknown): Named | null {
  const entry = record(value);
  return entry.id == null ? null : { id: String(entry.id), name: String(entry.name ?? "") };
}

export function renderPermitParkingControl(
  item: FormSchemaItem,
  value: unknown,
  onChange: (next: unknown) => void,
  host: ControlHost,
): VNode | undefined {
  const name = String(item.name ?? "");
  const readonly = Boolean(host.readonly);
  const client = host.client;
  switch (name) {
    case "WorkPermitTypeSelect":
      return (
        <WorkPermitTypeControl
          value={
            value && typeof value === "object"
              ? {
                  id: typeof record(value).id === "number" ? (record(value).id as number) : String(record(value).id ?? ""),
                  typeName: String(record(value).typeName ?? record(value).name ?? ""),
                }
              : null
          }
          client={client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "WorkPermitLevelSelect":
      return (
        <WorkPermitLevelControl
          value={typeof value === "string" ? value : null}
          typeName={relatedText(relatedValue(host, item.props?.params), "typeName", "name")}
          client={client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "WorkPermitRiskCheckItems":
    case "WorkPermitAcceptanceItems":
      return (
        <WorkPermitItemsControl
          value={Array.isArray(value) ? (value as WorkItem[]) : []}
          kind={name === "WorkPermitAcceptanceItems" ? "ACCEPTANCE" : "RISK_CHECK"}
          typeName={relatedText(relatedValue(host, item.props?.params), "typeName", "name")}
          level={relatedText(relatedValue(host, item.props?.params2), "workPermitLevel", "name", "label")}
          client={client}
          getFileClient={host.getFileClient}
          businessType={host.businessType}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "ParkingLevelSelect":
      return (
        <ObjectSelectControl
          value={namedValue(value)}
          options={PARKING_LEVELS}
          placeholder="请选择违停程度"
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "ViolatorCarNumber":
      return (
        <VehicleNumberControl
          value={typeof value === "string" ? value : null}
          client={client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "ViolatorName":
    case "ViolatorPhone":
      return (
        <VehicleOwnerControl
          value={typeof value === "string" ? value : null}
          vehicleNo={relatedText(relatedValue(host, item.props?.params))}
          field={name === "ViolatorPhone" ? "customerMobile" : "customerName"}
          client={client}
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    case "ParkingLotSelect":
      return <ParkingLotControl value={namedValue(value)} client={client} readonly={readonly} onUpdate:value={onChange} />;
    case "CarPlateColorSelect":
      return (
        <ObjectSelectControl
          value={namedValue(value)}
          options={PLATE_COLORS}
          placeholder="请选择车牌颜色"
          readonly={readonly}
          onUpdate:value={onChange}
        />
      );
    default:
      return undefined;
  }
}
