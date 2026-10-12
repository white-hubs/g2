import {
  Button,
  Cascader,
  Checkbox,
  Form,
  FormItem,
  Input,
  Modal,
  Page,
  PageLayout,
  PopConfirm,
  PopOver,
  Select,
  Space,
  Table,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, type PropType } from "vue";

import { normalizeAlarmPage } from "./normalize-page";
import type { GemPageProps } from "./page-props";

type PickerRow = {
  id?: string | number;
  code?: string;
  name?: string;
  areaName?: string;
  area?: { name?: string; pathName?: string };
  productInfo?: {
    name?: string;
    modelName?: string;
    brandName?: string;
    productCategory?: { name?: string };
  };
};

type SelectOption = { label: string; value: string };
type TreeOption = Record<string, unknown>;

function unwrapList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  const list = data.records ?? data.list ?? data.content ?? data.children ?? data.data;
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
}

function mapSelectOptions(rows: Record<string, unknown>[], valueKeys: string[], labelKeys: string[]): SelectOption[] {
  return rows.flatMap((row) => {
    const value = valueKeys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    if (value === undefined || value === null || value === "") return [];
    const label = labelKeys.map((key) => row[key]).find((item) => item !== undefined && item !== null && item !== "");
    return [{ value: String(value), label: String(label ?? value) }];
  });
}

const textCell = (value: unknown) => <PopOver content={String(value || "")}>{String(value || "--")}</PopOver>;

