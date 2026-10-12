// @ts-nocheck -- 迁移兼容层：对旧 cube-app-design API 做本域内的 pc-ui 适配。
import { defineComponent, onMounted, reactive, ref, watch } from "vue";

import { getDailyInspectionClient, getOuaaClient } from "../domain-context";
import {
  cycleOptions,
  executeCycleOptions,
  monthCycleOptions,
  receiveTypeOptions,
  targetCategoryOptions,
  weekCycleOptions,
} from "./constants";
import {
  Button,
  Cascader,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  PageLayout,
  RadioGroup,
  Select,
  Space,
  message,
  usePcForm,
  usePcTable,
} from "@/pc-ui-runtime";

export const CubeLayout = PageLayout;
export const useCubeTable = usePcTable;
export const useCubeForm = usePcForm;
export { ObjectType, targetCategoryOptions, OBJECT_TYPE_LABELS } from "./constants";
export {
  TARGET_CATEGORY_MAP,
  TARGET_CATEGORY_OPTIONS,
  PLAN_STATUS_MAP,
  TASK_STATUS_MAP,
  OBJECT_STATUS_MAP,
  OBJECT_STATUS_COLOR,
  RESULT_OPTIONS,
  LEVEL_OPTIONS,
  INSPECTION_MODE_OPTIONS,
  formatDisplayTime,
  formatLimitTimeJson,
  toIdList,
  joinIds,
} from "./constants";

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

function toCascaderOptions(nodes: unknown[]): { label: string; value: string; children?: unknown[] }[] {
  return (Array.isArray(nodes) ? nodes : []).map((raw) => {
    const node = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const children = node.children;
    return {
      label: recordName(node),
      value: recordId(node),
      children: Array.isArray(children) && children.length ? toCascaderOptions(children) : undefined,
    };
  });
}

function flattenOrgOptions(nodes: unknown[]): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  const walk = (list: unknown[]): void => {
    for (const raw of list) {
      const node = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const id = recordId(node);
      const name = recordName(node);
      if (id) result.push({ label: name, value: id });
      if (Array.isArray(node.children) && node.children.length) walk(node.children);
    }
  };
  walk(Array.isArray(nodes) ? nodes : []);
  return result;
}

/** Select multiple 禁止传入 "" / null，否则会出现空 tag */
function asSelectValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)].filter(Boolean);
}

function asDeptValue(value: unknown): string | string[] | undefined {
  if (Array.isArray(value)) {
    const ids = value.map(String).filter(Boolean);
    return ids.length ? ids : undefined;
  }
  if (value == null || value === "") return undefined;
  return String(value);
}

type OptionItem = { label: string; value: string };

const userOptionsCache: { loaded: boolean; loading: Promise<OptionItem[]> | null; options: OptionItem[] } = {
  loaded: false,
  loading: null,
  options: [],
};
const deptOptionsCache: { loaded: boolean; loading: Promise<OptionItem[]> | null; options: OptionItem[] } = {
  loaded: false,
  loading: null,
  options: [],
};
const postOptionsCache: { loaded: boolean; loading: Promise<OptionItem[]> | null; options: OptionItem[] } = {
  loaded: false,
  loading: null,
  options: [],
};
const roleOptionsCache: { loaded: boolean; loading: Promise<OptionItem[]> | null; options: OptionItem[] } = {
  loaded: false,
  loading: null,
  options: [],
};

async function loadCachedOptions(
  cache: { loaded: boolean; loading: Promise<OptionItem[]> | null; options: OptionItem[] },
  loader: () => Promise<OptionItem[]>,
): Promise<OptionItem[]> {
  if (cache.loaded) return cache.options;
  if (cache.loading) return cache.loading;
  cache.loading = loader()
    .then((options) => {
      cache.options = options;
      cache.loaded = true;
      return options;
    })
    .finally(() => {
      cache.loading = null;
    });
  return cache.loading;
}

