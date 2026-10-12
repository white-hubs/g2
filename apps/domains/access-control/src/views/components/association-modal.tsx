import type {
  AccessControlClient,
  AccessControlRecord,
  DeviceProductCategoryRecord,
  DeviceProductRecord,
  DoorDeviceRecord,
  DoorTypeRecord,
} from "@g2-contract/access-control";
import { defineComponent, inject, onMounted, reactive } from "vue";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "../../domain-context";
import { normalizeDevicePage } from "../device-actions";
import { defineAsyncAccessPcUiComponent, accessPcUiMessage as message } from "../pc-ui-runtime";

export interface AssociationModalExpose {
  open: () => void;
  close: () => void;
}

export interface AssociationResult {
  type: string;
  list: DoorDeviceRecord[];
}

export default defineComponent({
  name: "AssociationModal",
  emits: ["submit"],
  setup: (_props, { emit, expose }) => {
    const ctx = inject(DOMAIN_CONTEXT_KEY);
    const applicationCode = inject(APPLICATION_CODE_KEY, "ACCESS_CONTROL");
    if (!ctx) {
      throw new Error("AssociationModal requires DomainContext");
    }
    const Button = defineAsyncAccessPcUiComponent("Button");
    const Cascader = defineAsyncAccessPcUiComponent("Cascader");
    const Form = defineAsyncAccessPcUiComponent("Form");
    const FormItem = defineAsyncAccessPcUiComponent("FormItem");
    const Input = defineAsyncAccessPcUiComponent("Input");
    const Modal = defineAsyncAccessPcUiComponent("Modal");
    const Page = defineAsyncAccessPcUiComponent("Page");
    const Select = defineAsyncAccessPcUiComponent("Select");
    const Space = defineAsyncAccessPcUiComponent("Space");
    const Step = defineAsyncAccessPcUiComponent("Step");
    const Steps = defineAsyncAccessPcUiComponent("Steps");
    const Table = defineAsyncAccessPcUiComponent("Table");

    const state = reactive({
      open: false,
      loading: false,
      step: 0,
      type: "",
      keyword: "",
      productId: "",
      categoryCodes: [] as string[],
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      rows: [] as DoorDeviceRecord[],
      selectedRowKeys: [] as Array<string | number>,
      selectedRows: [] as DoorDeviceRecord[],
      doorTypes: [] as DoorTypeRecord[],
      products: [] as DeviceProductRecord[],
      categories: [] as DeviceProductCategoryRecord[],
    });

    const client = async (): Promise<AccessControlClient> => ctx.ensureClient<AccessControlClient>("accessControlClient");

    const loadOptions = async (): Promise<void> => {
      const api = await client();
      const [doorTypes, products, categories] = await Promise.all([api.getDoorType({}), api.getProductAll({}), api.getDeviceProduct({})]);
      state.doorTypes = (doorTypes as DoorTypeRecord[]) || [];
      state.products = (products as DeviceProductRecord[]) || [];
      state.categories = (categories as DeviceProductCategoryRecord[]) || [];
    };

    const loadDevices = async (): Promise<void> => {
      state.loading = true;
      try {
        const api = await client();
        const result = await api.getDeviceList({
          filterTagCodes: [`builtin.app::${applicationCode}`],
          applicationCode,
          pageNumber: state.pageNumber,
          pageSize: state.pageSize,
          keyword: state.keyword,
          productId: state.productId,
          categoryCode: state.categoryCodes.join("-"),
        });
        const page = normalizeDevicePage(result);
        state.rows = page.records as DoorDeviceRecord[];
        state.total = page.total;
      } finally {
        state.loading = false;
      }
    };

    const resetSearch = (): void => {
      state.keyword = "";
      state.productId = "";
      state.categoryCodes = [];
      state.pageNumber = 1;
      void loadDevices();
    };

    const open = (): void => {
      Object.assign(state, {
        open: true,
        step: 0,
        type: "",
        selectedRowKeys: [],
        selectedRows: [],
      });
      resetSearch();
    };
    const close = (): void => {
      state.open = false;
    };

    const next = (): void => {
      if (!state.type) {
        message.warning("请选择门禁类型");
        return;
      }
      state.step = 1;
    };
    const submit = (): void => {
      if (!state.selectedRows.length) {
        message.warning("请选择设备");
        return;
      }
      emit("submit", { type: state.type, list: state.selectedRows } satisfies AssociationResult);
    };

    expose({ open, close });
    onMounted(() => {
      void loadOptions();
    });

    const columns = [
      { dataIndex: "name", title: "设备名称", ellipsis: true },
      {
        dataIndex: "productName",
        title: "所属产品",
        ellipsis: true,
        customRender: ({ record }: { record: AccessControlRecord }) => String((record.productInfo as AccessControlRecord)?.name || "--"),
      },
      {
        dataIndex: "productCategoryName",
        title: "产品品类",
        ellipsis: true,
        customRender: ({ record }: { record: AccessControlRecord }) =>
          String(((record.productInfo as AccessControlRecord)?.productCategory as AccessControlRecord)?.name || "--"),
      },
      {
        dataIndex: "departmentName",
        title: "维护部门",
        ellipsis: true,
        customRender: ({ record }: { record: AccessControlRecord }) => String((record.department as AccessControlRecord)?.name || "--"),
      },
      {
        dataIndex: "areaName",
        title: "所属区域",
        ellipsis: true,
        customRender: ({ record }: { record: AccessControlRecord }) => String((record.area as AccessControlRecord)?.pathName || "--"),
      },
    ];

    return () => (
      <Modal
        open={state.open}
        title="导入门禁设备"
        width="1000px"
        okText={state.step === 0 ? "下一步" : "确定"}
        onCancel={close}
        onOk={state.step === 0 ? next : submit}
        onUpdate:open={(visible: boolean) => {
          state.open = visible;
        }}
      >
        <Steps size="small" current={state.step}>
          <Step title="选择门禁类型" />
          <Step title="选择设备" />
        </Steps>
        {state.step === 0 ? (
          <Form class="association-type-form">
            <FormItem label="门禁类型" required>
              <Select
                value={state.type}
                options={state.doorTypes.map((item) => ({
                  value: String(item.value || item.id || ""),
                  label: String(item.doorTypeName || item.label || "--"),
                }))}
                onUpdate:value={(value: unknown) => {
                  state.type = value != null ? String(value) : "";
                }}
              />
            </FormItem>
          </Form>
        ) : (
          <>
            <Form layout="inline" class="association-search-form">
              <FormItem label="所属产品">
                <Select
                  allowClear
                  value={state.productId}
                  options={state.products.map((item) => ({
                    value: String(item.value || item.id || ""),
                    label: String(item.prodName || item.name || "--"),
                  }))}
                  onUpdate:value={(value: unknown) => {
                    state.productId = value != null ? String(value) : "";
                  }}
                />
              </FormItem>
              <FormItem label="产品品类">
                <Cascader
                  value={state.categoryCodes}
                  options={state.categories as unknown as Array<Record<string, unknown>>}
                  fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
                  onUpdate:value={(value: unknown) => {
                    state.categoryCodes = Array.isArray(value) ? (value as string[]) : [];
                  }}
                />
              </FormItem>
              <FormItem>
                <Input
                  value={state.keyword}
                  placeholder="请输入设备名称或编码"
                  onUpdate:value={(value: string) => {
                    state.keyword = value;
                  }}
                />
              </FormItem>
              <FormItem>
                <Space>
                  <Button
                    type="primary"
                    onClick={() => {
                      state.pageNumber = 1;
                      void loadDevices();
                    }}
                  >
                    查询
                  </Button>
                  <Button onClick={resetSearch}>重置</Button>
                </Space>
              </FormItem>
            </Form>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={state.rows}
              loading={state.loading}
              pagination={false}
              scroll={{ y: 420 }}
              rowSelection={{
                selectedRowKeys: state.selectedRowKeys,
                onChange: (keys: Array<string | number>, rows: unknown[]) => {
                  state.selectedRowKeys = keys;
                  state.selectedRows = rows as DoorDeviceRecord[];
                },
              }}
            />
            <Page
              current={state.pageNumber}
              pageSize={state.pageSize}
              total={state.total}
              showQuickJumper={false}
              showSizeChanger
              showTotal={(total: number) => `共 ${total} 条`}
              pageSizeOptions={["10", "20", "50", "100"]}
              syncToUrl={false}
              onPageChange={(pageNumber: number, pageSize: number) => {
                state.pageNumber = pageNumber;
                state.pageSize = pageSize;
                void loadDevices();
              }}
            />
          </>
        )}
      </Modal>
    );
  },
});
