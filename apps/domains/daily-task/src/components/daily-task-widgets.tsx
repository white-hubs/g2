// 日常任务领域专属的选择、上传和内容编辑组件。
import { getCurrentDailyType } from "@g2-client/daily-task/client";
import { computed, defineComponent, onMounted, ref, watch } from "vue";

import { getDailyTaskClient, getFileClient, getOuaaClient } from "../domain-context";
import { Button, Image, Input, InputNumber, Select, Space, Table, Textarea, message, usePcModal } from "@/pc-ui-runtime";

export const GLOBAL_SCENE_CODE = { dailyTask: "DAILY_TASK" } as const;

export const ParticipateType = {
  USER: "USER",
  DEPT: "DEPT",
  POST: "POST",
  ROLE: "ROLE",
  GRID_AREA: "GRID_AREA",
} as const;

export enum TargetType {
  AREA = "AREA",
  DEVICE = "DEVICE",
  PROPERTY = "PROPERTY",
  STALL = "STALL",
  SITE_POINT = "SITE_POINT",
  PATROL_POINT = "PATROL_POINT",
  RISK_SOURCE = "RISK_SOURCE",
  SMALL_ENGINEERING = "SMALL_ENGINEERING",
}

const TARGET_LABELS: Record<TargetType, string> = {
  [TargetType.AREA]: "区域",
  [TargetType.DEVICE]: "设备",
  [TargetType.PROPERTY]: "资产",
  [TargetType.STALL]: "档位",
  [TargetType.SITE_POINT]: "现场点",
  [TargetType.PATROL_POINT]: "巡更点",
  [TargetType.RISK_SOURCE]: "风险源",
  [TargetType.SMALL_ENGINEERING]: "小散工程",
};

export function getTargetTypeLabel(type: TargetType): string {
  return TARGET_LABELS[type] ?? String(type);
}

export interface StandardItemContent {
  itemId?: string;
  itemName?: string;
  itemContent?: string;
  operationGuide?: string;
  resultId?: string;
  resultName?: string;
  defaultResultItem?: string;
  mustTakePhotoResultItems?: string[];
  mustRemarkResultItems?: string[];
  tag?: string;
  source: "new" | "called";
  [key: string]: unknown;
}

export interface ResponsibleObjectItem {
  key: string;
  type: "USER" | "CONDITION";
  userIds: string[];
  userOptions: { id: string; name: string }[];
  exceptionUserIds: string[];
  exceptionUserOptions: { id: string; name: string }[];
  deptIds: string[];
  deptOptions: { id: string; name: string }[];
  postIds: string[];
  postOptions: { id: string; name: string }[];
  roleIds: string[];
  roleOptions: { id: string; name: string }[];
  gridAreaIds: string[];
  gridAreaOptions: { id: string; name: string }[];
}

export interface AdvancedResultItem {
  targetId: string;
  targetName: string;
  targetCode: string;
  targetCategory: TargetType;
  tagIds: string[];
  tagNames: string;
  participateCondition?: unknown;
}

function unwrapPage(raw: unknown): { records: unknown[]; total: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const records = (nested.records ?? nested.list ?? nested.rows ?? data.records ?? data.list ?? raw) as unknown;
  return {
    records: Array.isArray(records) ? records : [],
    total: Number(nested.total ?? data.total ?? (Array.isArray(records) ? records.length : 0)),
  };
}

function recordId(record: Record<string, unknown>): string {
  return String(record.id ?? record.userId ?? record.targetId ?? record.itemId ?? record.standardId ?? "");
}

function recordName(record: Record<string, unknown>): string {
  return String(record.name ?? record.userName ?? record.targetName ?? record.itemName ?? record.standardName ?? record.label ?? "--");
}