export function useCubeModal(options: Record<string, unknown> = {}) {
  const state = reactive({
    open: false,
    isOpen: false,
    title: String(options.title ?? ""),
    width: options.width ?? "640px",
    confirmLoading: false,
  });
  const api = {
    state,
    open: () => {
      state.open = true;
      state.isOpen = true;
    },
    close: () => {
      state.open = false;
      state.isOpen = false;
    },
    setState: (next: Record<string, unknown>) => Object.assign(state, next),
  };
  const CubeModal = defineComponent({
    name: "DailyInspectionCompatModal",
    setup(_, { slots }) {
      return () => (
        <Modal
          open={state.open}
          title={state.title}
          width={state.width}
          confirmLoading={state.confirmLoading}
          destroyOnClose={Boolean(options.destroyOnClose)}
          onOk={() => options.onConfirm?.()}
          onCancel={() => (options.onCancel ? options.onCancel() : api.close())}
        >
          {slots.default?.()}
        </Modal>
      );
    },
  });
  return [CubeModal, api] as const;
}

export const PlanNameInput = defineComponent({
  name: "InspectPlanNameInput",
  props: ["checkNameApi", "value"],
  emits: ["update:value"],
  setup(props, { emit }) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = (planName: string) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        if (!planName?.trim() || !props.checkNameApi) return;
        try {
          const repeated = await props.checkNameApi({ planName });
          if (repeated) message.warning("计划名称重复");
        } catch {
          /* 重名校验失败不阻断输入 */
        }
      }, 500);
    };
    return () => (
      <Input
        value={props.value}
        maxlength={32}
        placeholder="请输入计划名称"
        onUpdate:value={(value: string) => {
          emit("update:value", value);
          check(value);
        }}
      />
    );
  },
});

export const InspectLevelSelect = defineComponent({
  name: "InspectLevelSelect",
  props: ["value"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = [
      { label: "普通", value: "GENERAL" },
      { label: "紧急", value: "URGENT" },
    ];
    return () => (
      <Select
        value={props.value}
        options={options}
        style={{ width: "100%" }}
        placeholder="请选择巡检级别"
        onUpdate:value={(value) => emit("update:value", value)}
      />
    );
  },
});

export const CubeSelect = defineComponent({
  name: "InspectCubeSelect",
  props: ["value", "optionsFetchApi", "placeholder", "disabled"],
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const options = ref<{ label: string; value: string }[]>([]);
    const loading = ref(false);
    const load = async () => {
      if (!props.optionsFetchApi) return;
      loading.value = true;
      try {
        const page = unwrapPage(await props.optionsFetchApi());
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
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder ?? "请选择"}
        style={{ width: "100%" }}
        options={options.value}
        loading={loading.value}
        allowClear
        onDropdownVisibleChange={(open: boolean) => open && options.value.length === 0 && void load()}
        onUpdate:value={(value) => emit("update:value", value)}
        onChange={(value, option) => emit("change", value, option)}
      />
    );
  },
});

export const TaskTimeLimit = defineComponent({
  name: "InspectTaskTimeLimit",
  props: ["value"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const formState = reactive({ day: 0, hour: 0, minute: 0 });
    watch(
      () => props.value,
      () => {
        if (!props.value) return;
        try {
          const parsed = typeof props.value === "string" ? JSON.parse(props.value) : props.value;
          formState.day = Number(parsed?.day ?? 0);
          formState.hour = Number(parsed?.hour ?? 0);
          formState.minute = Number(parsed?.minute ?? 0);
        } catch {
          /* ignore */
        }
      },
      { immediate: true },
    );
    const emitValue = () => {
      const { day, hour, minute } = formState;
      if (day || hour || minute) emit("update:value", JSON.stringify({ day, hour, minute }));
      else emit("update:value", "");
    };
    return () => (
      <Space>
        <InputNumber
          min={0}
          max={999}
          value={formState.day}
          addonAfter="天"
          onUpdate:value={(v) => {
            formState.day = Number(v ?? 0);
            emitValue();
          }}
        />
        <InputNumber
          min={0}
          max={23}
          value={formState.hour}
          addonAfter="时"
          onUpdate:value={(v) => {
            formState.hour = Number(v ?? 0);
            emitValue();
          }}
        />
        <InputNumber
          min={0}
          max={59}
          value={formState.minute}
          addonAfter="分"
          onUpdate:value={(v) => {
            formState.minute = Number(v ?? 0);
            emitValue();
          }}
        />
      </Space>
    );
  },
});

