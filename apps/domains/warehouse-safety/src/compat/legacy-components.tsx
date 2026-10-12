import { defineComponent, onMounted, ref, watch, type PropType } from "vue";

import { getOuaaClient } from "@/domain-context";
import { Button, Input, Modal, Page, PageLayout, Space, Table, TreeSelect, message } from "@/pc-ui-runtime";
import { warehouseSafetyApi } from "@/services/warehouse-safety-api";

function pageData(raw: unknown): { records: Record<string, unknown>[]; total: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const records = (data.records ?? data.list ?? data.rows ?? []) as unknown;
  return {
    records: Array.isArray(records) ? (records as Record<string, unknown>[]) : [],
    total: Number(data.total ?? (Array.isArray(records) ? records.length : 0)),
  };
}

export const CubeLayout = defineComponent({
  name: "WarehouseSafetyCubeLayoutCompat",
  props: {
    title: { type: String, default: "" },
    subTitle: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () => (
      <PageLayout
        title={props.title}
        showFooter={Boolean(slots["footer-page"] || slots["footer-btn"])}
        v-slots={{
          "layout-header": () => <>{slots["layout-header"]?.()}</>,
          "layout-content": slots["layout-content"],
          "footer-page": slots["footer-page"],
          "footer-btn": slots["footer-btn"],
          default: slots.default,
        }}
      />
    );
  },
});

export const AreaTreeSelect = defineComponent({
  name: "WarehouseSafetyAreaTreeSelect",
  inheritAttrs: false,
  props: {
    value: { type: [String, Number] as PropType<string | number | undefined>, default: undefined },
    readonly: { type: Boolean, default: false },
    placeholder: { type: String, default: "请选择区域" },
    multiple: { type: Boolean, default: false },
    checkable: { type: Boolean, default: false },
    style: { type: [String, Object] as PropType<string | Record<string, string>>, default: undefined },
  },
  emits: ["update:value", "change"],
  setup(props, { attrs, emit }) {
    const treeData = ref<Record<string, unknown>[]>([]);
    onMounted(async () => {
      try {
        treeData.value = (await warehouseSafetyApi.getAreaTree()) as unknown as Record<string, unknown>[];
      } catch (error) {
        message.error(error instanceof Error ? error.message : "区域数据加载失败");
      }
    });
    return () => (
      <TreeSelect
        {...attrs}
        value={props.value}
        treeData={treeData.value}
        fieldNames={{ label: "name", value: "id", children: "children" }}
        disabled={props.readonly}
        placeholder={props.placeholder}
        multiple={props.multiple}
        treeCheckable={props.checkable}
        style={props.style}
        treeDefaultExpandAll
        onUpdate:value={(value: string | number) => emit("update:value", value)}
        onChange={(value: string | number) => emit("change", value)}
      />
    );
  },
});

export const UserSelectModal = defineComponent({
  name: "WarehouseSafetyUserSelectModal",
  props: {
    title: { type: String, default: "选择人员" },
    multiple: { type: Boolean, default: true },
  },
  emits: ["enter"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const loading = ref(false);
    const keyword = ref("");
    const rows = ref<Record<string, unknown>[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<Record<string, unknown>[]>([]);

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = pageData(
          await (
            await getOuaaClient()
          ).listUsers({
            pageNumber: 1,
            pageSize: 200,
            keyword: keyword.value.trim() || undefined,
          }),
        );
        rows.value = result.records.map((row) => ({
          ...row,
          id: String(row.id ?? row.userId ?? ""),
        }));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "人员加载失败");
      } finally {
        loading.value = false;
      }
    };

    expose({
      openModal: (keys?: string[]) => {
        selectedKeys.value = keys ?? [];
        selectedRows.value = [];
        open.value = true;
        void load();
      },
    });

    return () => (
      <Modal
        open={open.value}
        title={props.title}
        width={860}
        okText="确定"
        cancelText="取消"
        onCancel={() => (open.value = false)}
        onOk={() => {
          if (!selectedRows.value.length) {
            message.warning("请选择人员");
            return;
          }
          emit(
            "enter",
            selectedRows.value.map((row) => ({
              ...row,
              id: String(row.id ?? row.userId ?? ""),
              name: String(row.name ?? row.realName ?? row.username ?? ""),
            })),
          );
          open.value = false;
        }}
      >
        <Space style={{ marginBottom: "12px" }}>
          <Input
            value={keyword.value}
            placeholder="搜索姓名、账号"
            allowClear
            onUpdate:value={(value: string) => (keyword.value = value)}
            onPressEnter={() => void load()}
          />
          <Button type="primary" onClick={() => void load()}>
            查询
          </Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading.value}
          dataSource={rows.value}
          locale={{ emptyText: "暂无数据" }}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: "姓名",
              dataIndex: "name",
              customRender: ({ record }: { record: Record<string, unknown> }) => String(record.name ?? record.realName ?? "--"),
            },
            { title: "账号", dataIndex: "username" },
            { title: "组织", dataIndex: "organizationName" },
          ]}
          rowSelection={{
            type: props.multiple ? "checkbox" : "radio",
            selectedRowKeys: selectedKeys.value,
            onChange: (keys: unknown[], selected: Record<string, unknown>[]) => {
              selectedKeys.value = keys.map(String);
              selectedRows.value = selected;
            },
          }}
        />
      </Modal>
    );
  },
});