function createRemoteSelect(name: string, loader: () => Promise<unknown>) {
  return defineComponent({
    name,
    inheritAttrs: false,
    props: ["value", "multiple", "disabled", "placeholder", "width"],
    emits: ["update:value", "change"],
    setup(props, { attrs, emit }) {
      const options = ref<{ label: string; value: string }[]>([]);
      const loading = ref(false);
      const load = async () => {
        loading.value = true;
        try {
          const page = unwrapPage(await loader());
          options.value = page.records.map((raw) => {
            const row = raw as Record<string, unknown>;
            return { label: recordName(row), value: recordId(row) };
          });
        } catch (error) {
          message.error(error instanceof Error ? error.message : "选项加载失败");
        } finally {
          loading.value = false;
        }
      };
      onMounted(() => void load());
      return () => (
        <Select
          {...attrs}
          value={props.value}
          mode={props.multiple ? "multiple" : undefined}
          disabled={props.disabled}
          placeholder={props.placeholder}
          style={{ width: props.width ?? "100%" }}
          options={options.value}
          loading={loading.value}
          onDropdownVisibleChange={(open: boolean) => open && options.value.length === 0 && void load()}
          onUpdate:value={(value: unknown) => emit("update:value", value)}
          onChange={(value: unknown, option: unknown) => emit("change", value, option)}
        />
      );
    },
  });
}

export const DailyTaskTypeSelect = createRemoteSelect("DailyTaskTypeSelect", () =>
  getDailyTaskClient().getTaskCategoryPage({ dailyType: getCurrentDailyType(), pageNumber: 1, pageSize: 999 }),
);

export const DailyTaskUrgencySelect = createRemoteSelect("DailyTaskUrgencySelect", () =>
  getDailyTaskClient().getUrgencyPage({ dailyType: getCurrentDailyType(), pageNumber: 1, pageSize: 999 }),
);

export const DailyTaskCreateCycle = createRemoteSelect("DailyTaskCreateCycle", () =>
  getDailyTaskClient().getTaskCyclePage({ dailyType: getCurrentDailyType(), pageNumber: 1, pageSize: 999 }),
);

export const DailyTaskTimeLimit = defineComponent({
  name: "DailyTaskTimeLimit",
  props: ["value", "disabled"],
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const current = computed(() => props.value ?? { day: 0, hour: 0, minute: 0 });
    const update = (key: string, value: number) => {
      const next = { ...current.value, [key]: Number(value ?? 0) };
      emit("update:value", next);
      emit("change", next);
    };
    return () => (
      <Space>
        <InputNumber min={0} value={current.value.day} disabled={props.disabled} onUpdate:value={(v) => update("day", Number(v ?? 0))} /> 天
        <InputNumber
          min={0}
          max={23}
          value={current.value.hour}
          disabled={props.disabled}
          onUpdate:value={(v) => update("hour", Number(v ?? 0))}
        />{" "}
        时
        <InputNumber
          min={0}
          max={59}
          value={current.value.minute}
          disabled={props.disabled}
          onUpdate:value={(v) => update("minute", Number(v ?? 0))}
        />{" "}
        分
      </Space>
    );
  },
});

function normalizeFile(raw: unknown): Record<string, unknown> | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const id = String(data.id ?? data.ossId ?? "");
  return id ? { ...data, id } : null;
}

export const FileUpload = defineComponent({
  name: "DailyTaskFileUpload",
  props: ["value", "multiple", "readonly", "sceneCode", "max"],
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const input = ref<HTMLInputElement | null>(null);
    const uploading = ref(false);
    const files = computed(() => (Array.isArray(props.value) ? props.value : []));
    const update = (next: unknown[]) => {
      emit("update:value", next);
      emit("change", next);
    };
    const pick = async (event: Event) => {
      const element = event.target as HTMLInputElement;
      const selected = Array.from(element.files ?? []);
      element.value = "";
      if (selected.length === 0) {
        return;
      }
      uploading.value = true;
      try {
        const client = await getFileClient();
        const uploaded: unknown[] = [];
        for (const file of selected) {
          const form = new FormData();
          form.append("sceneCode", String(props.sceneCode ?? GLOBAL_SCENE_CODE.dailyTask));
          form.append("businessKey", "daily-task");
          form.append("file", file);
          const normalized = normalizeFile(await client.uploadFile(form));
          if (normalized) {
            uploaded.push(normalized);
          }
        }
        update([...files.value, ...uploaded]);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "上传失败");
      } finally {
        uploading.value = false;
      }
    };
    return () => (
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {files.value.map((raw: Record<string, unknown>) => (
          <div key={String(raw.id)} style={{ position: "relative" }}>
            {raw.path || raw.url ? (
              <Image width={88} height={88} src={String(raw.path ?? raw.url)} />
            ) : (
              <span>{String(raw.name ?? raw.id)}</span>
            )}
            {!props.readonly ? (
              <Button type="link" danger size="small" onClick={() => update(files.value.filter((item) => item !== raw))}>
                删除
              </Button>
            ) : null}
          </div>
        ))}
        {!props.readonly && files.value.length < Number(props.max ?? 20) ? (
          <Button loading={uploading.value} onClick={() => input.value?.click()}>
            上传附件
          </Button>
        ) : null}
        <input ref={input} type="file" multiple={props.multiple} style={{ display: "none" }} onChange={(e) => void pick(e)} />
      </div>
    );
  },
});