export const TaskCreateCycle = defineComponent({
  name: "InspectTaskCreateCycle",
  props: ["value", "cronId", "cycleType", "selection", "hour", "cycleOptionsApi"],
  emits: ["update:value", "update:cronId", "update:cycleType", "update:hour", "update:selection"],
  setup(props, { emit }) {
    const cycleOptionsList = ref<{ id: string; name: string }[]>([]);
    onMounted(async () => {
      try {
        const result = props.cycleOptionsApi ? await props.cycleOptionsApi() : [];
        const records = Array.isArray(result) ? result : unwrapPage(result).records;
        cycleOptionsList.value = [
          { id: "custom", name: "自定义" },
          ...records.map((raw) => {
            const row = raw as Record<string, unknown>;
            return { id: recordId(row), name: recordName(row) };
          }),
        ];
      } catch {
        cycleOptionsList.value = [{ id: "custom", name: "自定义" }];
      }
    });
    return () => (
      <Form layout="inline">
        <FormItem style={{ marginRight: 0 }}>
          <RadioGroup
            buttonStyle="solid"
            optionType="button"
            value={props.value}
            options={cycleOptions}
            onChange={(e) => emit("update:value", e?.target?.value)}
          />
        </FormItem>
        {props.value ? (
          <Space wrap>
            <Select
              value={props.cronId}
              style={{ minWidth: "150px" }}
              options={cycleOptionsList.value.map((item) => ({ label: item.name, value: item.id }))}
              placeholder="请选择执行周期"
              allowClear
              onUpdate:value={(v) => emit("update:cronId", v)}
            />
            {props.cronId === "custom" ? (
              <>
                <Select
                  value={props.cycleType}
                  style={{ minWidth: "100px" }}
                  options={executeCycleOptions}
                  placeholder="执行周期"
                  onUpdate:value={(v) => {
                    emit("update:cycleType", v);
                    emit("update:selection", []);
                  }}
                />
                {props.cycleType === "EVERY_WEEK" ? (
                  <Select
                    mode="multiple"
                    value={props.selection}
                    options={weekCycleOptions}
                    style={{ minWidth: "120px" }}
                    onUpdate:value={(v) => emit("update:selection", v)}
                  />
                ) : null}
                {props.cycleType === "EVERY_MONTH" ? (
                  <Select
                    mode="multiple"
                    value={props.selection}
                    options={monthCycleOptions}
                    style={{ minWidth: "120px" }}
                    onUpdate:value={(v) => emit("update:selection", v)}
                  />
                ) : null}
                <DatePicker
                  picker="time"
                  format="HH:mm"
                  valueFormat="HH:mm"
                  style={{ minWidth: "100px" }}
                  value={props.hour}
                  onUpdate:value={(v) => emit("update:hour", v)}
                />
              </>
            ) : null}
          </Space>
        ) : null}
      </Form>
    );
  },
});

const UserSelect = defineComponent({
  name: "InspectUserSelect",
  props: ["value", "multiple"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<OptionItem[]>(userOptionsCache.options);
    onMounted(() => {
      void loadCachedOptions(userOptionsCache, async () => {
        const page = unwrapPage(await (await getOuaaClient()).listUsers({ pageNumber: 1, pageSize: 500 }));
        return page.records.map((raw) => {
          const row = raw as Record<string, unknown>;
          return { label: recordName(row), value: recordId(row) };
        });
      })
        .then((list) => {
          options.value = list;
        })
        .catch(() => {
          options.value = [];
        });
    });
    return () => (
      <Select
        mode={props.multiple === false ? undefined : "multiple"}
        value={props.multiple === false ? asDeptValue(props.value) : asSelectValues(props.value)}
        options={options.value}
        style={{ width: "100%", minWidth: "180px" }}
        placeholder="请选择人员"
        allowClear
        showSearch
        optionFilterProp="label"
        onUpdate:value={(v) => emit("update:value", v ?? (props.multiple === false ? null : []))}
      />
    );
  },
});

const DeptSelect = defineComponent({
  name: "InspectDeptSelect",
  props: ["value", "placeholder", "treeDefaultExpandAll", "multiple"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<OptionItem[]>(deptOptionsCache.options);
    onMounted(() => {
      void loadCachedOptions(deptOptionsCache, async () => {
        const raw = await (await getOuaaClient()).getOrganizationTree({});
        const page = unwrapPage(raw);
        const tree = page.records.length ? page.records : Array.isArray(raw) ? raw : [];
        return flattenOrgOptions(tree);
      })
        .then((list) => {
          options.value = list;
        })
        .catch(() => {
          options.value = [];
        });
    });
    return () => (
      <Select
        mode={props.multiple ? "multiple" : undefined}
        value={props.multiple ? asSelectValues(props.value) : asDeptValue(props.value)}
        options={options.value}
        placeholder={props.placeholder ?? "请选择部门"}
        allowClear
        showSearch
        optionFilterProp="label"
        style={{ width: "100%", minWidth: "160px" }}
        onUpdate:value={(v) => emit("update:value", v ?? (props.multiple ? [] : null))}
      />
    );
  },
});

