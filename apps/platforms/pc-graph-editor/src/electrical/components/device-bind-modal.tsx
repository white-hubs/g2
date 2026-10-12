import { Modal, Table, Input, Select, Button, Pagination, message } from "@g2-platform/pc-ui";
import type { ColumnsType } from "ant-design-vue/es/table";
import { defineComponent, ref, watch, type PropType } from "vue";

import { useGraphDeviceClient, type ApplicationDevice } from "../../device-client";
import type { DeviceBinding } from "../types";

import "./device-bind-modal.css";

const APPLICATION_CODE_ELECTRICMANAGE = "ELECTRICMANAGE";

interface DeviceBindModalProps {
  visible: boolean;
  selectedIds?: string[];
  initialBindings?: DeviceBinding[];
}

/** 从 DeviceBinding 转成表格用的 ApplicationDevice 形态，用于打开弹窗时预填已选 */
function bindingToApplicationDevice(b: DeviceBinding): ApplicationDevice {
  return {
    deviceId: b.deviceId,
    deviceName: b.deviceName,
    deviceType: b.deviceType ?? "",
    areaName: (b as { position?: string }).position ?? "",
    deviceAreaName: (b as { position?: string }).position ?? "",
  } as ApplicationDevice;
}

/**
 * 关联设备弹窗：数据来源 DeviceService.getApplicationDevice(applicationCode: ELECTRICMANAGE)，支持多选
 */