async function loadUsers(keyword = ""): Promise<Record<string, unknown>[]> {
  const raw = await (await getOuaaClient()).listUsers({ pageNumber: 1, pageSize: 200, keyword });
  return unwrapPage(raw).records as Record<string, unknown>[];
}

export const UserSelectTable = defineComponent({
  name: "DailyTaskUserSelectTable",
  props: ["multiple", "selectedKeys"],
  emits: ["selectionChange"],
  setup(props, { emit }) {
    const data = ref<Record<string, unknown>[]>([]);
    const selected = ref<string[]>(Array.isArray(props.selectedKeys) ? props.selectedKeys : []);
    onMounted(async () => {
      try {
        data.value = await loadUsers();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "人员加载失败");
      }
    });
    watch(
      () => props.selectedKeys,
      (value) => (selected.value = Array.isArray(value) ? value.map(String) : []),
    );
    return () => (
      <Table
        rowKey={(row: Record<string, unknown>) => recordId(row)}
        columns={[
          { title: "姓名", dataIndex: "name", customRender: ({ record }) => recordName(record) },
          { title: "账号", dataIndex: "username" },
          { title: "组织", dataIndex: "organizationName" },
        ]}
        dataSource={data.value}
        pagination={{ pageSize: 10 }}
        rowSelection={{
          type: props.multiple === false ? "radio" : "checkbox",
          selectedRowKeys: selected.value,
          onChange: (keys: unknown[], rows: unknown[]) => {
            selected.value = keys.map(String);
            emit("selectionChange", rows);
          },
        }}
      />
    );
  },
});

export const UserFusionSelect = defineComponent({
  name: "DailyTaskUserFusionSelect",
  props: ["typeValue", "disabled"],
  emits: ["update:typeValue"],
  setup(props, { emit }) {
    const users = ref<Record<string, unknown>[]>([]);
    onMounted(async () => {
      try {
        users.value = await loadUsers();
      } catch {
        users.value = [];
      }
    });
    return () => (
      <Select
        mode="multiple"
        disabled={props.disabled}
        value={props.typeValue}
        options={users.value.map((user) => ({ label: recordName(user), value: recordId(user) }))}
        onUpdate:value={(value) => emit("update:typeValue", value)}
        style={{ width: "100%" }}
      />
    );
  },
});

export const UserSelectModal = defineComponent({
  name: "DailyTaskUserSelectModal",
  props: ["title", "multiple"],
  emits: ["enter", "cancel"],
  setup(props, { emit, expose }) {
    const selectedRows = ref<unknown[]>([]);
    const [CompatModal, modalApi] = usePcModal({
      title: props.title ?? "选择人员",
      width: "900px",
      onConfirm: () => {
        emit("enter", props.multiple === false ? selectedRows.value[0] : selectedRows.value);
        modalApi.close();
      },
      onCancel: () => {
        modalApi.close();
        emit("cancel");
      },
    });
    expose({ openModal: () => modalApi.open() });
    return () => (
      <CompatModal>
        <UserSelectTable multiple={props.multiple} onSelectionChange={(rows) => (selectedRows.value = rows)} />
      </CompatModal>
    );
  },
});

function emptyResponsible(key = crypto.randomUUID()): ResponsibleObjectItem {
  return {
    key,
    type: "USER",
    userIds: [],
    userOptions: [],
    exceptionUserIds: [],
    exceptionUserOptions: [],
    deptIds: [],
    deptOptions: [],
    postIds: [],
    postOptions: [],
    roleIds: [],
    roleOptions: [],
    gridAreaIds: [],
    gridAreaOptions: [],
  };
}

