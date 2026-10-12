import { computed, defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { ClassifySettingsPage, DeviceList } from "@/api";
import { Button, Form, FormItem, Input, Modal, Pagination, Select, Table } from "@/pc-ui-runtime";

export const DeviceSelectModal = defineComponent({
  name: "DeviceSelectModal",
  props: {
    visible: { type: Boolean, default: false },
    selectedDeviceIds: { type: Array as PropType<string[]>, default: () => [] },
    selectedDevices: { type: Array as PropType<Array<Record<string, unknown>>>, default: () => [] },
  },
  emits: ["update:visible", "confirm"],
  setup(props, { emit }) {
    const modalVisible = ref(false);
    const loading = ref(false);
    const instrumentTypeList = ref<unknown[]>([]);
    const pagination = reactive({ total: 0, pages: 1, pageSize: 10, current: 1 });
    const dataSource = ref<Array<Record<string, unknown>>>([]);
    const searchForm = reactive({ instrumentType: "", keyword: "" });
    const selectedList = ref<Array<Record<string, unknown>>>([]);
    const selected = ref<string[]>([]);

    const columns = [
      { dataIndex: "code", title: "设备编码", align: "center" as const },
      { dataIndex: "deviceName", title: "设备名称", align: "center" as const },
      {
        dataIndex: "instrumentName",
        title: "设备类型",
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text || "--",
      },
      {
        dataIndex: "deviceAreaName",
        title: "所在区域",
        align: "center" as const,
        customRender: ({ text }: { text: string }) => text || "--",
      },
    ];

    const rowSelection = computed(() => ({
      selectedRowKeys: selected.value,
      onChange: (selectedRowKeys: (string | number)[], selectedRows: Array<Record<string, unknown>>) => {
        const currentPageDeviceIds = dataSource.value.map((item) => item.deviceId);
        const keys = selectedRowKeys.map(String);
        const otherPageSelected = selected.value.filter((id) => !currentPageDeviceIds.includes(id));
        selected.value = [...otherPageSelected, ...keys];
        const newSelectedRows = selectedRows.filter((row) => !selectedList.value.some((item) => item.deviceId === row.deviceId));
        selectedList.value = [...selectedList.value, ...newSelectedRows].filter((item) => selected.value.includes(String(item.deviceId)));
      },
      onSelectAll: (isSelected: boolean, _selectedRows: unknown[], changeRows: Array<Record<string, unknown>>) => {
        const currentPageDeviceIds = dataSource.value.map((item) => item.deviceId);
        if (isSelected) {
          const newSelectedIds = changeRows.map((row) => String(row.deviceId));
          const otherPageSelected = selected.value.filter((id) => !currentPageDeviceIds.includes(id));
          selected.value = [...otherPageSelected, ...newSelectedIds];
          const newRows = changeRows.filter((row) => !selectedList.value.some((item) => item.deviceId === row.deviceId));
          selectedList.value = [...selectedList.value, ...newRows];
        } else {
          selected.value = selected.value.filter((id) => !currentPageDeviceIds.includes(id));
          selectedList.value = selectedList.value.filter((item) => !currentPageDeviceIds.includes(item.deviceId));
        }
      },
    }));

    const getData = async () => {
      loading.value = true;
      try {
        const { data } = (await DeviceList({
          pageNumber: pagination.current,
          pageSize: pagination.pageSize,
          keyword: searchForm.keyword,
          instrumentType: searchForm.instrumentType,
        })) as { data: { records: Array<Record<string, unknown>>; total: number; pages: number } };
        dataSource.value = data.records;
        pagination.total = data.total;
        pagination.pages = data.pages;
        const currentPageDeviceIds = data.records.map((item) => item.deviceId);
        const currentPageSelectedIds = selected.value.filter((id) => currentPageDeviceIds.includes(id));
        if (currentPageSelectedIds.length > 0) {
          data.records
            .filter((item) => currentPageSelectedIds.includes(String(item.deviceId)))
            .forEach((row) => {
              if (!selectedList.value.some((item) => item.deviceId === row.deviceId)) selectedList.value.push(row);
            });
        }
      } finally {
        loading.value = false;
      }
    };

    const handleConfirm = () => {
      const allSelectedDevices = props.selectedDevices ? [...props.selectedDevices] : [];
      selectedList.value.forEach((device) => {
        if (!allSelectedDevices.some((item) => item.deviceId === device.deviceId)) allSelectedDevices.push(device);
      });
      const finalSelectedDevices = allSelectedDevices.filter((device) => selected.value.includes(String(device.deviceId)));
      emit("confirm", finalSelectedDevices);
      modalVisible.value = false;
    };

    watch(
      () => props.visible,
      (val) => {
        modalVisible.value = val;
        if (val) {
          if (props.selectedDeviceIds?.length) {
            selected.value = [...props.selectedDeviceIds];
            selectedList.value = props.selectedDevices?.length ? [...props.selectedDevices] : [];
          } else {
            selected.value = [];
            selectedList.value = [];
          }
          void getData();
        }
      },
      { immediate: true },
    );

    watch(
      () => modalVisible.value,
      (val) => emit("update:visible", val),
    );

    onMounted(async () => {
      const { data } = (await ClassifySettingsPage()) as { data: { records: unknown[] } };
      instrumentTypeList.value = data.records;
    });

    return () => (
      <Modal
        v-model:visible={modalVisible.value}
        title="设备"
        width="900px"
        onOk={handleConfirm}
        onCancel={() => {
          modalVisible.value = false;
        }}
        v-slots={{
          footer: () => (
            <>
              <Button
                onClick={() => {
                  modalVisible.value = false;
                }}
              >
                取消
              </Button>
              <Button type="primary" onClick={handleConfirm}>
                确定
              </Button>
            </>
          ),
        }}
      >
        <Form layout="inline" model={searchForm}>
          <FormItem label="设备类型:">
            <Select
              placeholder="请选择设备类型"
              v-model:value={searchForm.instrumentType}
              style="width: 180px"
              options={instrumentTypeList.value as never}
              allowClear
              fieldNames={{ label: "categoryName", value: "categoryCode" }}
            />
          </FormItem>
          <FormItem>
            <Input v-model:value={searchForm.keyword} placeholder="请输入设备名称或编码" style="width: 200px" />
          </FormItem>
          <FormItem>
            <Button type="primary" onClick={() => void getData()}>
              查询
            </Button>
          </FormItem>
          <FormItem>
            <Button
              onClick={() => {
                Object.assign(searchForm, { instrumentType: "", keyword: "" });
                pagination.current = 1;
                void getData();
              }}
            >
              重置
            </Button>
          </FormItem>
        </Form>
        <Table
          rowKey="deviceId"
          dataSource={dataSource.value}
          columns={columns}
          rowSelection={rowSelection.value}
          pagination={false}
          scroll={{ y: 380 }}
          size="middle"
          loading={loading.value}
          style="margin-top: 10px;"
        />
        <div style="display: flex;justify-content: flex-end;margin: 10px 0px;">
          <Pagination
            size="small"
            total={pagination.total}
            showTotal={(total: number) => `共 ${total} 条 第${pagination.current}/${pagination.pages}页`}
            v-model:current={pagination.current}
            v-model:pageSize={pagination.pageSize}
            onChange={(current: number, pageSize: number) => {
              pagination.current = current;
              pagination.pageSize = pageSize;
              void getData();
            }}
          />
        </div>
      </Modal>
    );
  },
});
