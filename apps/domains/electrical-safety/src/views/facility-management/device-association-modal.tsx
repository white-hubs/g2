import type { DeviceKind } from "@g2-contract/electrical-safety";
import type { DeviceManagementPageItem, DeviceProductOption } from "@g2-contract/electrical-safety/references";
import { Modal, Page, Table, Tag, message, usePcForm } from "@g2-platform/pc-ui";
import type { PropType } from "vue";
import { computed, defineComponent, reactive, shallowRef, watch } from "vue";

import { listDeviceManagementPage, listDeviceProducts } from "@/api/references";

export const DeviceAssociationModal = defineComponent({
  name: "DeviceAssociationModal",
  props: {
    open: { type: Boolean, required: true },
    deviceKind: { type: String as PropType<DeviceKind>, required: true },
    associatedDeviceIds: { type: Array as PropType<string[]>, default: () => [] },
    submitting: { type: Boolean, default: false },
  },
  emits: {
    close: (): boolean => true,
    associate: (_deviceIds: string[]): boolean => true,
  },
  setup: (props, { emit }) => {
    const records = shallowRef<DeviceManagementPageItem[]>([]);
    const productOptions = shallowRef<DeviceProductOption[]>([]);
    const selectedDevices = shallowRef<Map<string, DeviceManagementPageItem>>(new Map());
    const loading = shallowRef(false);
    const filters = reactive({
      prodId: null as string | number | null,
      status: null as number | null,
      deviceNameOrNumber: "",
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });
    const associatedIds = computed(() => new Set(props.associatedDeviceIds.map(String)));
    const selectedDeviceIds = computed(() => Array.from(selectedDevices.value.keys()));
    const createSearchSchema = () => [
      {
        component: "Select",
        fieldName: "prodId",
        label: "所属产品",
        defaultValue: null,
        componentProps: {
          allowClear: true,
          options: productOptions.value.map((item) => ({ label: item.prodName, value: item.id })),
          placeholder: "请选择产品",
          showSearch: true,
          optionFilterProp: "label",
          style: { width: "180px" },
        },
      },
      {
        component: "Select",
        fieldName: "status",
        label: "设备状态",
        defaultValue: null,
        componentProps: {
          allowClear: true,
          options: [
            { label: "未激活", value: 0 },
            { label: "离线", value: 2 },
            { label: "在线", value: 1 },
            { label: "已禁用", value: 3 },
          ],
          placeholder: "请选择设备状态",
          style: { width: "180px" },
        },
      },
      {
        component: "Input",
        fieldName: "deviceNameOrNumber",
        label: "",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          maxlength: 200,
          placeholder: "设备名称/设备序列号",
          style: { width: "220px" },
        },
      },
    ];
    const columns = [
      { title: "设备名称", dataIndex: "name", width: 220, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "设备编码", dataIndex: "deviceNumber", width: 180, customRender: ({ text }: { text?: string }) => text || "--" },
      { title: "产品名称", dataIndex: "productName", width: 180, customRender: ({ text }: { text?: string }) => text || "--" },
      {
        title: "状态",
        dataIndex: "id",
        width: 100,
        customRender: ({ text }: { text: string }) =>
          associatedIds.value.has(String(text)) ? <Tag color="default">已关联</Tag> : <Tag color="blue">可关联</Tag>,
      },
    ];

    const loadCandidates = async (): Promise<void> => {
      loading.value = true;
      try {
        const normalizedKeyword = filters.deviceNameOrNumber.trim();
        const result = await listDeviceManagementPage({
          pageNumber: filters.pageNumber,
          pageSize: filters.pageSize,
          ...(filters.prodId != null ? { prodId: filters.prodId } : {}),
          ...(filters.status != null ? { status: filters.status } : {}),
          ...(normalizedKeyword ? { deviceNameOrNumber: normalizedKeyword } : {}),
        });
        filters.total = result.total;
        records.value = result.records;
      } catch {
        records.value = [];
        filters.total = 0;
      } finally {
        loading.value = false;
      }
    };

    const resetFilters = (): void => {
      filters.prodId = null;
      filters.status = null;
      filters.deviceNameOrNumber = "";
      filters.pageNumber = 1;
      filters.pageSize = 10;
      filters.total = 0;
    };

    const [CubeForm, formApi] = usePcForm({
      cache: false,
      layout: "horizontal",
      // 弹窗与页面内的筛选表单共存时，CubeForm 的列数计算会命中页面表单；
      // 保持展开，确保三个筛选项均可见。
      isCollapsed: false,
      syncStateRef: filters,
      schema: createSearchSchema(),
      handleSubmit: () => {
        filters.pageNumber = 1;
        void loadCandidates();
      },
      handleReset: () => {
        resetFilters();
        void loadCandidates();
      },
    });

    const loadProductOptions = async (): Promise<void> => {
      try {
        productOptions.value = await listDeviceProducts();
      } catch {
        productOptions.value = [];
      } finally {
        formApi.updateSchema(createSearchSchema());
      }
    };

    watch(
      () => props.open,
      (open) => {
        if (!open) {
          return;
        }
        resetFilters();
        formApi.setFormValues({ prodId: null, status: null, deviceNameOrNumber: "" });
        selectedDevices.value = new Map();
        records.value = [];
        void loadProductOptions();
        void loadCandidates();
      },
    );

    const handleAssociate = (): void => {
      const deviceIds = selectedDeviceIds.value;
      if (deviceIds.length === 0) {
        message.warning("请选择需要关联的设备");
        return;
      }
      emit("associate", deviceIds);
    };

    const handleSelectionChange = (keys: (string | number)[], rows: DeviceManagementPageItem[]): void => {
      const nextKeys = new Set(keys.map(String));
      const nextSelected = new Map(selectedDevices.value);

      for (const record of records.value) {
        const id = String(record.id);
        if (nextKeys.has(id)) {
          nextSelected.set(id, record);
        } else {
          nextSelected.delete(id);
        }
      }
      for (const row of rows) {
        const id = String(row.id);
        if (nextKeys.has(id)) {
          nextSelected.set(id, row);
        }
      }
      selectedDevices.value = nextSelected;
    };

    return (): JSX.Element => (
      <Modal
        okText="确定"
        cancelText="取消"
        open={props.open}
        title="关联设备"
        width="900px"
        wrapClassName="electrical-viewport-modal electrical-table-modal"
        destroyOnClose
        confirmLoading={props.submitting}
        onCancel={() => emit("close")}
        onOk={handleAssociate}
      >
        <div class="association-modal-content">
          <CubeForm />
          <div class="association-modal-table">
            <Table
              class="table-content"
              rowKey="id"
              columns={columns}
              dataSource={records.value}
              loading={loading.value}
              pagination={false}
              rowSelection={{
                type: "checkbox",
                selectedRowKeys: selectedDeviceIds.value,
                preserveSelectedRowKeys: true,
                getCheckboxProps: (record: DeviceManagementPageItem) => ({
                  disabled: associatedIds.value.has(String(record.id)),
                }),
                onChange: handleSelectionChange,
              }}
            />
          </div>
          <Page
            cachePageQuery={false}
            current={filters.pageNumber}
            pageSize={filters.pageSize}
            total={filters.total}
            onPageChange={(pageNumber: number, pageSize: number) => {
              filters.pageNumber = pageNumber;
              filters.pageSize = pageSize;
              void loadCandidates();
            }}
          />
        </div>
      </Modal>
    );
  },
});