/** 对齐 cube AreaCascaderSelect：区域树级联，供列表筛选使用 */
export const AreaCascaderSelect = defineComponent({
  name: "InspectAreaCascaderSelect",
  props: ["value", "placeholder", "multiple", "readonly"],
  emits: ["update:value", "change"],
  setup(props, { emit }) {
    const options = ref<{ label: string; value: string; children?: unknown[] }[]>([]);
    onMounted(async () => {
      try {
        const tree = await getDailyInspectionClient().listAreaTree();
        options.value = toCascaderOptions(tree);
      } catch {
        options.value = [];
      }
    });
    return () => (
      <Cascader
        value={props.value}
        options={options.value}
        placeholder={props.placeholder ?? "区域"}
        multiple={Boolean(props.multiple)}
        disabled={Boolean(props.readonly)}
        changeOnSelect
        allowClear
        showSearch
        style={{ width: "100%", minWidth: "160px" }}
        onUpdate:value={(value) => {
          emit("update:value", value);
          emit("change", value);
        }}
      />
    );
  },
});

const PostSelect = defineComponent({
  name: "InspectPostSelect",
  props: ["value"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<OptionItem[]>(postOptionsCache.options);
    onMounted(() => {
      void loadCachedOptions(postOptionsCache, async () => {
        const page = unwrapPage(await (await getOuaaClient()).listPositions({ pageNumber: 1, pageSize: 500 }));
        return page.records.map((raw) => {
          const row = raw as Record<string, unknown>;
          return { label: recordName(row), value: recordId(row) };
        });
      })
        .then((list) => {
          options.value = list;
        })
        .catch(() => {
          options.value = [];
        });
    });
    return () => (
      <Select
        mode="multiple"
        value={asSelectValues(props.value)}
        options={options.value}
        style={{ width: "100%", minWidth: "140px" }}
        placeholder="请选择岗位"
        allowClear
        onUpdate:value={(v) => emit("update:value", v ?? [])}
      />
    );
  },
});

const RoleSelect = defineComponent({
  name: "InspectRoleSelect",
  props: ["value"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const options = ref<OptionItem[]>(roleOptionsCache.options);
    onMounted(() => {
      void loadCachedOptions(roleOptionsCache, async () => {
        const page = unwrapPage(await (await getOuaaClient()).getRoles());
        return page.records.map((raw) => {
          const row = raw as Record<string, unknown>;
          return { label: recordName(row), value: recordId(row) };
        });
      })
        .then((list) => {
          options.value = list;
        })
        .catch(() => {
          options.value = [];
        });
    });
    return () => (
      <Select
        mode="multiple"
        value={asSelectValues(props.value)}
        options={options.value}
        style={{ width: "100%", minWidth: "140px" }}
        placeholder="请选择角色"
        allowClear
        onUpdate:value={(v) => emit("update:value", v ?? [])}
      />
    );
  },
});