export const DailyTaskResponsibleObjectList = defineComponent({
  name: "DailyTaskResponsibleObjectList",
  props: ["value", "disabled"],
  emits: ["update:value"],
  setup(props, { emit, expose }) {
    const modal = ref();
    const activeIndex = ref(0);
    const rows = computed<ResponsibleObjectItem[]>(() => (Array.isArray(props.value) ? props.value : []));
    const update = (next: ResponsibleObjectItem[]) => emit("update:value", next);
    const add = () => {
      const next = [...rows.value, emptyResponsible()];
      update(next);
      activeIndex.value = next.length - 1;
      modal.value?.openModal();
    };
    const setUsers = (selected: Record<string, unknown>[] | Record<string, unknown>) => {
      const list = Array.isArray(selected) ? selected : selected ? [selected] : [];
      const next = rows.value.map((row, index) =>
        index === activeIndex.value
          ? {
              ...row,
              type: "USER" as const,
              userIds: list.map(recordId),
              userOptions: list.map((user) => ({ id: recordId(user), name: recordName(user) })),
            }
          : row,
      );
      update(next);
    };
    expose({
      validate: () => ({
        valid: rows.value.length > 0 && rows.value.every((row) => row.userIds.length + row.deptIds.length + row.roleIds.length > 0),
        message: "请选择任务发放成员",
      }),
    });
    return () => (
      <div>
        {rows.value.map((row, index) => (
          <Space key={row.key} style={{ display: "flex", marginBottom: "8px" }}>
            <span>{row.userOptions.map((user) => user.name).join("、") || "未选择人员"}</span>
            {!props.disabled ? (
              <Button
                onClick={() => {
                  activeIndex.value = index;
                  modal.value?.openModal();
                }}
              >
                选择人员
              </Button>
            ) : null}
            {!props.disabled ? (
              <Button danger onClick={() => update(rows.value.filter((_, i) => i !== index))}>
                删除
              </Button>
            ) : null}
          </Space>
        ))}
        {!props.disabled ? (
          <Button type="dashed" onClick={add}>
            添加发放成员
          </Button>
        ) : null}
        <UserSelectModal ref={modal} title="选择人员" multiple onEnter={setUsers} />
      </div>
    );
  },
});

export const DailyTaskResultItem = defineComponent({
  name: "DailyTaskResultItem",
  props: ["value", "disabled"],
  emits: ["update:value"],
  setup(props, { emit, expose }) {
    const rows = computed(() => (Array.isArray(props.value) ? props.value : []));
    const update = (next: unknown[]) => emit("update:value", next);
    expose({ checkData: () => rows.value.length > 0 });
    return () => (
      <div>
        {rows.value.map((raw: Record<string, unknown>, index: number) => (
          <Space key={String(raw.id ?? index)} style={{ display: "flex", marginBottom: "8px" }}>
            <Input
              value={String(raw.label ?? raw.name ?? "")}
              disabled={props.disabled}
              placeholder="结果名称"
              onUpdate:value={(value) => update(rows.value.map((item, i) => (i === index ? { ...item, label: value, name: value } : item)))}
            />
            {!props.disabled ? (
              <Button danger onClick={() => update(rows.value.filter((_, i) => i !== index))}>
                删除
              </Button>
            ) : null}
          </Space>
        ))}
        {!props.disabled ? (
          <Button type="dashed" onClick={() => update([...rows.value, { label: "", value: crypto.randomUUID() }])}>
            添加结果
          </Button>
        ) : null}
      </div>
    );
  },
});

