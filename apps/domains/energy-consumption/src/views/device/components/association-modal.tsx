import { computed, defineComponent, reactive, ref, watch } from "vue";

import { SearchDevice } from "@/api";
import { getDeviceCenterClient } from "@/domain-context";
import { Button, Cascader, Checkbox, Form, FormItem, Input, Modal, Pagination, Table } from "@/pc-ui-runtime";

export const AssociationModal = defineComponent({
  name: "AssociationModal",
  props: {
    visible: { type: Boolean, default: false },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const modalVisible = ref(false);
    const isSelectAll = ref(false);
    const spinning = ref(false);
    const disabledAllCheck = ref(true);
    const options = ref<unknown[]>([]);
    const dataSource = ref<unknown[]>([]);
    const existList = ref<string[]>([]);
    const selected = ref<string[]>([]);
    const selectedList = ref<unknown[]>([]);
    const pagination = reactive({
      total: 0,
      pages: 1,
      pageSize: 10,
      current: 1,
    });
    const searchForm = reactive({
      categoryCode: [] as string[],
      keyword: "",
    });

    const columns = [
      { dataIndex: "code", title: "设备编码" },
      { dataIndex: "name", title: "设备名称" },
      {
        dataIndex: "genreName",
        title: "产品分类",
        customRender: ({ record }: { record: { productInfo?: { productCategory?: { name?: string } } } }) =>
          record.productInfo?.productCategory?.name ?? "--",
      },
      {
        dataIndex: "modelName",
        title: "产品名称",
        customRender: ({ record }: { record: { productInfo?: { name?: string } } }) => record.productInfo?.name ?? "--",
      },
      {
        dataIndex: "brandName",
        title: "设备品牌",
        customRender: ({ record }: { record: { productInfo?: { brandName?: string } } }) => record.productInfo?.brandName ?? "--",
      },
      {
        dataIndex: "areaName",
        title: "所属区域",
        customRender: ({ record }: { record: { area?: { pathName?: string } } }) =>
          record?.area && record?.area?.pathName !== "" ? record.area.pathName : "--",
      },
    ];

    const rowSelection = computed(() => ({
      selectedRowKeys: selected.value,
      onChange: (selectedRowKeys: (string | number)[], selectedRows: unknown[]) => {
        selected.value = selectedRowKeys.map(String);
        selectedList.value = selectedRows;
      },
      getCheckboxProps: (record: { id: string; name: string }) => ({
        disabled: existList.value.some((x) => x === record.id),
        name: record.name,
      }),
    }));

    const getData = async () => {
      spinning.value = true;
      try {
        const client = await getDeviceCenterClient();
        const res = (await client.getIotDeviceList({
          filterTagCodes: [`builtin.app::ENERGY_CONSUMPTION`],
          pageNumber: pagination.current,
          pageSize: pagination.pageSize,
          keyword: searchForm.keyword,
          categoryCode: searchForm.categoryCode?.length ? searchForm.categoryCode.join("-") : "",
        })) as { records: unknown[]; total: number; pages: number };
        dataSource.value = res.records;
        pagination.total = res.total;
        pagination.pages = res.pages;
      } finally {
        spinning.value = false;
      }
    };

    const searchData = async () => {
      const { data } = (await SearchDevice()) as { data: string[] };
      selected.value = data;
      existList.value = data;
    };

    const loadCategory = async () => {
      const client = await getDeviceCenterClient();
      options.value = (await client.getIotProductCategoryTree()) as unknown[];
    };

    const close = (type?: string) => {
      const obj = {
        filterTagCodes: [`builtin.app::ENERGY_CONSUMPTION`],
        pageNumber: pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword,
        categoryCode: searchForm.categoryCode?.length ? searchForm.categoryCode.join("-") : "",
      };
      if (type === "ok") {
        if (isSelectAll.value) {
          emit("close", selectedList.value, isSelectAll.value, obj);
        } else {
          const filtered = (selectedList.value as Array<{ id: string }>)?.filter((item) => !existList.value.includes(item.id));
          emit("close", filtered, isSelectAll.value, obj);
        }
      } else {
        emit("close", [], false, obj);
      }
      modalVisible.value = false;
    };

    watch(
      () => props.visible,
      () => {
        modalVisible.value = props.visible;
        if (props.visible) {
          void getData();
          void searchData();
          void loadCategory();
        }
      },
      { immediate: true },
    );

    return () => (
      <Modal v-model:visible={modalVisible.value} width="1300px" title="" onOk={() => close("ok")} onCancel={() => close("cancel")}>
        <Form layout="inline" model={searchForm} class="modal-form">
          <FormItem label="产品分类">
            <Cascader
              v-model:value={searchForm.categoryCode}
              placeholder="请输入"
              changeOnSelect
              style="width: 180px"
              fieldNames={{ label: "categoryName", value: "categoryCode", children: "children" }}
              options={options.value as never}
            />
          </FormItem>
          <FormItem>
            <Input v-model:value={searchForm.keyword} placeholder="请输入设备名称或型号" />
          </FormItem>
          <FormItem>
            <Button
              type="primary"
              onClick={() => {
                disabledAllCheck.value = !(searchForm.keyword !== "" || searchForm.categoryCode?.length > 0);
                pagination.current = 1;
                void getData();
              }}
            >
              查询
            </Button>
          </FormItem>
          <FormItem>
            <Button
              onClick={() => {
                Object.assign(searchForm, { categoryCode: [], keyword: "" });
                disabledAllCheck.value = true;
                pagination.current = 1;
                void getData();
              }}
            >
              重置
            </Button>
          </FormItem>
        </Form>
        <div style="margin: 10px;">
          <Checkbox v-model:checked={isSelectAll.value} disabled={disabledAllCheck.value || dataSource.value.length === 0}>
            勾选当前所有
          </Checkbox>
        </div>
        <Table
          rowKey="id"
          dataSource={dataSource.value}
          columns={columns}
          rowSelection={rowSelection.value}
          pagination={false}
          scroll={{ y: 450 }}
          size="middle"
          loading={spinning.value}
        />
        <div style="display: flex;justify-content: flex-end;margin: 10px 0px;">
          <Pagination
            size="small"
            total={pagination.total}
            showTotal={(total: number) => `共 ${total} 条 第${pagination.current}/${pagination.pages}页`}
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
