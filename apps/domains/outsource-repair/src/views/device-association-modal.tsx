import { Button, Cascader, Form, FormItem, Input, Modal, Page, PopOver, Table, ZhConfigProvider, message } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref, watch } from "vue";

import { getDeviceCenterClient, getOutsourceRepairRuntime } from "@/domain-context";
import { toTextArray } from "@/utils/form-value";
import { PRODUCT_CATEGORY_FIELD_NAMES, loadProductCategoryTree, type ProductCategoryNode } from "@/utils/product-category";
import { asPageResult } from "@/utils/response";

/** 设备实例台账行（旧弹窗只读取这几个嵌套字段）。 */
interface DeviceCandidate {
  id: string;
  code?: string;
  name?: string;
  productInfo?: { productCategory?: { name?: string }; brandName?: string };
  area?: { pathName?: string };
  [key: string]: unknown;
}

const ellipsisCell = (text: unknown): JSX.Element => (
  <PopOver placement="topLeft" content={text ? String(text) : ""}>
    {text ? String(text) : "--"}
  </PopOver>
);

export const DeviceAssociationModal = defineComponent({
  name: "OutsourceDeviceAssociationModal",
  props: { open: Boolean },
  emits: ["update:open", "ok"],
  setup(props, { emit }) {
    const searchForm = reactive<{ prodCategoryCode: string[]; keyword: string }>({ prodCategoryCode: [], keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const dataSource = ref<DeviceCandidate[]>([]);
    const loading = ref(false);
    const categoryOptions = ref<ProductCategoryNode[]>([]);
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<DeviceCandidate[]>([]);
    let queryToken = 0;

    const loadDevices = async (): Promise<void> => {
      const token = ++queryToken;
      loading.value = true;
      try {
        const { applicationCode } = getOutsourceRepairRuntime();
        const client = await getDeviceCenterClient();
        const response = await client.getIotDeviceList({
          // 旧页按「应用内建标签」过滤本应用可关联设备。
          filterTagCodes: [`builtin.app::${applicationCode}`],
          applicationCode,
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: searchForm.keyword,
          categoryCode: searchForm.prodCategoryCode.join("-"),
        });
        if (token !== queryToken) {
          return;
        }
        const result = asPageResult<DeviceCandidate>(response);
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

    const reset = (): void => {
      searchForm.prodCategoryCode = [];
      searchForm.keyword = "";
      page.pageNumber = 1;
      void loadDevices();
    };

    const search = (): void => {
      page.pageNumber = 1;
      void loadDevices();
    };

    watch(
      () => props.open,
      (visible) => {
        if (!visible) {
          return;
        }
        selectedKeys.value = [];
        selectedRows.value = [];
        if (categoryOptions.value.length === 0) {
          loadProductCategoryTree()
            .then((categories) => {
              categoryOptions.value = categories;
            })
            .catch((error: unknown) => {
              message.error(error instanceof Error ? error.message : "产品品类加载失败");
            });
        }
        reset();
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
      emit(
        "ok",
        selectedRows.value.map((item) => String(item.id)),
      );
      close();
    };

    const columns = [
      { title: "设备编码", dataIndex: "code", ellipsis: true, customRender: ({ text }: { text?: unknown }) => ellipsisCell(text) },
      { title: "设备名称", dataIndex: "name", ellipsis: true, customRender: ({ text }: { text?: unknown }) => ellipsisCell(text) },
      {
        title: "产品品类",
        dataIndex: "genreName",
        ellipsis: true,
        customRender: ({ record }: { record: DeviceCandidate }) => ellipsisCell(record.productInfo?.productCategory?.name),
      },
      {
        title: "设备品牌",
        dataIndex: "brandName",
        ellipsis: true,
        customRender: ({ record }: { record: DeviceCandidate }) => ellipsisCell(record.productInfo?.brandName),
      },
      {
        title: "所属区域",
        dataIndex: "areaName",
        width: 200,
        ellipsis: true,
        customRender: ({ record }: { record: DeviceCandidate }) => ellipsisCell(record.area?.pathName),
      },
    ];

    return () => (
      <ZhConfigProvider>
        <Modal open={props.open} title="设备" width="1000px" okText="确定" cancelText="取消" onOk={confirm} onCancel={close}>
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
            scroll={{ y: 450 }}
            columns={columns}
            dataSource={dataSource.value}
            rowSelection={{
              selectedRowKeys: selectedKeys.value,
              // 跨页保留已选：合并本页选中与其他页已选行。
              onChange: (_keys: (string | number)[], rows: DeviceCandidate[]) => {
                const pageIds = new Set(dataSource.value.map((item) => String(item.id)));
                const kept = selectedRows.value.filter((item) => !pageIds.has(String(item.id)));
                selectedRows.value = [...kept, ...rows];
                selectedKeys.value = selectedRows.value.map((item) => String(item.id));
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