export const DeviceBindModal = defineComponent({
  name: "DeviceBindModal",
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    selectedIds: {
      type: Array as PropType<string[]>,
      default: () => [],
    },
    initialBindings: {
      type: Array as PropType<DeviceBinding[]>,
      default: () => [],
    },
  },
  emits: {
    "update:visible": (_v: boolean) => true,
    confirm: (_payload: { selectedIds: string[]; bindings: DeviceBinding[] }) => true,
  },
  setup(props: DeviceBindModalProps, { emit }) {
    const DeviceService = useGraphDeviceClient();
    const loading = ref(false);
    const dataSource = ref<ApplicationDevice[]>([]);
    const areas = ref<{ id: string; name: string }[]>([]);
    const keyword = ref("");
    const areaId = ref("");
    const pageNumber = ref(1);
    const pageSize = ref(10);
    const total = ref(0);
    const selectedRowKeys = ref<(string | number)[]>([]);
    /** 按 deviceId 缓存已选记录，支持跨页多选 */
    const selectedRecordsMap = ref<Record<string, ApplicationDevice>>({});

    const queryParams = () => ({
      applicationCode: APPLICATION_CODE_ELECTRICMANAGE,
      areaId: areaId.value,
      keyword: keyword.value,
      pageNumber: pageNumber.value,
      pageSize: pageSize.value,
    });

    const fetchAreas = async (): Promise<void> => {
      try {
        const list = await DeviceService.getDeviceArea();
        areas.value = list;
      } catch (_ignore) {
        message.error("获取区域列表失败");
      }
    };

    const fetchDevices = async (): Promise<void> => {
      loading.value = true;
      try {
        const res = await DeviceService.getApplicationDevice(queryParams());
        dataSource.value = res.records ?? [];
        total.value = res.total ?? 0;
      } catch (_ignore) {
        message.error("获取设备列表失败");
        dataSource.value = [];
      } finally {
        loading.value = false;
      }
    };

    const onSearch = (): void => {
      pageNumber.value = 1;
      fetchDevices();
    };

    const onReset = (): void => {
      keyword.value = "";
      areaId.value = "";
      pageNumber.value = 1;
      fetchDevices();
    };

    const onPageChange = (page: number, size: number): void => {
      pageNumber.value = page;
      pageSize.value = size;
      fetchDevices();
    };

    const toDeviceBinding = (record: ApplicationDevice): DeviceBinding => ({
      deviceId: record.deviceId,
      deviceName: record.deviceName,
      deviceType: record.deviceType ?? "",
      position: record.areaName ?? record.deviceAreaName ?? "",
    });

    const onOk = (): void => {
      const selectedIds = selectedRowKeys.value as string[];
      const list = selectedIds.map((id) => selectedRecordsMap.value[id]).filter((r): r is ApplicationDevice => r != null);
      const bindings = list.map(toDeviceBinding);
      emit("confirm", { selectedIds, bindings });
      emit("update:visible", false);
      selectedRowKeys.value = [];
      selectedRecordsMap.value = {};
    };

    const onCancel = (): void => {
      emit("update:visible", false);
      selectedRowKeys.value = [];
      selectedRecordsMap.value = {};
    };

    watch(
      () => props.visible,
      (visible) => {
        if (visible) {
          fetchAreas();
          fetchDevices();
          const ids = props.selectedIds ?? [];
          const bindings = props.initialBindings ?? [];
          selectedRowKeys.value = ids.length > 0 ? [...ids] : [];
          const map: Record<string, ApplicationDevice> = {};
          for (const b of bindings) {
            map[b.deviceId] = bindingToApplicationDevice(b);
          }
          selectedRecordsMap.value = map;
        }
      },
    );

    watch(dataSource, (rows) => {
      if (!props.visible || rows.length === 0) {
        return;
      }
      const keySet = new Set(selectedRowKeys.value as string[]);
      const nextMap = { ...selectedRecordsMap.value };
      for (const r of rows) {
        if (keySet.has(r.deviceId)) {
          nextMap[r.deviceId] = r;
        }
      }
      selectedRecordsMap.value = nextMap;
    });

    const columns: ColumnsType<ApplicationDevice> = [
      {
        title: "序号",
        key: "index",
        width: 56,
        align: "center",
        customRender: ({ index }: { index: number }) => (pageNumber.value - 1) * pageSize.value + index + 1,
      },
      {
        title: "设备名称",
        dataIndex: "deviceName",
        ellipsis: true,
      },
      {
        title: "产品名称",
        dataIndex: "deviceProdName",
        ellipsis: true,
      },
      {
        title: "区域",
        dataIndex: "areaName",
        ellipsis: true,
      },
    ];

    return () => (
      <Modal
        class="device-bind-modal"
        title="关联设备"
        open={props.visible}
        width={830}
        maskClosable={false}
        onOk={onOk}
        onCancel={onCancel}
        okText="确定"
        cancelText="取消"
      >
        <div class="device-bind-modal__filter">
          <span class="device-bind-modal__filter-label">区域</span>
          <Select
            placeholder="请选择区域"
            allowClear
            options={areas.value.map((a) => ({ label: a.name, value: a.id }))}
            value={areaId.value || undefined}
            onChange={(value) => {
              areaId.value = typeof value === "string" ? value : "";
            }}
          />
          <span class="device-bind-modal__filter-label">设备名称</span>
          <Input
            placeholder="请输入设备名称"
            value={keyword.value}
            style={{ width: "200px" }}
            onUpdate:value={(v: string) => (keyword.value = v ?? "")}
            allowClear
          />
          <Button type="primary" onClick={onSearch}>
            查询
          </Button>
          <Button onClick={onReset}>重置</Button>
        </div>

        <div class="device-bind-modal__table-wrap">
          <Table
            rowKey="deviceId"
            columns={columns}
            dataSource={dataSource.value}
            loading={loading.value}
            size="small"
            pagination={false}
            scroll={{ y: 300 }}
            rowSelection={{
              type: "checkbox",
              selectedRowKeys: selectedRowKeys.value,
              preserveSelectedRowKeys: true,
              onChange: (keys: (string | number)[], rows: ApplicationDevice[]) => {
                const newKeys = keys as string[];
                selectedRowKeys.value = newKeys.slice();
                const nextMap: Record<string, ApplicationDevice> = {};
                const rowsById = new Map(rows.map((r) => [r.deviceId, r]));
                for (const id of newKeys) {
                  const fromPage = rowsById.get(id);
                  const cached = selectedRecordsMap.value[id];
                  if (fromPage != null) {
                    nextMap[id] = fromPage;
                  } else if (cached != null) {
                    nextMap[id] = cached;
                  }
                }
                selectedRecordsMap.value = nextMap;
              },
            }}
          />
        </div>

        <div class="device-bind-modal__footer-extra">
          <span class="device-bind-modal__selected-tip">
            已选择 <span class="device-bind-modal__selected-tip--count">{selectedRowKeys.value.length}</span> 条设备
          </span>
          <div class="device-bind-modal__pagination">
            <Pagination
              current={pageNumber.value}
              pageSize={pageSize.value}
              total={total.value}
              showSizeChanger
              pageSizeOptions={["10", "20", "50"]}
              showTotal={(t: number) => `共 ${t} 条`}
              onChange={onPageChange}
              onShowSizeChange={(_current: number, size: number) => {
                pageSize.value = size;
                pageNumber.value = 1;
                fetchDevices();
              }}
            />
          </div>
        </div>
      </Modal>
    );
  },
});

export default DeviceBindModal;
