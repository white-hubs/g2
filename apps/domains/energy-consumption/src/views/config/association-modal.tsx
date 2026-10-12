import { computed, defineComponent, onMounted, reactive, ref, watch, type PropType } from "vue";

import { DeviceList, EnergyCollectConfigList, areaList } from "@/api";
import { Button, Cascader, Checkbox, Form, FormItem, Input, Modal, Pagination, Select, Table } from "@/pc-ui-runtime";

type ClassifyItem = { categoryName: string; categoryCode: string };
type AreaNode = { areaName: string; id: string; children?: AreaNode[] };
type DeviceRow = Record<string, unknown>;

export const AssociationModal = defineComponent({
  name: "AssociationModal",
  props: {
    visible: { type: Boolean as PropType<boolean>, default: false },
  },
  emits: ["close"],
  setup(props, { emit }) {
    const isSelectAll = ref(false);
    const modalVisible = ref(false);
    const spinning = ref(true);
    const dataSource = ref<DeviceRow[]>([]);
    const classifyList = ref<ClassifyItem[]>([]);
    const areaDataList = ref<AreaNode[]>([]);
    const selectedList = ref<DeviceRow[]>([]);
    const selected = ref<(string | number)[]>([]);
    const pagination = reactive({
      total: 0,
      pages: 1,
      pageSize: 10,
      current: 1,
    });
    const searchForm = reactive({
      instrumentType: "",
      deviceAreaId: [] as string[],
      keyword: "",
    });

    const columns = [
      { dataIndex: "code", title: "设备编码" },
      { dataIndex: "deviceName", title: "设备名称" },
      {
        dataIndex: "instrumentName",
        title: "仪表类型",
        customRender: ({ text }: { text: string }) => text,
      },
      {
        dataIndex: "deviceAreaName",
        title: "所属区域",
        customRender: ({ text }: { text: string }) => text || "--",
      },
    ];

    const rowSelection = computed(() => ({
      selectedRowKeys: selected.value,
      onChange: (selectedRowKeys: (string | number)[], selectedRows: DeviceRow[]) => {
        selected.value = selectedRowKeys;
        selectedList.value = selectedRows;
      },
    }));

    const getData = async () => {
      spinning.value = true;
      const obj = {
        pageNumber: pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword,
        instrumentType: searchForm.instrumentType,
        deviceAreaId: searchForm.deviceAreaId?.length ? searchForm.deviceAreaId[searchForm.deviceAreaId.length - 1] : "",
      };
      const { data } = await DeviceList(obj);
      const page = data as { records: DeviceRow[]; total: number; pages: number };
      dataSource.value = page.records;
      pagination.total = page.total;
      pagination.pages = page.pages;
      spinning.value = false;
    };

    const reset = () => {
      Object.assign(searchForm, {
        instrumentType: "",
        deviceAreaId: [],
        keyword: "",
      });
      pagination.current = 1;
      void getData();
    };

    const pageChange = (current: number, pageSize: number) => {
      pagination.current = current;
      pagination.pageSize = pageSize;
      void getData();
    };

    const close = (type?: string) => {
      const obj = {
        pageNumber: pagination.current,
        pageSize: pagination.pageSize,
        keyword: searchForm.keyword,
        instrumentType: searchForm.instrumentType,
        deviceAreaId: searchForm.deviceAreaId?.length ? searchForm.deviceAreaId[searchForm.deviceAreaId.length - 1] : "",
        total: pagination.total,
      };
      if (type === "ok") {
        emit("close", selectedList.value, isSelectAll.value, obj);
      } else if (type === "cancel") {
        emit("close", [], false, obj);
      } else {
        emit("close", [], isSelectAll.value, obj);
      }
      modalVisible.value = false;
    };

    watch(
      () => props.visible,
      () => {
        modalVisible.value = props.visible;
        if (props.visible) void getData();
      },
      { immediate: true },
    );

    onMounted(async () => {
      const { data } = await EnergyCollectConfigList();
      classifyList.value = data as ClassifyItem[];
      const { data: areal } = await areaList();
      areaDataList.value = areal as AreaNode[];
    });

    return () => (
      <Modal
        open={modalVisible.value}
        confirmLoading={false}
        width="1300px"
        title="关联设备"
        okText="确定"
        cancelText="取消"
        onOk={() => close("ok")}
        onCancel={() => close("cancel")}
      >
        <Form layout="inline" model={searchForm} class="modal-form">
          <FormItem label="仪表类型">
            <Select
              placeholder="请选择"
              value={searchForm.instrumentType}
              style={{ width: "180px" }}
              options={classifyList.value}
              allowClear
              fieldNames={{ label: "categoryName", value: "categoryCode" }}
              onUpdate:value={(v) => {
                searchForm.instrumentType = String(v ?? "");
              }}
            />
          </FormItem>
          <FormItem label="所属区域">
            <Cascader
              value={searchForm.deviceAreaId}
              options={areaDataList.value}
              fieldNames={{ label: "areaName", value: "id" }}
              changeOnSelect
              placeholder="请选择区域"
              onUpdate:value={(v) => {
                const arr = Array.isArray(v) ? v : [];
                searchForm.deviceAreaId = arr.map((x) => String(x));
              }}
            />
          </FormItem>
          <FormItem>
            <Input
              value={searchForm.keyword}
              placeholder="请输入设备名称"
              onUpdate:value={(v) => {
                searchForm.keyword = String(v ?? "");
              }}
            />
          </FormItem>
          <FormItem>
            <Button type="primary" onClick={() => void getData()}>
              查询
            </Button>
          </FormItem>
          <FormItem>
            <Button onClick={reset}>重置</Button>
          </FormItem>
        </Form>
        <div style={{ margin: "10px" }}>
          <Checkbox
            checked={isSelectAll.value}
            onUpdate:checked={(v) => {
              isSelectAll.value = Boolean(v);
            }}
          >
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
        <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
          <Pagination
            size="small"
            total={pagination.total}
            current={pagination.current}
            pageSize={pagination.pageSize}
            showTotal={(total: number) => `共 ${total} 条 第${pagination.current}/${pagination.pages}页`}
            onChange={pageChange}
          />
        </div>
      </Modal>
    );
  },
});

export default AssociationModal;
