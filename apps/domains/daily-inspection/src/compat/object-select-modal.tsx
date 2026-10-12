// @ts-nocheck -- 对齐 cube ObjectSelectModal：Tabs + 各类型选择表（图2）。
import { computed, defineComponent, onMounted, reactive, ref, watch } from "vue";

import { getDailyInspectionClient } from "../domain-context";
import { OBJECT_REF_KIND, ObjectType, type ObjectTypeValue } from "./constants";
import { Button, Input, Modal, Page, PopOver, Space, TabPane, Table, Tabs, message } from "@/pc-ui-runtime";

/** 与 cube ObjectSelectModal TAB 文案一致 */
const OBJECT_SELECT_TAB_LABELS: Record<ObjectTypeValue, string> = {
  [ObjectType.AREA]: "区域",
  [ObjectType.DEVICE]: "设备",
  [ObjectType.PROPERTY]: "资产",
  [ObjectType.STALL]: "档位",
  [ObjectType.SITE_POINT]: "现场点",
  [ObjectType.PATROL_POINT]: "巡更点",
  [ObjectType.RISK_SOURCE]: "风险源",
  [ObjectType.SMALL_ENGINEERING]: "小散工程",
};

const OBJECT_TYPE_LIST = Object.values(ObjectType) as ObjectTypeValue[];
const MODAL_TABLE_SCROLL_Y = 400;

interface SelectOption {
  id: string;
  name: string;
  type?: ObjectTypeValue;
  code?: string;
  [key: string]: unknown;
}

function recordId(record: Record<string, unknown>): string {
  return String(record.id ?? record.targetId ?? record.deviceId ?? "");
}

function recordName(record: Record<string, unknown>): string {
  return String(record.name ?? record.targetName ?? record.projectName ?? record.pointName ?? "--");
}

function recordCode(record: Record<string, unknown>): string {
  return String(record.code ?? record.deviceCode ?? record.projectCode ?? "--");
}

function getSelectValuesByType(value: SelectOption[] | undefined): Record<ObjectTypeValue, SelectOption[]> {
  const result = {} as Record<ObjectTypeValue, SelectOption[]>;
  for (const type of OBJECT_TYPE_LIST) {
    result[type] = value?.filter((item) => item.type === type) ?? [];
  }
  return result;
}

function normalizeTree(nodes: unknown[]): Record<string, unknown>[] {
  return (Array.isArray(nodes) ? nodes : []).map((raw) => {
    const node = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const children = node.children;
    return {
      ...node,
      id: recordId(node),
      name: recordName(node),
      code: recordCode(node),
      children: Array.isArray(children) && children.length ? normalizeTree(children) : undefined,
    };
  });
}

/** 区域树选择表 —— 对齐 cube AreaTreeSelectTable / 图2 */
const AreaTreeSelectTable = defineComponent({
  name: "AreaTreeSelectTable",
  props: ["value", "multiple", "scrollY"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const dataSource = ref<Record<string, unknown>[]>([]);
    const selectedRowKeys = ref<string[]>((props.value ?? []).map((item: SelectOption) => String(item.id)));
    const loading = ref(false);

    const syncSelection = (value: SelectOption[]) => {
      selectedRowKeys.value = (value ?? []).map((item) => String(item.id));
    };

    watch(() => props.value, syncSelection, { deep: true });

    onMounted(async () => {
      loading.value = true;
      try {
        const tree = await getDailyInspectionClient().listAreaTree();
        dataSource.value = normalizeTree(tree);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "区域加载失败");
        dataSource.value = [];
      } finally {
        loading.value = false;
      }
    });

    return () => (
      <Table
        loading={loading.value}
        size="small"
        bordered
        columns={[
          {
            title: "区域名称",
            dataIndex: "name",
            ellipsis: true,
            align: "center",
            customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
          },
          {
            title: "区域编号",
            dataIndex: "code",
            ellipsis: true,
            align: "center",
            customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
          },
        ]}
        dataSource={dataSource.value}
        rowKey="id"
        pagination={false}
        scroll={{ y: props.scrollY ?? 500 }}
        rowSelection={{
          type: props.multiple ? "checkbox" : "radio",
          checkStrictly: false,
          selectedRowKeys: selectedRowKeys.value,
          onChange: (_keys, selectedRows) => {
            const next = (selectedRows as Record<string, unknown>[]).map((row) => ({
              ...row,
              id: recordId(row),
              name: recordName(row),
              code: recordCode(row),
            }));
            selectedRowKeys.value = next.map((row) => String(row.id));
            emit("update:value", next);
          },
        }}
      />
    );
  },
});