export default defineComponent({
  name: "GemApplicationEquipment",
  props: {
    codes: { type: Object as PropType<GemPageProps["codes"]>, required: true },
    functionCodes: { type: [Object, Array] as PropType<GemPageProps["functionCodes"]>, required: true },
    onNavigatePage: { type: Function as PropType<GemPageProps["onNavigatePage"]>, required: true },
    getDeviceClient: { type: Function as PropType<GemPageProps["getDeviceClient"]>, required: true },
    getOuaaClient: { type: Function as PropType<GemPageProps["getOuaaClient"]> },
    applicationCode: { type: String, default: "" },
    title: { type: String, default: "门禁设备" },
  },
  setup(props) {
    const applicationCode = () => props.applicationCode || "DOORMANAGE";
    const selectedKeys = ref<Array<string | number>>([]);
    const search = reactive({ pageNumber: 1, pageSize: 10, total: 0, keyword: "" });

    const associateOpen = ref(false);
    const associateLoading = ref(false);
    const associateRows = ref<PickerRow[]>([]);
    const associateSelected = ref<Array<string | number>>([]);
    const associateSearch = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      keyword: "",
      productId: "",
      categoryCode: [] as string[],
      anyMatchedAreaId: [] as string[],
      anyMatchedDepartmentId: [] as string[],
      tagCodes: [] as string[],
    });
    const associateSelectAll = ref(false);
    const associateOptionsLoaded = ref(false);
    const productOptions = ref<SelectOption[]>([]);
    const categoryOptions = ref<TreeOption[]>([]);
    const areaOptions = ref<TreeOption[]>([]);
    const departmentOptions = ref<TreeOption[]>([]);
    const tagOptions = ref<SelectOption[]>([]);

    const emptyOpen = ref(false);
    const emptyLoading = ref(false);
    const emptyCount = ref(0);
    const emptyInput = ref("");

    const [PcTable, tableApi] = usePcTable({
      rowKey: "id",
      tableCode: "import-device-list",
      rowSelection: "checkbox",
      rowSelectionChange: (keys) => {
        selectedKeys.value = keys as Array<string | number>;
      },
      columns: [
        {
          dataIndex: "code",
          title: "设备编码",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "deviceName",
          title: "设备名称",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "deviceProdCategoryName",
          title: "产品品类",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "deviceProdName",
          title: "产品名称",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "brandName",
          title: "设备品牌",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "areaName",
          title: "所属区域",
          ellipsis: true,
          customRender: ({ text }: { text: unknown }) => textCell(text),
        },
        {
          dataIndex: "action",
          title: "操作",
          fixed: "right",
          width: 100,
          customRender: ({ record }: { record: Record<string, unknown> }) => (
            <PopConfirm
              title="是否移除当前选中？"
              onConfirm={async () => {
                if ((typeof record.id !== "string" && typeof record.id !== "number") || !props.getDeviceClient) return;
                const api = await props.getDeviceClient();
                await api.deleteSecurityDevice(record.id);
                message.success("操作成功");
                tableApi.query();
              }}
            >
              <Button type="link" size="small" danger>
                移除
              </Button>
            </PopConfirm>
          ),
        },
      ],
      fetchApi: async () => {
        if (!props.getDeviceClient) return { records: [], total: 0, pages: 0 };
        const api = await props.getDeviceClient();
        return normalizeAlarmPage(
          await api.getSecurityDevicePage(applicationCode(), {
            pageNumber: search.pageNumber,
            pageSize: search.pageSize,
            keyword: search.keyword,
          }),
        );
      },
      fetchLoaded: (data) => {
        search.total = data.total;
        selectedKeys.value = [];
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入设备名称" },
        },
      ],
      handleSubmit: (values) => {
        search.keyword = String(values.keyword || "");
        search.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.pageNumber = 1;
        tableApi.query();
      },
    });

    const loadAssociate = async () => {
      if (!props.getDeviceClient) return;
      associateLoading.value = true;
      try {
        const api = await props.getDeviceClient();
        const page = normalizeAlarmPage(
          await api.getIotDeviceList({
            filterTagCodes: [`builtin.app::${applicationCode()}`],
            applicationCode: applicationCode(),
            pageNumber: associateSearch.pageNumber,
            pageSize: associateSearch.pageSize,
            productId: associateSearch.productId,
            categoryCode: associateSearch.categoryCode.join("-"),
            keyword: associateSearch.keyword,
            anyMatchedAreaId: associateSearch.anyMatchedAreaId.join("-"),
            anyMatchedDepartmentId: associateSearch.anyMatchedDepartmentId.join("-"),
            tagCodes: associateSearch.tagCodes,
          }),
        );
        associateRows.value = page.records as PickerRow[];
        associateSearch.total = page.total;
      } finally {
        associateLoading.value = false;
      }
    };

    const openAssociate = () => {
      associateOpen.value = true;
      associateSelected.value = [];
      associateSelectAll.value = false;
      associateSearch.pageNumber = 1;
      if (!associateOptionsLoaded.value) void loadAssociateOptions();
      void loadAssociate();
    };

    const resetAssociateSearch = () => {
      Object.assign(associateSearch, {
        pageNumber: 1,
        keyword: "",
        productId: "",
        categoryCode: [],
        anyMatchedAreaId: [],
        anyMatchedDepartmentId: [],
        tagCodes: [],
      });
      associateSelectAll.value = false;
      associateSelected.value = [];
      void loadAssociate();
    };

    const loadAssociateOptions = async () => {
      if (!props.getDeviceClient) return;
      const api = await props.getDeviceClient();
      const [products, categories, areas, tags, departments] = await Promise.allSettled([
        api.getProductListAll(),
        api.getIotProductCategoryTree(),
        api.getAreaTree(applicationCode()),
        api.getCustomerTagListAll({ status: 1 }),
        props.getOuaaClient ? props.getOuaaClient().then((ouaa) => ouaa.getOrganizationTree({ enabled: true })) : Promise.resolve([]),
      ]);
      productOptions.value =
        products.status === "fulfilled" ? mapSelectOptions(unwrapList(products.value), ["id", "value"], ["prodName", "name", "label"]) : [];
      categoryOptions.value = categories.status === "fulfilled" ? unwrapList(categories.value) : [];
      areaOptions.value = areas.status === "fulfilled" ? unwrapList(areas.value) : [];
      tagOptions.value =
        tags.status === "fulfilled"
          ? mapSelectOptions(unwrapList(tags.value), ["tagCode", "code", "value"], ["tagName", "name", "label"])
          : [];
      departmentOptions.value = departments.status === "fulfilled" ? (departments.value as unknown as TreeOption[]) : [];
      associateOptionsLoaded.value = true;
    };

    const confirmAssociate = async () => {
      if (!associateSelectAll.value && !associateSelected.value.length) {
        message.warning("请选择设备");
        return;
      }
      if (!props.getDeviceClient) return;
      associateLoading.value = true;
      try {
        const api = await props.getDeviceClient();
        await api.addBatchSecurityDevice(
          associateSelectAll.value
            ? {
                applicationCode: applicationCode(),
                keyword: associateSearch.keyword,
                productId: associateSearch.productId,
                categoryCode: associateSearch.categoryCode.join("-"),
                anyMatchedAreaId: associateSearch.anyMatchedAreaId.join("-"),
                anyMatchedDepartmentId: associateSearch.anyMatchedDepartmentId.join("-"),
                tagCodes: associateSearch.tagCodes,
              }
            : {
                applicationCode: applicationCode(),
                matchedDeviceIds: associateSelected.value,
              },
        );
        message.success("关联成功");
        associateOpen.value = false;
        tableApi.query();
      } finally {
        associateLoading.value = false;
      }
    };

    const removeBatch = async () => {
      if (!selectedKeys.value.length) {
        message.warning("请选择设备");
        return;
      }
      if (!props.getDeviceClient) return;
      const api = await props.getDeviceClient();
      await api.deleteSecurityDeviceBatch(selectedKeys.value);
      message.success("操作成功");
      tableApi.query();
    };

    const prepareEmpty = async () => {
      if (search.total === 0) {
        message.warning("至少清空一项设备");
        return;
      }
      if (!props.getDeviceClient) return;
      const hide = message.loading("请求中...", 0);
      try {
        emptyCount.value = search.total;
        emptyInput.value = "";
        emptyOpen.value = true;
      } finally {
        hide();
      }
    };

    const confirmEmpty = async () => {
      if (emptyInput.value.trim() !== "清空满足筛选条件的设备") {
        message.warning("验证未通过");
        return;
      }
      if (!props.getDeviceClient) return;
      emptyLoading.value = true;
      try {
        const api = await props.getDeviceClient();
        await api.clearSecurityDevice({ applicationCode: applicationCode(), keyword: search.keyword });
        message.success("操作成功");
        emptyOpen.value = false;
        tableApi.query();
      } finally {
        emptyLoading.value = false;
      }
    };

    const associateColumns = [
      { dataIndex: "code", title: "设备编码", ellipsis: true },
      { dataIndex: "name", title: "设备名称", ellipsis: true },
      {
        dataIndex: "genreName",
        title: "产品品类",
        customRender: ({ record }: { record: PickerRow }) => record.productInfo?.productCategory?.name || "--",
      },
      {
        dataIndex: "modelName",
        title: "产品名称",
        customRender: ({ record }: { record: PickerRow }) => record.productInfo?.name || "--",
      },
      {
        dataIndex: "brandName",
        title: "设备品牌",
        customRender: ({ record }: { record: PickerRow }) => record.productInfo?.brandName || "--",
      },
      {
        dataIndex: "areaName",
        title: "所属区域",
        ellipsis: true,
        customRender: ({ record }: { record: PickerRow }) => record.area?.pathName || record.areaName || "--",
      },
    ];

    const slots = {
      "layout-header": () => (
        <Space>
          <Button type="primary" onClick={openAssociate}>
            关联设备
          </Button>
        </Space>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <Space>
            <span>已选{selectedKeys.value.length}项</span>
            <PopConfirm title="是否确认移除" okText="确定" cancelText="取消" onConfirm={() => void removeBatch()}>
              <Button type="primary" danger disabled={!selectedKeys.value.length}>
                批量移除
              </Button>
            </PopConfirm>
            <Button type="primary" danger onClick={() => void prepareEmpty()}>
              清空满足筛选条件的设备
            </Button>
          </Space>
          <Page
            current={search.pageNumber}
            pageSize={search.pageSize}
            total={search.total}
            showSizeChanger
            pageSizeOptions={["10", "20", "50"]}
            showTotal={(total: number) => `共 ${total} 条数据`}
            onPageChange={(pageNumber: number, pageSize: number) => {
              search.pageNumber = pageNumber;
              search.pageSize = pageSize;
              tableApi.query();
            }}
          />
        </div>
      ),
    };

    return () => (
      <>
        <PageLayout title={props.title} v-slots={slots} />
        <Modal
          open={associateOpen.value}
          title="设备"
          width={960}
          okText="确定"
          cancelText="取消"
          confirmLoading={associateLoading.value}
          onCancel={() => {
            associateOpen.value = false;
          }}
          onOk={() => void confirmAssociate()}
        >
          <Form layout="inline" style={{ rowGap: "10px", marginBottom: "10px" }}>
            <FormItem label="所属产品">
              <Select
                value={associateSearch.productId || undefined}
                options={productOptions.value}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="请选择所属产品"
                style={{ width: 180 }}
                onUpdate:value={(value: unknown) => {
                  associateSearch.productId = String(value ?? "");
                }}
              />
            </FormItem>
            <FormItem label="产品品类">
              <Cascader
                value={associateSearch.categoryCode}
                options={categoryOptions.value}
                fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
                allowClear
                changeOnSelect
                showSearch
                placeholder="请选择产品品类"
                style={{ width: 180 }}
                onUpdate:value={(value: unknown) => {
                  associateSearch.categoryCode = Array.isArray(value) ? value.map(String) : [];
                }}
              />
            </FormItem>
            <FormItem label="所在区域">
              <Cascader
                value={associateSearch.anyMatchedAreaId}
                options={areaOptions.value}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                allowClear
                changeOnSelect
                showSearch
                placeholder="请选择所在区域"
                style={{ width: 200 }}
                onUpdate:value={(value: unknown) => {
                  associateSearch.anyMatchedAreaId = Array.isArray(value) ? value.map(String) : [];
                }}
              />
            </FormItem>
            <FormItem label="维护部门">
              <Cascader
                value={associateSearch.anyMatchedDepartmentId}
                options={departmentOptions.value}
                fieldNames={{ label: "name", value: "id", children: "children" }}
                allowClear
                changeOnSelect
                showSearch
                placeholder="请选择维护部门"
                style={{ width: 180 }}
                onUpdate:value={(value: unknown) => {
                  associateSearch.anyMatchedDepartmentId = Array.isArray(value) ? value.map(String) : [];
                }}
              />
            </FormItem>
            <FormItem label="设备标签">
              <Select
                value={associateSearch.tagCodes}
                options={tagOptions.value}
                mode="multiple"
                allowClear
                showSearch
                optionFilterProp="label"
                maxTagCount={1}
                placeholder="请选择设备标签"
                style={{ width: 200 }}
                onUpdate:value={(value: unknown) => {
                  associateSearch.tagCodes = Array.isArray(value) ? value.map(String) : [];
                }}
              />
            </FormItem>
            <FormItem>
              <Input
                value={associateSearch.keyword}
                allowClear
                placeholder="请输入设备名称或编码"
                style={{ width: 200 }}
                onUpdate:value={(value: string) => {
                  associateSearch.keyword = value;
                }}
                onPressEnter={() => {
                  associateSearch.pageNumber = 1;
                  void loadAssociate();
                }}
              />
            </FormItem>
            <FormItem>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    associateSearch.pageNumber = 1;
                    void loadAssociate();
                  }}
                >
                  查询
                </Button>
                <Button onClick={resetAssociateSearch}>重置</Button>
                <Checkbox
                  checked={associateSelectAll.value}
                  onUpdate:checked={(value: boolean) => {
                    associateSelectAll.value = value;
                  }}
                >
                  勾选当前所有
                </Checkbox>
              </Space>
            </FormItem>
          </Form>
          <Table
            rowKey="id"
            loading={associateLoading.value}
            columns={associateColumns}
            dataSource={associateRows.value}
            pagination={false}
            locale={{ emptyText: "暂无数据" }}
            rowSelection={{
              selectedRowKeys: associateSelected.value,
              preserveSelectedRowKeys: true,
              onChange: (keys: Array<string | number>) => {
                associateSelected.value = keys;
              },
            }}
          />
          <div style={{ marginTop: 12, textAlign: "right" }}>
            <Page
              current={associateSearch.pageNumber}
              pageSize={associateSearch.pageSize}
              total={associateSearch.total}
              showSizeChanger={false}
              syncToUrl={false}
              showTotal={(total: number) => `共 ${total} 条`}
              onPageChange={(pageNumber: number, pageSize: number) => {
                associateSearch.pageNumber = pageNumber;
                associateSearch.pageSize = pageSize;
                void loadAssociate();
              }}
            />
          </div>
        </Modal>
        <Modal
          open={emptyOpen.value}
          title="清空设备"
          okText="确认清空"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          confirmLoading={emptyLoading.value}
          onCancel={() => {
            emptyOpen.value = false;
          }}
          onOk={() => void confirmEmpty()}
        >
          <p>请确认：清空数量 {emptyCount.value}，清空操作不可恢复。</p>
          <p>
            请手动输入“
            <span style={{ color: "tomato" }}>清空满足筛选条件的设备</span>
            ”，完成验证
          </p>
          <Input
            value={emptyInput.value}
            onUpdate:value={(v: string) => {
              emptyInput.value = v;
            }}
          />
        </Modal>
      </>
    );
  },
});