export const StandardItemContentTable = defineComponent({
  name: "DailyTaskStandardItemContentTable",
  props: ["value", "action", "showAdd", "showItemName"],
  emits: ["update:value"],
  setup(props, { emit, expose, slots }) {
    const rows = computed<StandardItemContent[]>(() => (Array.isArray(props.value) ? props.value : []));
    const disabled = computed(() => props.action === "detail");
    const update = (next: StandardItemContent[]) => emit("update:value", next);
    const addContent = () => update([...rows.value, { itemId: undefined, itemName: "", itemContent: "", source: "new" }]);
    expose({
      addContent,
      initContent: (value: StandardItemContent[]) => update(Array.isArray(value) ? value : []),
      checkData: async () => {
        const valid = rows.value.length > 0 && rows.value.every((row) => String(row.itemContent ?? "").trim());
        if (!valid) {
          message.warning("请完善标准项内容");
        }
        return valid;
      },
    });
    return () => (
      <div>
        <Table
          rowKey={(row: StandardItemContent, index?: number) => row.itemId ?? String(index ?? 0)}
          pagination={false}
          dataSource={rows.value}
          columns={[
            ...(props.showItemName === false
              ? []
              : [
                  {
                    title: "标准项",
                    dataIndex: "itemName",
                    customRender: ({ record, index }: { record: StandardItemContent; index: number }) => (
                      <Input
                        disabled={disabled.value}
                        value={record.itemName}
                        onUpdate:value={(v) => update(rows.value.map((row, i) => (i === index ? { ...row, itemName: v } : row)))}
                      />
                    ),
                  },
                ]),
            {
              title: "标准内容",
              dataIndex: "itemContent",
              customRender: ({ record, index }) => (
                <Textarea
                  disabled={disabled.value}
                  value={record.itemContent}
                  onUpdate:value={(v) => update(rows.value.map((row, i) => (i === index ? { ...row, itemContent: v } : row)))}
                />
              ),
            },
            {
              title: "操作",
              width: 90,
              customRender: ({ index }) =>
                !disabled.value ? (
                  <Button type="link" danger onClick={() => update(rows.value.filter((_, i) => i !== index))}>
                    删除
                  </Button>
                ) : null,
            },
          ]}
        />
        {!disabled.value && props.showAdd !== false ? (
          <Button type="dashed" style={{ marginTop: "8px" }} onClick={addContent}>
            新增内容
          </Button>
        ) : null}
        {slots.default?.()}
      </div>
    );
  },
});

function createServiceSelectionModal(name: string, loader: () => Promise<unknown>) {
  return defineComponent({
    name,
    props: ["title"],
    emits: ["enter", "cancel"],
    setup(props, { emit, expose }) {
      const rows = ref<Record<string, unknown>[]>([]);
      const selected = ref<Record<string, unknown>[]>([]);
      const [CompatModal, modalApi] = usePcModal({
        title: props.title,
        width: "900px",
        onConfirm: () => {
          emit("enter", selected.value);
          modalApi.close();
        },
        onCancel: () => {
          emit("cancel");
          modalApi.close();
        },
      });
      const openModal = async () => {
        modalApi.open();
        try {
          rows.value = unwrapPage(await loader()).records as Record<string, unknown>[];
        } catch (error) {
          message.error(error instanceof Error ? error.message : "数据加载失败");
        }
      };
      expose({ openModal });
      return () => (
        <CompatModal>
          <Table
            rowKey={recordId}
            dataSource={rows.value}
            columns={[
              { title: "名称", customRender: ({ record }) => recordName(record) },
              { title: "编码", dataIndex: "code" },
            ]}
            rowSelection={{ onChange: (_keys, selectedRows) => (selected.value = selectedRows) }}
            pagination={{ pageSize: 10 }}
          />
        </CompatModal>
      );
    },
  });
}

export const DailyStandardItemSelectModalTable = createServiceSelectionModal("DailyStandardItemSelectModalTable", () =>
  getDailyTaskClient().getStandardItemPage({ dailyType: getCurrentDailyType(), pageNumber: 1, pageSize: 999 }),
);
export const StandardItemModalTable = DailyStandardItemSelectModalTable;
export const DailyStandardSelectModalTable = createServiceSelectionModal("DailyStandardSelectModalTable", () =>
  getDailyTaskClient().getDailyStandardPage({ dailyType: getCurrentDailyType(), pageNumber: 1, pageSize: 999 }),
);