export const DeviceModalTable = defineComponent({
  name: "WarehouseSafetyDeviceModalTable",
  props: {
    title: { type: String, default: "选择设备" },
    value: { type: Array as PropType<Array<{ id: string; name?: string }>>, default: () => [] },
    multiple: { type: Boolean, default: true },
    searchParams: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  emits: ["ok"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const loading = ref(false);
    const keyword = ref("");
    const pageNumber = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const rows = ref<Record<string, unknown>[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<Record<string, unknown>[]>([]);

    const load = async (): Promise<void> => {
      loading.value = true;
      try {
        const result = await warehouseSafetyApi.pageDeviceOptions({
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          keyword: keyword.value.trim() || undefined,
        });
        rows.value = ((result.records ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
          ...row,
          id: String(row.id ?? row.deviceId ?? ""),
        }));
        total.value = result.total ?? 0;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "设备加载失败");
      } finally {
        loading.value = false;
      }
    };

    watch(
      () => props.value,
      (value) => {
        selectedKeys.value = value.map((item) => String(item.id));
      },
      { immediate: true, deep: true },
    );

    expose({
      openModal: () => {
        selectedKeys.value = props.value.map((item) => String(item.id));
        selectedRows.value = [...props.value] as Record<string, unknown>[];
        open.value = true;
        void load();
      },
    });

    return () => (
      <Modal
        open={open.value}
        title={props.title}
        width={980}
        okText="确定"
        cancelText="取消"
        onCancel={() => (open.value = false)}
        onOk={() => {
          if (!selectedRows.value.length) {
            message.warning("请选择设备");
            return;
          }
          emit("ok", selectedRows.value);
          open.value = false;
        }}
      >
        <Space style={{ marginBottom: "12px" }}>
          <Input
            value={keyword.value}
            placeholder="搜索设备编号、名称"
            allowClear
            onUpdate:value={(value: string) => (keyword.value = value)}
            onPressEnter={() => {
              pageNumber.value = 1;
              void load();
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              pageNumber.value = 1;
              void load();
            }}
          >
            查询
          </Button>
        </Space>
        <Table
          rowKey="id"
          loading={loading.value}
          dataSource={rows.value}
          locale={{ emptyText: "暂无数据" }}
          pagination={false}
          columns={[
            { title: "设备编号", dataIndex: "code", width: 180 },
            { title: "设备名称", dataIndex: "name", width: 200 },
            { title: "所属产品", dataIndex: "productName" },
            { title: "所在区域", dataIndex: "areaName" },
          ]}
          rowSelection={{
            type: props.multiple ? "checkbox" : "radio",
            selectedRowKeys: selectedKeys.value,
            onChange: (keys: unknown[], selected: Record<string, unknown>[]) => {
              selectedKeys.value = keys.map(String);
              selectedRows.value = selected;
            },
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
          <Page
            syncToUrl={false}
            current={pageNumber.value}
            pageSize={pageSize.value}
            total={total.value}
            onPageChange={(page: number, size: number) => {
              pageNumber.value = page;
              pageSize.value = size;
              void load();
            }}
          />
        </div>
      </Modal>
    );
  },
});