export const PersonLiableSelect = defineComponent({
  name: "PersonLiableSelect",
  props: ["value", "receiveIds", "receiveDeptIds", "receivePostIds", "receiveRoleIds", "treeDefaultExpandAll"],
  emits: ["update:value", "update:receiveIds", "update:receiveDeptIds", "update:receivePostIds", "update:receiveRoleIds"],
  setup(props, { emit }) {
    const clearAll = (): void => {
      emit("update:receiveIds", []);
      emit("update:receiveDeptIds", null);
      emit("update:receivePostIds", []);
      emit("update:receiveRoleIds", []);
    };
    const switchReceiveType = (next: unknown): void => {
      clearAll();
      emit("update:value", next);
    };
    return () => (
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", width: "100%" }}>
        <RadioGroup
          style={{ flexShrink: 0 }}
          buttonStyle="solid"
          optionType="button"
          value={props.value}
          options={receiveTypeOptions}
          onChange={(e) => switchReceiveType(e?.target?.value)}
        />
        <div style={{ flex: 1, display: "flex", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
          {String(props.value) === "2" ? (
            <>
              <DeptSelect
                placeholder="请选择部门"
                treeDefaultExpandAll={props.treeDefaultExpandAll}
                value={props.receiveDeptIds}
                onUpdate:value={(v) => emit("update:receiveDeptIds", v)}
              />
              <PostSelect value={props.receivePostIds} onUpdate:value={(v) => emit("update:receivePostIds", v)} />
              <RoleSelect value={props.receiveRoleIds} onUpdate:value={(v) => emit("update:receiveRoleIds", v)} />
            </>
          ) : (
            <UserSelect multiple value={props.receiveIds} onUpdate:value={(v) => emit("update:receiveIds", v)} />
          )}
        </div>
      </div>
    );
  },
});

export const PersonLiableSelectCheck = defineComponent({
  name: "PersonLiableSelectCheck",
  props: ["value", "checkUserIds", "checkDeptIds", "checkPostIds", "checkRoleIds", "treeDefaultExpandAll"],
  emits: ["update:value", "update:checkUserIds", "update:checkDeptIds", "update:checkPostIds", "update:checkRoleIds"],
  setup(props, { emit }) {
    const clearAll = (): void => {
      emit("update:checkUserIds", []);
      emit("update:checkDeptIds", null);
      emit("update:checkPostIds", []);
      emit("update:checkRoleIds", []);
    };
    const switchCheckType = (next: unknown): void => {
      clearAll();
      emit("update:value", next);
    };
    return () => (
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", width: "100%" }}>
        <RadioGroup
          style={{ flexShrink: 0 }}
          buttonStyle="solid"
          optionType="button"
          value={props.value}
          options={receiveTypeOptions}
          onChange={(e) => switchCheckType(e?.target?.value)}
        />
        <div style={{ flex: 1, display: "flex", gap: "8px", flexWrap: "wrap", minWidth: 0 }}>
          {String(props.value) === "2" ? (
            <>
              <DeptSelect
                placeholder="请选择部门"
                treeDefaultExpandAll={props.treeDefaultExpandAll}
                value={props.checkDeptIds}
                onUpdate:value={(v) => emit("update:checkDeptIds", v)}
              />
              <PostSelect value={props.checkPostIds} onUpdate:value={(v) => emit("update:checkPostIds", v)} />
              <RoleSelect value={props.checkRoleIds} onUpdate:value={(v) => emit("update:checkRoleIds", v)} />
            </>
          ) : (
            <UserSelect multiple value={props.checkUserIds} onUpdate:value={(v) => emit("update:checkUserIds", v)} />
          )}
        </div>
      </div>
    );
  },
});

export const InspectStandardTable = defineComponent({
  name: "InspectStandardTable",
  props: ["businessType"],
  setup(props, { expose }) {
    const selectedRowMap = new Map<string, Record<string, unknown>>();
    const keyword = ref("");
    const columns = [
      { dataIndex: "name", title: "名称", ellipsis: true },
      { dataIndex: "remark", title: "说明", ellipsis: true },
    ];
    const [StandardTable, standardTableApi] = usePcTable({
      columns,
      rowKey: "id",
      rowSelection: "checkbox",
      autoFetch: true,
      rowSelectionChange: (selectedRowKeys, selectedRows) => {
        const selectedKeys = new Set(selectedRowKeys.map(String));
        Array.from(selectedRowMap.keys()).forEach((key) => {
          if (!selectedKeys.has(key)) selectedRowMap.delete(key);
        });
        (selectedRows as Record<string, unknown>[]).forEach((row) => {
          if (row?.id) selectedRowMap.set(String(row.id), row);
        });
        standardTableApi.setSelectedRows(Array.from(selectedRowMap.values()));
      },
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showTotal: (total: number) => `总共 ${total} 条数据`,
        onChange: (current: number, pageSize: number) => {
          standardTableApi.setState({
            pagination: { ...(standardTableApi.state.pagination as object), pageSize, current },
          });
          standardTableApi.query();
        },
      },
      fetchApi: async (params) => {
        try {
          const page = await getDailyInspectionClient().listStandardPage({
            pageNumber: Number(params?.current ?? 1),
            pageSize: Number(params?.pageSize ?? 10),
            keyword: keyword.value || undefined,
            businessType: props.businessType,
          });
          return page;
        } catch (error) {
          message.error(error instanceof Error ? error.message : "巡检标准加载失败");
          return { records: [], total: 0, pages: 0 };
        }
      },
      fetchLoaded: (result) => {
        const selectedKeys = new Set(standardTableApi.getSelectedRowKeys().map(String));
        (result.records as Record<string, unknown>[]).forEach((row) => {
          if (row?.id && selectedKeys.has(String(row.id))) selectedRowMap.set(String(row.id), row);
        });
        standardTableApi.setSelectedRows(Array.from(selectedRowMap.values()));
      },
    });
    expose({
      getStandardSelectedRows: () =>
        standardTableApi
          .getSelectedRowKeys()
          .map((key) => selectedRowMap.get(String(key)))
          .filter(Boolean),
      setStandardSelectedRows: (rows: Record<string, unknown>[]) => {
        selectedRowMap.clear();
        (rows ?? []).forEach((row) => {
          if (row?.id) selectedRowMap.set(String(row.id), row);
        });
        const selectedRows = Array.from(selectedRowMap.values());
        standardTableApi.setSelectedRows(selectedRows);
        standardTableApi.setSelectedRowKeys(selectedRows.map((row) => String(row.id)));
      },
    });
    return () => (
      <>
        <Space>
          <Input value={keyword.value} placeholder="名称" onUpdate:value={(v) => (keyword.value = v)} />
          <Button type="primary" onClick={() => standardTableApi.resetFetch()}>
            搜索
          </Button>
          <Button
            onClick={() => {
              keyword.value = "";
              standardTableApi.resetFetch();
            }}
          >
            重置
          </Button>
        </Space>
        <div style={{ marginTop: "12px" }}>
          <StandardTable />
        </div>
      </>
    );
  },
});

export const InspectItemTable = defineComponent({
  name: "InspectItemTable",
  props: ["businessType"],
  setup(props, { expose }) {
    const state = reactive({ keyword: "", referType: "" });
    const columns = [
      { dataIndex: "alias", title: "巡检项名称", ellipsis: true },
      { dataIndex: "name", title: "巡检项内容", ellipsis: true },
      { dataIndex: "resultNames", title: "巡检结果", ellipsis: true },
      { dataIndex: "referTypeNames", title: "适用对象", ellipsis: true },
    ];
    const [ItemTable, itemTableApi] = usePcTable({
      columns,
      rowKey: "id",
      rowSelection: "checkbox",
      autoFetch: true,
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        showSizeChanger: true,
        showTotal: (total: number) => `总共 ${total} 条数据`,
        onChange: (current: number, pageSize: number) => {
          itemTableApi.setState({
            pagination: { ...(itemTableApi.state.pagination as object), pageSize, current },
          });
          itemTableApi.query();
        },
      },
      fetchApi: async (params) => {
        try {
          return await getDailyInspectionClient().listItemPage({
            pageNumber: Number(params?.current ?? 1),
            pageSize: Number(params?.pageSize ?? 10),
            keyword: state.keyword || undefined,
            referType: state.referType || undefined,
            businessType: props.businessType,
          });
        } catch (error) {
          message.error(error instanceof Error ? error.message : "巡检项加载失败");
          return { records: [], total: 0, pages: 0 };
        }
      },
    });
    expose({
      getInspectItemSelectedRows: () => itemTableApi.getSelectedRows(),
      setInspectItemSelectedRows: (rows: Record<string, unknown>[]) => {
        itemTableApi.setSelectedRows(rows ?? []);
        itemTableApi.setSelectedRowKeys((rows ?? []).map((row) => String(row.id)));
      },
    });
    return () => (
      <>
        <Space>
          <Select
            value={state.referType}
            placeholder="对象类型"
            options={targetCategoryOptions}
            style={{ width: "150px" }}
            allowClear
            onUpdate:value={(v) => (state.referType = v ?? "")}
          />
          <Input value={state.keyword} placeholder="请输入巡检项名称" onUpdate:value={(v) => (state.keyword = v)} />
          <Button type="primary" onClick={() => itemTableApi.resetFetch()}>
            搜索
          </Button>
          <Button
            onClick={() => {
              state.keyword = "";
              state.referType = "";
              itemTableApi.resetFetch();
            }}
          >
            重置
          </Button>
        </Space>
        <div style={{ marginTop: "12px" }}>
          <ItemTable />
        </div>
      </>
    );
  },
});

export { ObjectSelectModal } from "./object-select-modal";