/** 通用分页对象表（设备/资产/档位/现场点/风险源/小散工程） */
const ObjectPageSelectTable = defineComponent({
  name: "ObjectPageSelectTable",
  props: ["objectType", "value", "multiple", "scrollY", "nameTitle", "codeTitle", "nameField", "keywordPlaceholder"],
  emits: ["update:value"],
  setup(props, { emit }) {
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const keyword = ref("");
    const rows = ref<Record<string, unknown>[]>([]);
    const loading = ref(false);
    const selectedMap = ref(new Map<string, SelectOption>());

    watch(
      () => props.value,
      (value: SelectOption[]) => {
        const next = new Map<string, SelectOption>();
        (value ?? []).forEach((item) => next.set(String(item.id), item));
        selectedMap.value = next;
      },
      { deep: true, immediate: true },
    );

    const displayName = (record: Record<string, unknown>): string => {
      if (props.nameField && record[props.nameField] != null) return String(record[props.nameField]);
      return recordName(record);
    };

    const load = async () => {
      loading.value = true;
      try {
        const kind = OBJECT_REF_KIND[props.objectType as ObjectTypeValue];
        const result = await getDailyInspectionClient().listObjectPage(kind, {
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: keyword.value || undefined,
          pointName: keyword.value || undefined,
          enabled: props.objectType === ObjectType.STALL ? true : undefined,
        });
        rows.value = (result.records ?? []).map((raw) => {
          const row = raw as Record<string, unknown>;
          return {
            ...row,
            id: recordId(row),
            name: displayName(row),
            code: recordCode(row),
          };
        });
        page.total = Number(result.total ?? rows.value.length);
      } catch (error) {
        message.error(error instanceof Error ? error.message : "对象加载失败");
        rows.value = [];
        page.total = 0;
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => void load());

    return () => (
      <div>
        <Space style={{ marginBottom: "12px" }}>
          <Input
            value={keyword.value}
            placeholder={props.keywordPlaceholder ?? props.nameTitle ?? "名称"}
            allowClear
            style={{ width: "220px" }}
            onUpdate:value={(value) => (keyword.value = value)}
            onPressEnter={() => {
              page.pageNumber = 1;
              void load();
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              page.pageNumber = 1;
              void load();
            }}
          >
            搜索
          </Button>
          <Button
            onClick={() => {
              keyword.value = "";
              page.pageNumber = 1;
              void load();
            }}
          >
            重置
          </Button>
        </Space>
        <Table
          loading={loading.value}
          size="small"
          bordered
          columns={[
            {
              title: props.nameTitle ?? "名称",
              dataIndex: "name",
              ellipsis: true,
              align: "center",
              customRender: ({ record }) => {
                const text = displayName(record as Record<string, unknown>);
                return <PopOver content={text}>{text}</PopOver>;
              },
            },
            {
              title: props.codeTitle ?? "编码",
              dataIndex: "code",
              ellipsis: true,
              align: "center",
              customRender: ({ text }) => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
            },
          ]}
          dataSource={rows.value}
          rowKey="id"
          pagination={false}
          scroll={{ y: props.scrollY ?? MODAL_TABLE_SCROLL_Y }}
          rowSelection={{
            type: props.multiple ? "checkbox" : "radio",
            selectedRowKeys: Array.from(selectedMap.value.keys()),
            onChange: (keys, selectedRows) => {
              const next = new Map(selectedMap.value);
              const pageIds = new Set(rows.value.map((row) => recordId(row)));
              pageIds.forEach((id) => {
                if (!keys.map(String).includes(id)) next.delete(id);
              });
              (selectedRows as Record<string, unknown>[]).forEach((row) => {
                next.set(recordId(row), {
                  ...row,
                  id: recordId(row),
                  name: displayName(row),
                  code: recordCode(row),
                });
              });
              selectedMap.value = next;
              emit("update:value", Array.from(next.values()));
            },
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            onPageChange={(current, size) => {
              page.pageNumber = current;
              page.pageSize = size;
              void load();
            }}
          />
        </div>
      </div>
    );
  },
});

const TAB_CONFIG: Array<{
  type: ObjectTypeValue;
  label: string;
  nameTitle?: string;
  codeTitle?: string;
  nameField?: string;
  keywordPlaceholder?: string;
}> = [
  { type: ObjectType.AREA, label: OBJECT_SELECT_TAB_LABELS[ObjectType.AREA] },
  {
    type: ObjectType.DEVICE,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.DEVICE],
    nameTitle: "设备名称",
    codeTitle: "设备编码",
    keywordPlaceholder: "设备名称",
  },
  {
    type: ObjectType.PROPERTY,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.PROPERTY],
    nameTitle: "资产名称",
    codeTitle: "资产编码",
    keywordPlaceholder: "资产名称",
  },
  {
    type: ObjectType.STALL,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.STALL],
    nameTitle: "档位名称",
    codeTitle: "档位编码",
    keywordPlaceholder: "档位名称",
  },
  {
    type: ObjectType.SITE_POINT,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.SITE_POINT],
    nameTitle: "现场点名称",
    codeTitle: "编码",
    keywordPlaceholder: "现场点名称",
  },
  {
    type: ObjectType.PATROL_POINT,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.PATROL_POINT],
    nameTitle: "巡更点名称",
    codeTitle: "编码",
    keywordPlaceholder: "巡更点名称",
  },
  {
    type: ObjectType.RISK_SOURCE,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.RISK_SOURCE],
    nameTitle: "风险源名称",
    codeTitle: "编码",
    keywordPlaceholder: "风险源名称",
  },
  {
    type: ObjectType.SMALL_ENGINEERING,
    label: OBJECT_SELECT_TAB_LABELS[ObjectType.SMALL_ENGINEERING],
    nameTitle: "工程名称",
    codeTitle: "编码",
    nameField: "projectName",
    keywordPlaceholder: "工程名称",
  },
];

