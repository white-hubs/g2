import type { DeviceCenterClient } from "@g2-client/device-center/client";
import {
  Button,
  Cascader,
  Checkbox,
  Empty,
  FormItem,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  message,
} from "@g2-platform/pc-ui";
import { defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { normalizeAlarmPage } from "../../normalize-page";
import { mapAreaCascaderOptions, parseApplicationProductOptions, type AreaCascaderOption } from "./alarm-config.model";
import type { AlarmDeviceValue, DeviceTypeAlarm } from "./types";

type SecurityDeviceRow = {
  id?: string | number;
  deviceId?: string | number;
  deviceName?: string;
  brandName?: string;
  deviceProdCategoryName?: string;
  deviceProdCategoryCodeConcat?: string;
  deviceProdName?: string;
  deviceProdId?: string;
  areaId?: string;
  areaName?: string;
};

function toDeviceTypeAlarm(record: SecurityDeviceRow): DeviceTypeAlarm {
  return {
    conditionType: "",
    deviceName: String(record.deviceName || ""),
    deviceAreaId: String(record.areaId || ""),
    deviceAreaName: String(record.areaName || ""),
    deviceProdCategoryCodeConcat: record.deviceProdCategoryCodeConcat,
    deviceProdCategoryName: record.deviceProdCategoryName,
    deviceProdId: record.deviceProdId,
    deviceProdName: record.deviceProdName,
    id: String(record.id ?? record.deviceId ?? ""),
    deviceId: String(record.deviceId ?? record.id ?? ""),
    enabled: true,
  };
}

export default defineComponent({
  name: "GemAlarmDevice",
  props: {
    info: { type: Array as PropType<DeviceTypeAlarm[]>, default: () => [] },
    enabled: { type: Boolean, default: true },
    readonly: { type: Boolean, default: false },
    applicationCode: { type: String, default: "" },
    getDeviceClient: { type: Function as PropType<() => Promise<DeviceCenterClient>>, default: undefined },
  },
  setup(props, { expose }) {
    const deviceList = ref<DeviceTypeAlarm[]>([]);
    const selectedDelKeys = ref<string[]>([]);
    const modalOpen = ref(false);
    const modalLoading = ref(false);
    const modalRows = ref<SecurityDeviceRow[]>([]);
    const modalSelectedKeys = ref<string[]>([]);
    const modalPickedMap = ref<Map<string, DeviceTypeAlarm>>(new Map());
    const areaOptions = ref<AreaCascaderOption[]>([]);
    const productOptions = ref<{ label: string; value: string }[]>([]);
    const tagOptions = ref<{ label: string; value: string }[]>([]);
    const modalQuery = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      areaIds: "" as string,
      areaId: "" as string,
      keyword: "",
      productId: null as string | null,
      tagCodes: [] as string[],
      importAll: false,
    });

    watch(
      () => props.info,
      (info) => {
        deviceList.value = info?.length ? JSON.parse(JSON.stringify(info)) : [];
      },
      { immediate: true, deep: true },
    );

    async function loadAreaAndProducts(): Promise<void> {
      const applicationCode = props.applicationCode.trim();
      if (!applicationCode || !props.getDeviceClient) return;
      try {
        const client = await props.getDeviceClient();
        const [areasRaw, productsRaw, tagsRaw] = await Promise.all([
          client.getAreaTree(applicationCode),
          client.getApplicationModels(applicationCode),
          client.getCustomerTagListAll({ status: 1 }),
        ]);
        areaOptions.value = mapAreaCascaderOptions(areasRaw);
        productOptions.value = parseApplicationProductOptions(productsRaw);
        const tagPage = normalizeAlarmPage(tagsRaw);
        const tagList = tagPage.records.length ? tagPage.records : Array.isArray(tagsRaw) ? (tagsRaw as unknown[]) : [];
        tagOptions.value = tagList
          .map((item) => {
            const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
            const value = String(row.tagCode ?? row.code ?? row.id ?? "");
            const label = String(row.tagName ?? row.name ?? value);
            return value ? { label, value } : null;
          })
          .filter((x): x is { label: string; value: string } => !!x);
      } catch {
        areaOptions.value = [];
        productOptions.value = [];
        tagOptions.value = [];
      }
    }

    onMounted(() => {
      void loadAreaAndProducts();
    });

    watch(
      () => props.applicationCode,
      () => {
        void loadAreaAndProducts();
      },
    );

    const getValue = (): AlarmDeviceValue => ({
      enabled: props.enabled !== false,
      emergencyRuleConditions: deviceList.value,
    });

    function buildPageQuery(pageNumber: number, pageSize: number): Record<string, unknown> {
      return {
        pageNumber,
        pageSize,
        keyword: modalQuery.keyword || undefined,
        areaId: modalQuery.areaId || undefined,
        productId: modalQuery.productId || undefined,
        tagCodes: modalQuery.tagCodes.length ? modalQuery.tagCodes : undefined,
      };
    }

    async function loadModalRows(): Promise<void> {
      const applicationCode = props.applicationCode.trim();
      if (!applicationCode || !props.getDeviceClient) {
        modalRows.value = [];
        return;
      }
      modalLoading.value = true;
      try {
        const client = await props.getDeviceClient();
        const page = normalizeAlarmPage(
          await client.getSecurityDevicePage(applicationCode, buildPageQuery(modalQuery.pageNumber, modalQuery.pageSize)),
        );
        modalRows.value = page.records as SecurityDeviceRow[];
        modalQuery.total = page.total;
      } catch {
        modalRows.value = [];
      } finally {
        modalLoading.value = false;
      }
    }

    async function fetchAllModalRows(): Promise<SecurityDeviceRow[]> {
      const applicationCode = props.applicationCode.trim();
      if (!applicationCode || !props.getDeviceClient) return [];
      const client = await props.getDeviceClient();
      const pageSize = 500;
      const first = normalizeAlarmPage(await client.getSecurityDevicePage(applicationCode, buildPageQuery(1, pageSize)));
      const all = [...(first.records as SecurityDeviceRow[])];
      for (let page = 2; page <= first.pages; page += 1) {
        const next = normalizeAlarmPage(await client.getSecurityDevicePage(applicationCode, buildPageQuery(page, pageSize)));
        all.push(...(next.records as SecurityDeviceRow[]));
      }
      return all;
    }

    function syncModalPickedFromMap(): void {
      modalSelectedKeys.value = Array.from(modalPickedMap.value.keys());
    }

    function setModalPicked(record: SecurityDeviceRow, selected: boolean): void {
      const key = String(record.deviceId ?? record.id ?? "");
      if (!key) return;
      const next = new Map(modalPickedMap.value);
      if (selected) {
        next.set(key, toDeviceTypeAlarm(record));
      } else {
        next.delete(key);
      }
      modalPickedMap.value = next;
      syncModalPickedFromMap();
    }

    const openModal = (): void => {
      if (!props.applicationCode.trim()) {
        message.error("applicationCode is required from host Domain config");
        return;
      }
      modalPickedMap.value = new Map(deviceList.value.map((item) => [item.deviceId, item]));
      syncModalPickedFromMap();
      modalQuery.pageNumber = 1;
      modalQuery.importAll = false;
      modalOpen.value = true;
      void loadModalRows();
    };

    const confirmModal = async (): Promise<void> => {
      let picked = Array.from(modalPickedMap.value.values());
      if (modalQuery.importAll) {
        const allRows = await fetchAllModalRows();
        const merged = new Map(picked.map((item) => [item.deviceId, item]));
        for (const row of allRows) {
          const key = String(row.deviceId ?? row.id ?? "");
          if (key && !merged.has(key)) {
            merged.set(key, toDeviceTypeAlarm(row));
          }
        }
        picked = Array.from(merged.values());
      }
      deviceList.value = picked;
      modalOpen.value = false;
      modalQuery.importAll = false;
    };

    const handleDelDevice = (): void => {
      if (!selectedDelKeys.value.length) {
        message.error("请选择要删除的设备");
        return;
      }
      Modal.confirm({
        title: "删除设备",
        content: "删除后不可撤销",
        onOk: () => {
          deviceList.value = deviceList.value.filter((item) => !selectedDelKeys.value.includes(item.deviceId));
          selectedDelKeys.value = [];
        },
      });
    };

    const deleteOne = (record: DeviceTypeAlarm): void => {
      deviceList.value = deviceList.value.filter((item) => item.id !== record.id);
    };

    const toggleDeviceEnabled = (record: DeviceTypeAlarm, checked: boolean): void => {
      deviceList.value = deviceList.value.map((item) => (item.deviceId === record.deviceId ? { ...item, enabled: checked } : item));
    };

    const resetModalQuery = (): void => {
      modalQuery.pageNumber = 1;
      modalQuery.areaIds = "";
      modalQuery.areaId = "";
      modalQuery.keyword = "";
      modalQuery.productId = null;
      modalQuery.tagCodes = [];
      modalQuery.importAll = false;
      void loadModalRows();
    };

    expose({ getValue, openModal, handleDelDevice });

    const columns = [
      { title: "序号", width: 60, customRender: ({ index }: { index: number }) => index + 1 },
      { title: "设备名称", dataIndex: "deviceName" },
      { title: "设备品类", dataIndex: "deviceProdCategoryName" },
      { title: "产品名称", dataIndex: "deviceProdName" },
      { title: "设备区域", dataIndex: "deviceAreaName" },
      {
        title: "是否启用",
        dataIndex: "enabled",
        customRender: ({ record }: { record: DeviceTypeAlarm }) =>
          props.readonly ? (
            <span>{record.enabled !== false ? "启用" : "禁用"}</span>
          ) : (
            <Switch
              checked={record.enabled !== false}
              checkedChildren="启用"
              unCheckedChildren="禁用"
              onUpdate:checked={(v: boolean) => toggleDeviceEnabled(record, v)}
            />
          ),
      },
      ...(props.readonly
        ? []
        : [
            {
              title: "操作",
              width: 80,
              customRender: ({ record }: { record: DeviceTypeAlarm }) => (
                <Popconfirm title="确认删除当前设备" description="删除后不可撤销" onConfirm={() => deleteOne(record)}>
                  <Button type="link" danger>
                    删除
                  </Button>
                </Popconfirm>
              ),
            },
          ]),
    ];

    const modalColumns = [
      { title: "序号", width: 60, customRender: ({ index }: { index: number }) => index + 1 },
      { title: "设备名称", dataIndex: "deviceName" },
      { title: "设备品牌", dataIndex: "brandName" },
      { title: "产品名称", dataIndex: "deviceProdName" },
      { title: "区域", dataIndex: "areaName" },
    ];

    return () => {
      if (props.enabled === false) {
        return <Empty description="未开启指定设备，规则将应用于全部设备" />;
      }
      return (
        <div>
          {deviceList.value.length ? (
            <Table
              size="small"
              rowKey="deviceId"
              dataSource={deviceList.value}
              columns={columns}
              pagination={{
                showSizeChanger: true,
                showTotal: (total: number) => `共 ${total} 条`,
                pageSizeOptions: ["10", "50", "100", "1000"],
                defaultPageSize: 10,
              }}
              rowSelection={
                props.readonly
                  ? undefined
                  : {
                      selectedRowKeys: selectedDelKeys.value,
                      preserveSelectedRowKeys: true,
                      onChange: (keys: (string | number)[]) => {
                        selectedDelKeys.value = keys.map(String);
                      },
                    }
              }
            />
          ) : (
            <Empty description="暂无指定设备，请点击「添加设备」" />
          )}
          {!props.readonly ? (
            <Modal
              open={modalOpen.value}
              title="选择设备"
              width={1200}
              maskClosable
              cancelText="关闭"
              onCancel={() => {
                modalOpen.value = false;
                modalQuery.tagCodes = [];
              }}
              onOk={() => void confirmModal()}
            >
              <Space wrap style={{ marginBottom: 16 }}>
                <FormItem label="区域">
                  <Cascader
                    value={modalQuery.areaIds ? modalQuery.areaIds.split(",") : []}
                    style={{ width: 180 }}
                    placeholder="请选择区域"
                    options={areaOptions.value}
                    fieldNames={{ label: "name", value: "id", children: "children" }}
                    changeOnSelect
                    onUpdate:value={(v: string[]) => {
                      modalQuery.areaIds = v?.length ? v.join(",") : "";
                      modalQuery.areaId = v?.length ? v[v.length - 1] : "";
                    }}
                  />
                </FormItem>
                <FormItem label="设备标签">
                  <Select
                    style={{ width: 180 }}
                    placeholder="请选择设备标签"
                    options={tagOptions.value}
                    mode="multiple"
                    maxTagCount={1}
                    allowClear
                    value={modalQuery.tagCodes}
                    onUpdate:value={(v: string[]) => {
                      modalQuery.tagCodes = v ?? [];
                    }}
                  />
                </FormItem>
                <FormItem label="所属产品">
                  <Select
                    style={{ width: 180 }}
                    placeholder="请选择所属产品"
                    options={productOptions.value}
                    allowClear
                    value={modalQuery.productId ?? undefined}
                    onUpdate:value={(v: string) => {
                      modalQuery.productId = v || null;
                    }}
                  />
                </FormItem>
                <FormItem>
                  <Input
                    value={modalQuery.keyword}
                    placeholder="请输入设备名称"
                    onUpdate:value={(v: string) => {
                      modalQuery.keyword = v;
                    }}
                  />
                </FormItem>
                <FormItem>
                  <Button type="primary" loading={modalLoading.value} onClick={() => void loadModalRows()}>
                    查询
                  </Button>
                  <Button style={{ margin: "0 10px" }} onClick={resetModalQuery}>
                    重置
                  </Button>
                  <Checkbox
                    checked={modalQuery.importAll}
                    onUpdate:checked={(v: boolean) => {
                      modalQuery.importAll = v;
                    }}
                  >
                    勾选导入当前所有
                  </Checkbox>
                </FormItem>
              </Space>
              <Table
                pagination={false}
                rowKey={(row: SecurityDeviceRow) => String(row.deviceId ?? row.id ?? "")}
                loading={modalLoading.value}
                dataSource={modalRows.value}
                columns={modalColumns}
                rowSelection={{
                  selectedRowKeys: modalSelectedKeys.value,
                  preserveSelectedRowKeys: true,
                  onChange: (keys: (string | number)[]) => {
                    modalSelectedKeys.value = keys.map(String);
                  },
                  onSelect: (record: SecurityDeviceRow, selected: boolean) => {
                    setModalPicked(record, selected);
                  },
                  onSelectAll: (selected: boolean, _keys: (string | number)[], rows: SecurityDeviceRow[]) => {
                    for (const row of rows) {
                      setModalPicked(row, selected);
                    }
                  },
                }}
              />
              <div style={{ display: "flex", flexDirection: "row-reverse", marginTop: 16 }}>
                <Pagination
                  current={modalQuery.pageNumber}
                  pageSize={modalQuery.pageSize}
                  total={modalQuery.total}
                  showSizeChanger
                  showTotal={(total: number) => `共${total}条数据`}
                  onChange={(page: number, pageSize: number) => {
                    modalQuery.pageNumber = page;
                    modalQuery.pageSize = pageSize;
                    void loadModalRows();
                  }}
                />
              </div>
            </Modal>
          ) : null}
        </div>
      );
    };
  },
});