export const DailyTaskResponsibleObjectEditModal = defineComponent({
  name: "DailyTaskResponsibleObjectEditModal",
  props: ["title"],
  emits: ["enter", "cancel"],
  setup(props, { emit, expose }) {
    const value = ref<Record<string, unknown>>({});
    const [CompatModal, modalApi] = usePcModal({
      title: props.title,
      onConfirm: () => {
        emit("enter", value.value);
        modalApi.close();
      },
      onCancel: () => {
        emit("cancel");
        modalApi.close();
      },
    });
    expose({
      openModal: (initial?: Record<string, unknown>) => {
        value.value = initial ?? {};
        modalApi.open();
      },
    });
    return () => (
      <CompatModal>
        <div>发放成员条件由当前对象配置继承；确认后保存。</div>
      </CompatModal>
    );
  },
});

const TARGET_LOADERS: Record<TargetType, (payload: Record<string, unknown>) => Promise<unknown>> = {
  [TargetType.AREA]: (payload) => getDailyTaskClient().getTagAreaTreeList(payload),
  [TargetType.DEVICE]: (payload) => getDailyTaskClient().getTagDevicePageList(payload),
  [TargetType.PROPERTY]: (payload) => getDailyTaskClient().getTagPropertyPageList(payload),
  [TargetType.STALL]: (payload) => getDailyTaskClient().getTagStallPageList(payload),
  [TargetType.SITE_POINT]: (payload) => getDailyTaskClient().getTagSitePointPageList(payload),
  [TargetType.PATROL_POINT]: (payload) => getDailyTaskClient().getTagPatrolPointPageList(payload),
  [TargetType.RISK_SOURCE]: (payload) => getDailyTaskClient().getTagRiskSourcePageList(payload),
  [TargetType.SMALL_ENGINEERING]: (payload) => getDailyTaskClient().getTagSmallEngineeringPageList(payload),
};

export const DailyObjectSelectModal = defineComponent({
  name: "DailyObjectSelectModal",
  props: ["title", "multiple", "historySelected", "value", "defaultTab", "showTabs"],
  emits: ["enter", "cancel"],
  setup(props, { emit, expose }) {
    const targetType = ref<TargetType>(props.defaultTab ?? TargetType.AREA);
    const rows = ref<Record<string, unknown>[]>([]);
    const selected = ref<Record<string, unknown>[]>([]);
    const [CompatModal, modalApi] = usePcModal({
      title: props.title,
      width: "960px",
      onConfirm: () => {
        const mapped = selected.value.map((row) => ({
          targetId: recordId(row),
          targetName: recordName(row),
          targetCode: String(row.code ?? ""),
          targetCategory: targetType.value,
          tagIds: Array.isArray(row.tagIds) ? row.tagIds : [],
          tagNames: String(row.tagNames ?? ""),
          participateCondition: row.participateCondition ?? {},
        }));
        emit("enter", mapped);
        modalApi.close();
      },
      onCancel: () => {
        emit("cancel");
        modalApi.close();
      },
    });
    const load = async () => {
      rows.value = unwrapPage(await TARGET_LOADERS[targetType.value]({ pageNumber: 1, pageSize: 999 })).records as Record<
        string,
        unknown
      >[];
    };
    expose({
      openModal: async (type?: TargetType) => {
        targetType.value = type ?? props.defaultTab ?? TargetType.AREA;
        modalApi.open();
        try {
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : "对象加载失败");
        }
      },
    });
    return () => (
      <CompatModal>
        <Select
          value={targetType.value}
          options={(props.showTabs?.length ? props.showTabs : Object.values(TargetType)).map((value: TargetType) => ({
            value,
            label: getTargetTypeLabel(value),
          }))}
          style={{ width: "180px", marginBottom: "12px" }}
          onUpdate:value={async (value) => {
            targetType.value = value as TargetType;
            await load();
          }}
        />
        <Table
          rowKey={recordId}
          dataSource={rows.value}
          columns={[
            { title: "名称", customRender: ({ record }) => recordName(record) },
            { title: "编码", dataIndex: "code" },
          ]}
          rowSelection={{
            type: props.multiple === false ? "radio" : "checkbox",
            onChange: (_keys, selectedRows) => (selected.value = selectedRows),
          }}
          pagination={{ pageSize: 10 }}
        />
      </CompatModal>
    );
  },
});

export const CloseOutlined = defineComponent({ name: "DailyTaskCloseIcon", setup: () => () => <span aria-hidden="true">×</span> });
