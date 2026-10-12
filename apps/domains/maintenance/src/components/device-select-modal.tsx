import { Button, Cascader, Form, FormItem, Input, Modal, Page, PopOver, Table, ZhConfigProvider, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { getDeviceCenterClient, getMaintenanceRuntime, getMdataClient } from "@/domain-context";
import { toTextArray } from "@/utils/form-value";
import { PRODUCT_CATEGORY_FIELD_NAMES, loadProductCategoryTree, type ProductCategoryNode } from "@/utils/product-category";
import { asArray, asPageResult } from "@/utils/response";

/** 设备实例台账行（旧页只读取这几个嵌套字段）。 */
export interface MaintenanceDeviceRecord {
  id: string;
  name?: string;
  code?: string;
  productInfo?: { productCategory?: { name?: string; code?: string; pathCode?: string } };
  department?: { name?: string };
  area?: { pathName?: string; pathId?: string };
  [key: string]: unknown;
}

interface AreaNode {
  id: string;
  name: string;
  children?: AreaNode[];
}

const AREA_FIELD_NAMES = { label: "name", value: "id", children: "children" };

/** 叶子带空 children 时 Cascader 会渲染无效箭头，这里生成渲染副本剔除。 */
function stripEmptyAreaChildren(nodes: AreaNode[]): AreaNode[] {
  return nodes.map((node) => {
    const children = Array.isArray(node.children) && node.children.length > 0 ? stripEmptyAreaChildren(node.children) : undefined;
    return children ? { ...node, children } : { id: node.id, name: node.name };
  });
}

export const DeviceSelectModal = defineComponent({
  name: "MaintenanceDeviceSelectModal",
  props: {
    open: Boolean,
    title: { type: String, default: "添加维保对象" },
    /** 已选设备，用于回显勾选状态。 */
    value: { type: Array as PropType<MaintenanceDeviceRecord[]>, default: () => [] },
  },
  emits: ["update:open", "ok"],
  setup(props, { emit }) {
    const searchForm = reactive<{ prodCategoryCode: string[]; anyMatchedAreaId: string[]; keyword: string }>({
      prodCategoryCode: [],
      anyMatchedAreaId: [],
      keyword: "",
    });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const dataSource = ref<MaintenanceDeviceRecord[]>([]);
    const loading = ref(false);
    const categoryOptions = ref<ProductCategoryNode[]>([]);
    const areaOptions = ref<AreaNode[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<MaintenanceDeviceRecord[]>([]);
    let queryToken = 0;

    const loadDevices = async (): Promise<void> => {
      const token = ++queryToken;
      loading.value = true;
      try {
        const { applicationCode } = getMaintenanceRuntime();
        const client = await getDeviceCenterClient();
        const response = await client.getIotDeviceList({
          // 旧页按「应用内建标签」过滤本应用关联设备。
          filterTagCodes: [`builtin.app::${applicationCode}`],
          applicationCode,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: searchForm.keyword,
          categoryCode: searchForm.prodCategoryCode.join("-"),
          anyMatchedAreaId: searchForm.anyMatchedAreaId.join("-"),
        });
        if (token !== queryToken) {
          return;
        }
        const result = asPageResult<MaintenanceDeviceRecord>(response);
        dataSource.value = result.records;
        page.total = result.total;
      } catch (error) {
        if (token === queryToken) {
          message.error(error instanceof Error ? error.message : "设备列表加载失败");
        }
      } finally {
        if (token === queryToken) {
          loading.value = false;
        }
      }
    };

    const loadOptions = async (): Promise<void> => {
      try {
        const [categories, mdata] = await Promise.all([loadProductCategoryTree(), getMdataClient()]);
        categoryOptions.value = categories;
        areaOptions.value = stripEmptyAreaChildren(asArray<AreaNode>(await mdata.getAreaTree()));
      } catch (error) {
        message.error(error instanceof Error ? error.message : "筛选项加载失败");
      }
    };

    const reset = (): void => {
      searchForm.prodCategoryCode = [];
      searchForm.anyMatchedAreaId = [];
      searchForm.keyword = "";
      page.pageNumber = 1;
      void loadDevices();
    };

    const search = (): void => {
      page.pageNumber = 1;
      void loadDevices();
    };

    /** 打开时同步回显已选设备并重新查询，与旧页 openModal → reset 行为一致。 */
    const open = (): void => {
      selectedKeys.value = props.value.map((item) => String(item.id));
      selectedRows.value = [...props.value];
      if (categoryOptions.value.length === 0 || areaOptions.value.length === 0) {
        void loadOptions();
      }
      reset();
    };

    // 每次打开弹框都重新回显已选并查询，等价于旧页 `openModal` → `reset`。
    watch(
      () => props.open,
      (visible) => {
        if (visible) {
          open();
        }
      },
    );

    const close = (): void => {
      emit("update:open", false);
    };

    const confirm = (): void => {
      if (selectedRows.value.length === 0) {
        message.warning("请选择设备");
        return;
      }
      emit("ok", [...selectedRows.value]);
      close();
    };

    const ellipsisCell = (text?: string | null): JSX.Element => (
      <PopOver placement="topLeft" content={text ?? ""}>
        {text || "--"}
      </PopOver>
    );

    const columns = [
      { title: "设备名称", dataIndex: "name", ellipsis: true, customRender: ({ text }: { text?: string }) => ellipsisCell(text) },
      {
        title: "产品品类",
        dataIndex: "productCategoryName",
        ellipsis: true,
        customRender: ({ record }: { record: MaintenanceDeviceRecord }) => ellipsisCell(record.productInfo?.productCategory?.name),
      },
      {
        title: "维护部门",
        dataIndex: "departmentName",
        ellipsis: true,
        customRender: ({ record }: { record: MaintenanceDeviceRecord }) => ellipsisCell(record.department?.name),
      },
      {
        title: "所属区域",
        dataIndex: "areaName",
        width: 200,
        ellipsis: true,
        customRender: ({ record }: { record: MaintenanceDeviceRecord }) => ellipsisCell(record.area?.pathName),
      },
    ];

    return () => (
      <ZhConfigProvider>
        <Modal open={props.open} title={props.title} width="1000px" okText="确定" cancelText="取消" onOk={confirm} onCancel={close}>
          <Form layout="inline" style={{ marginBottom: "12px" }}>
            <FormItem label="产品品类">
              <Cascader
                value={searchForm.prodCategoryCode}
                options={categoryOptions.value}
                fieldNames={PRODUCT_CATEGORY_FIELD_NAMES}
                changeOnSelect
                allowClear
                placeholder="请输入"
                style={{ width: "200px" }}
                onUpdate:value={(raw: unknown) => {
                  searchForm.prodCategoryCode = toTextArray(raw);
                }}
              />
            </FormItem>
            <FormItem>
              <Cascader
                value={searchForm.anyMatchedAreaId}
                options={areaOptions.value}
                fieldNames={AREA_FIELD_NAMES}
                changeOnSelect
                showSearch
                allowClear
                placeholder="请选择所在区域"
                style={{ width: "200px" }}
                onUpdate:value={(raw: unknown) => {
                  searchForm.anyMatchedAreaId = toTextArray(raw);
                }}
              />
            </FormItem>
            <FormItem>
              <Input
                value={searchForm.keyword}
                placeholder="请输入设备名称或编码"
                allowClear
                onPressEnter={search}
                onUpdate:value={(value: string) => {
                  searchForm.keyword = value;
                }}
              />
            </FormItem>
            <FormItem>
              <Button type="primary" onClick={search}>
                查询
              </Button>
            </FormItem>
            <FormItem>
              <Button onClick={reset}>重置</Button>
            </FormItem>
          </Form>
          <Table
            rowKey="id"
            size="middle"
            loading={loading.value}
            pagination={false}
            scroll={{ y: 480 }}
            columns={columns}
            dataSource={dataSource.value}
            rowSelection={{
              selectedRowKeys: selectedKeys.value,
              // 跨页保留已选：合并本页选中与其他页已选行。
              onChange: (keys: (string | number)[], rows: MaintenanceDeviceRecord[]) => {
                const pageIds = new Set(dataSource.value.map((item) => String(item.id)));
                const kept = selectedRows.value.filter((item) => !pageIds.has(String(item.id)));
                selectedRows.value = [...kept, ...rows];
                selectedKeys.value = selectedRows.value.map((item) => String(item.id));
                void keys;
              },
            }}
          />
          <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
            <Page
              syncToUrl={false}
              cachePageQuery={false}
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              onPageChange={(pageNumber: number, pageSize: number) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                void loadDevices();
              }}
            />
          </div>
        </Modal>
      </ZhConfigProvider>
    );
  },
});
