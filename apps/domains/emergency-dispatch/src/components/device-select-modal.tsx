// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import { defineComponent, nextTick, reactive, shallowRef, watch, type PropType } from "vue";

import { getDeviceCenterClient } from "@/domain-context";
import { Button, Input, Modal, Page, Table, message } from "@/pc-ui-runtime";

import styles from "./device-select-modal.module.css";

export type DeviceSelectRecord = {
  id: string;
  name: string;
  code?: string;
  area?: string;
  category?: string;
  [key: string]: unknown;
};

export type DeviceSelectModalExpose = {
  openModal: (selectedDevices?: DeviceSelectRecord[]) => void;
  closeModal: () => void;
};

function unwrapPage(raw: unknown): { records: unknown[]; total: number } {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const nested = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : data;
  const records = (nested.records ?? nested.list ?? nested.rows ?? data.records ?? []) as unknown;
  return {
    records: Array.isArray(records) ? records : [],
    total: Number(nested.total ?? data.total ?? (Array.isArray(records) ? records.length : 0)),
  };
}

function normalizeDevice(raw: Record<string, unknown>): DeviceSelectRecord {
  const area = (raw.area ?? {}) as Record<string, unknown>;
  const productInfo = (raw.productInfo ?? raw.product ?? {}) as Record<string, unknown>;
  const category = (productInfo.productCategory ?? raw.productCategory ?? {}) as Record<string, unknown>;
  return {
    ...raw,
    id: String(raw.id ?? raw.deviceId ?? raw.code ?? ""),
    name: String(raw.name ?? raw.deviceName ?? ""),
    code: String(raw.code ?? raw.deviceCode ?? ""),
    area: String(area.pathName ?? area.name ?? raw.areaName ?? ""),
    category: String(category.name ?? raw.category ?? raw.deviceProdCategoryName ?? ""),
  };
}

/**
 * 设备选择弹窗：对齐旧仓 DeviceSelectModal 契约（openModal / onOk / applicationCode / tagCodes）。
 * 简化版筛选项，仅关键词；列表走 device-center getIotDeviceList。
 */
export const DeviceSelectModal = defineComponent({
  name: "DeviceSelectModal",
  props: {
    value: { type: Array as PropType<DeviceSelectRecord[]>, default: () => [] },
    multiple: { type: Boolean, default: true },
    applicationCode: { type: String, default: "" },
    tagCodes: { type: Array as PropType<string[]>, default: () => [] },
    title: { type: String, default: "选择设备" },
    width: { type: String, default: "960px" },
  },
  emits: ["update:value", "ok"],
  setup(props, { emit, expose }) {
    const open = shallowRef(false);
    const loading = shallowRef(false);
    const keyword = shallowRef("");
    const records = shallowRef<DeviceSelectRecord[]>([]);
    const selectedMap = shallowRef(new Map<string, DeviceSelectRecord>());
    const selectedKeys = shallowRef<(string | number)[]>([]);
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    const syncSelection = (devices: DeviceSelectRecord[]): void => {
      selectedMap.value = new Map(devices.map((d) => [String(d.id), d]));
      selectedKeys.value = devices.map((d) => d.id);
    };

    const loadList = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getDeviceCenterClient();
        const pageData = unwrapPage(
          await client.getIotDeviceList({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: keyword.value.trim() || undefined,
            applicationCode: props.applicationCode || undefined,
            tagCodes: props.tagCodes?.length ? props.tagCodes : undefined,
          }),
        );
        records.value = pageData.records.map((row) => normalizeDevice(row as Record<string, unknown>));
        page.total = pageData.total;
      } catch {
        records.value = [];
        page.total = 0;
        message.error("设备列表加载失败");
      } finally {
        loading.value = false;
      }
    };

    const closeModal = (): void => {
      open.value = false;
    };

    const openModal = (initial: DeviceSelectRecord[] = props.value ?? []): void => {
      page.pageNumber = 1;
      keyword.value = "";
      syncSelection(initial);
      open.value = true;
      void nextTick().then(() => void loadList());
    };

    const confirm = (): void => {
      const selected = selectedKeys.value
        .map((key) => selectedMap.value.get(String(key)))
        .filter((item): item is DeviceSelectRecord => Boolean(item))
        .map((item) => ({ id: item.id, name: item.name }));
      emit("update:value", selected);
      emit("ok", selected);
      closeModal();
    };

    const changePage = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      void loadList();
    };

    expose({ openModal, closeModal } satisfies DeviceSelectModalExpose);

    watch(
      () => props.value,
      (devices) => {
        if (open.value) syncSelection(devices ?? []);
      },
    );

    const columns = [
      { title: "设备编号", dataIndex: "code", width: 160, ellipsis: true },
      { title: "设备名称", dataIndex: "name", ellipsis: true },
      { title: "品类", dataIndex: "category", width: 140, ellipsis: true },
      { title: "区域", dataIndex: "area", width: 160, ellipsis: true },
    ];

    return () => (
      <Modal
        open={open.value}
        title={props.title}
        width={props.width}
        destroyOnClose
        maskClosable={false}
        footer={null}
        onCancel={closeModal}
      >
        <div class={styles.content}>
          <div class={styles.toolbar}>
            <Input
              allowClear
              placeholder="搜索设备名称/编号"
              value={keyword.value}
              onUpdate:value={(v: string) => {
                keyword.value = v;
              }}
              onPressEnter={() => {
                page.pageNumber = 1;
                void loadList();
              }}
            />
            <Button
              type="primary"
              onClick={() => {
                page.pageNumber = 1;
                void loadList();
              }}
            >
              查询
            </Button>
          </div>
          <Table
            rowKey="id"
            loading={loading.value}
            columns={columns}
            dataSource={records.value}
            pagination={false}
            rowSelection={{
              type: props.multiple ? "checkbox" : "radio",
              selectedRowKeys: selectedKeys.value,
              onChange: (keys: (string | number)[], rows: DeviceSelectRecord[]) => {
                const next = new Map(selectedMap.value);
                rows.forEach((row) => next.set(String(row.id), row));
                selectedMap.value = next;
                selectedKeys.value = props.multiple ? keys : keys.slice(0, 1);
              },
            }}
          />
          <div class={styles.footer}>
            <span>已选 {selectedKeys.value.length} 项</span>
            <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} syncToUrl={false} onPageChange={changePage} />
            <div class={styles.actions}>
              <Button onClick={closeModal}>取消</Button>
              <Button type="primary" onClick={confirm}>
                确定
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  },
});