export const ObjectSelectModal = defineComponent({
  name: "ObjectSelectModal",
  props: ["title", "multiple", "value", "defaultTab", "showTabs", "oldDailyInspection"],
  emits: ["enter", "cancel", "update:value"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const confirmLoading = ref(false);
    const showTabsList = computed(() => (props.showTabs?.length ? props.showTabs : OBJECT_TYPE_LIST) as ObjectTypeValue[]);
    const activeKey = ref<ObjectTypeValue>(
      props.defaultTab && showTabsList.value.includes(props.defaultTab) ? props.defaultTab : (showTabsList.value[0] ?? ObjectType.AREA),
    );
    const selectValues = reactive<Record<ObjectTypeValue, SelectOption[]>>(getSelectValuesByType(props.value));

    watch(
      () => props.value,
      (newVal) => {
        const next = getSelectValuesByType(newVal);
        OBJECT_TYPE_LIST.forEach((type) => {
          selectValues[type] = next[type];
        });
        if (newVal?.length) {
          const first = newVal[0]?.type;
          if (first && showTabsList.value.includes(first)) activeKey.value = first;
        }
      },
      { deep: true },
    );

    const selectedCount = computed(() => Object.values(selectValues).flat().length);

    const close = (): void => {
      open.value = false;
    };

    const handleConfirm = (): void => {
      const selected = Object.values(selectValues).flat();
      emit("enter", selected);
      emit("update:value", selected);
      close();
    };

    const handleCancel = (): void => {
      emit("cancel");
      close();
    };

    const handleValueUpdate = (type: ObjectTypeValue, newValues: SelectOption[]) => {
      const withType = newValues.map((item) => ({ ...item, type }));
      if (props.multiple !== false) {
        selectValues[type] = withType;
        return;
      }
      OBJECT_TYPE_LIST.forEach((itemType) => {
        selectValues[itemType] = [];
      });
      selectValues[type] = withType.length ? [withType[0]] : [];
    };

    expose({
      openModal: () => {
        activeKey.value =
          props.defaultTab && showTabsList.value.includes(props.defaultTab) ? props.defaultTab : (showTabsList.value[0] ?? ObjectType.AREA);
        open.value = true;
      },
    });

    return () => (
      <Modal
        open={open.value}
        title={props.title ?? "选择巡检对象"}
        width="1000px"
        confirmLoading={confirmLoading.value}
        destroyOnClose={false}
        class="object-select-modal-wrapper"
        onCancel={handleCancel}
        v-slots={{
          footer: () => (
            <div style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(0,0,0,0.65)" }}>已选{selectedCount.value}项</span>
              <Space>
                <Button onClick={handleCancel}>取消</Button>
                <Button type="primary" loading={confirmLoading.value} onClick={handleConfirm}>
                  确定
                </Button>
              </Space>
            </div>
          ),
        }}
      >
        <Tabs
          activeKey={activeKey.value}
          onUpdate:activeKey={(key) => {
            activeKey.value = key as ObjectTypeValue;
          }}
        >
          {TAB_CONFIG.filter((item) => showTabsList.value.includes(item.type)).map((item) => (
            <TabPane key={item.type} tab={item.label} forceRender>
              {item.type === ObjectType.AREA ? (
                <AreaTreeSelectTable
                  value={selectValues[item.type]}
                  multiple={props.multiple !== false}
                  scrollY={MODAL_TABLE_SCROLL_Y}
                  onUpdate:value={(value) => handleValueUpdate(item.type, value)}
                />
              ) : (
                <ObjectPageSelectTable
                  objectType={item.type}
                  value={selectValues[item.type]}
                  multiple={props.multiple !== false}
                  scrollY={MODAL_TABLE_SCROLL_Y}
                  nameTitle={item.nameTitle}
                  codeTitle={item.codeTitle}
                  nameField={item.nameField}
                  keywordPlaceholder={item.keywordPlaceholder}
                  onUpdate:value={(value) => handleValueUpdate(item.type, value)}
                />
              )}
            </TabPane>
          ))}
        </Tabs>
      </Modal>
    );
  },
});
