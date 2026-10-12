import { Button, Form, FormItem, Input, Modal, Page, Table, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";

export interface SiteDeviceOption {
  id: string;
  name: string;
}

interface DeviceRecord {
  id?: string;
  deviceId?: string;
  name?: string;
  deviceName?: string;
  code?: string;
  [key: string]: unknown;
}

function asPage(value: unknown): { records: DeviceRecord[]; total: number } {
  let current = value;
  for (let i = 0; i < 4 && current && typeof current === "object" && !Array.isArray(current) && "data" in current; i += 1) {
    current = (current as { data: unknown }).data;
  }
  if (Array.isArray(current)) return { records: current as DeviceRecord[], total: current.length };
  const root = current && typeof current === "object" ? (current as Record<string, unknown>) : {};
  const records = Array.isArray(root.records) ? (root.records as DeviceRecord[]) : [];
  return { records, total: Number(root.total ?? records.length) };
}

function deviceIdOf(row: DeviceRecord): string {
  return String(row.id ?? row.deviceId ?? "");
}

function deviceNameOf(row: DeviceRecord): string {
  return String(row.name ?? row.deviceName ?? "--");
}

/** 设备选择弹窗：对齐旧 DeviceModalTable，走 deviceCenterClient；applicationCode 可区分巡检监控/无人机等。 */
export const SiteDeviceSelectModal = defineComponent({
  name: "SiteDeviceSelectModal",
  props: {
    open: Boolean,
    value: { type: Array as PropType<SiteDeviceOption[]>, default: () => [] },
    applicationCode: { type: String, default: "INSPECTION" },
    multiple: { type: Boolean, default: true },
    title: { type: String, default: "选择关联监控" },
  },
  emits: ["update:open", "ok"],
  setup(props, { emit }) {
    const loading = ref(false);
    const keyword = ref("");
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const rows = ref<DeviceRecord[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<SiteDeviceOption[]>([]);
    let queryToken = 0;

    const load = async (): Promise<void> => {
      const token = ++queryToken;
      loading.value = true;
      try {
        const client = await getDeviceCenterClient();
        const appCode = props.applicationCode || "INSPECTION";
        const response = await client.getIotDeviceList({
          filterTagCodes: [`builtin.app::${appCode}`],
          applicationCode: appCode,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: keyword.value.trim() || undefined,
        });
        if (token !== queryToken) return;
        const result = asPage(response);
        rows.value = result.records;
        page.total = result.total;
      } catch (error) {
        if (token === queryToken) {
          rows.value = [];
          page.total = 0;
          message.error(error instanceof Error ? error.message : "设备列表加载失败");
        }
      } finally {
        if (token === queryToken) loading.value = false;
      }
    };

    const open = (): void => {
      selectedKeys.value = props.value.map((item) => item.id);
      selectedRows.value = [...props.value];
      keyword.value = "";
      page.pageNumber = 1;
      void load();
    };

    const close = (): void => {
      emit("update:open", false);
    };

    const confirm = (): void => {
      emit("ok", [...selectedRows.value]);
      close();
    };

    watch(
      () => props.open,
      (visible) => {
        if (visible) open();
      },
    );

    const columns = [
      { title: "设备编码", dataIndex: "code", align: "center" as const, ellipsis: true },
      {
        title: "设备名称",
        dataIndex: "name",
        align: "center" as const,
        ellipsis: true,
        customRender: ({ record }: { record: DeviceRecord }) => deviceNameOf(record),
      },
    ];

    return () => (
      <Modal open={props.open} title={props.title} width="800px" okText="确定" cancelText="取消" onOk={confirm} onCancel={close}>
        <Form layout="inline" style={{ marginBottom: "12px" }}>
          <FormItem>
            <Input
              value={keyword.value}
              allowClear
              placeholder="设备名称/编码"
              style={{ width: "220px" }}
              onUpdate:value={(value: string) => {
                keyword.value = value;
              }}
            />
          </FormItem>
          <FormItem>
            <Button
              type="primary"
              onClick={() => {
                page.pageNumber = 1;
                void load();
              }}
            >
              查询
            </Button>
          </FormItem>
        </Form>
        <Table
          rowKey={(record: DeviceRecord) => deviceIdOf(record)}
          columns={columns}
          dataSource={rows.value}
          loading={loading.value}
          pagination={false}
          rowSelection={{
            type: props.multiple ? "checkbox" : "radio",
            selectedRowKeys: selectedKeys.value,
            onChange: (keys: Array<string | number>, selected: DeviceRecord[]) => {
              if (!props.multiple) {
                const row = selected[0];
                selectedKeys.value = row ? [deviceIdOf(row)] : [];
                selectedRows.value = row ? [{ id: deviceIdOf(row), name: deviceNameOf(row) }] : [];
                return;
              }
              const currentIds = rows.value.map(deviceIdOf);
              const keep = selectedRows.value.filter((item) => !currentIds.includes(item.id));
              const next = selected.map((row) => ({ id: deviceIdOf(row), name: deviceNameOf(row) })).filter((item) => item.id);
              selectedKeys.value = keys.map(String);
              selectedRows.value = [...keep, ...next].filter((item, index, list) => list.findIndex((x) => x.id === item.id) === index);
            },
          }}
        />
        <div style={{ marginTop: "12px", display: "flex", justifyContent: "flex-end" }}>
          <Page
            current={page.pageNumber}
            pageSize={page.pageSize}
            total={page.total}
            onPageChange={(pageNumber: number, pageSize: number) => {
              page.pageNumber = pageNumber;
              page.pageSize = pageSize;
              void load();
            }}
          />
        </div>
      </Modal>
    );
  },
});
