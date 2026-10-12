// @ts-nocheck — 迁移期视图层，对齐旧仓 JSX/pc-ui 契约后再收紧类型。
import type { SecurityDeviceRecord } from "@g2-contract/broadcast-center";
import { defineComponent, reactive, ref, watch, type PropType } from "vue";

import { getApplicationCode, getDeviceCenterClient } from "@/domain-context";
import { Button, Form, FormItem, Input, Modal, Page, Table, ZhConfigProvider } from "@/pc-ui-runtime";
import { unwrapPage } from "@/utils";

interface Props {
  visible: boolean;
  disabledKeys: string[];
  selectedKeys: string[];
}

/** 广播设备选择弹窗（走 deviceCenterClient） */
export const BroadcastDeviceModal = defineComponent({
  name: "BroadcastDeviceModal",
  emits: ["cancel", "save"],
  props: {
    visible: { type: Boolean, default: false },
    disabledKeys: { type: Array as PropType<string[]>, default: () => [] },
    selectedKeys: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup: (props: Props, { emit }) => {
    const open = ref(false);
    const dataSource = ref<SecurityDeviceRecord[]>([]);
    const disabledList = ref<string[]>([]);
    const loading = ref(false);
    const pagination = ref({ pageSize: 10, pageNumber: 1, total: 0 });
    const formState = reactive<{ keyword: string }>({ keyword: "" });
    const selectedRowKeysData = ref<string[]>(props.selectedKeys || []);
    const selectedRowsData = ref<SecurityDeviceRecord[]>([]);

    const save = (): void => {
      emit("save", selectedRowKeysData.value, selectedRowsData.value);
    };
    const cancel = (): void => {
      open.value = false;
      emit("cancel", false);
    };

    const deviceColumns = [
      { dataIndex: "code", title: "设备编码" },
      { dataIndex: "deviceName", title: "设备名称" },
      { dataIndex: "deviceProdCategoryName", title: "产品品类" },
      { dataIndex: "deviceProdName", title: "产品名称" },
      { dataIndex: "brandName", title: "设备品牌" },
      { dataIndex: "areaName", title: "所属区域" },
    ];

    const loadDevices = async (): Promise<void> => {
      loading.value = true;
      try {
        const client = await getDeviceCenterClient();
        const res = await client.getSecurityDevicePage(getApplicationCode(), {
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          keyword: formState.keyword || undefined,
        });
        const page = unwrapPage(res);
        dataSource.value = page.records as SecurityDeviceRecord[];
        pagination.value.total = page.total;
      } finally {
        loading.value = false;
      }
    };

    const queryForm = (): void => {
      pagination.value.pageNumber = 1;
      void loadDevices();
    };

    const reset = (): void => {
      pagination.value.pageNumber = 1;
      formState.keyword = "";
      void loadDevices();
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      void loadDevices();
    };

    const rowSelection = ref({
      selectedRowKeys: selectedRowKeysData.value,
      onChange: (selectedRowKeys: string[], selectedRows: SecurityDeviceRecord[]) => {
        selectedRowKeysData.value = selectedRowKeys;
        selectedRowsData.value = selectedRows;
      },
      getCheckboxProps: (record: SecurityDeviceRecord) => ({
        disabled: disabledList.value?.length ? disabledList.value.includes(String(record.id ?? record.deviceId)) : false,
      }),
    });

    watch(
      () => props.visible,
      (val) => {
        open.value = val;
        if (val) void loadDevices();
      },
      { immediate: true },
    );

    watch(
      () => props.disabledKeys,
      (val) => {
        disabledList.value = val || [];
      },
      { immediate: true },
    );

    return (): JSX.Element => (
      <ZhConfigProvider>
        <Modal open={open.value} title="选择广播设备" okText="确定" cancelText="取消" onOk={save} onCancel={cancel} width={800}>
          <Form layout="inline" style={{ margin: "10px 0 0 0" }}>
            <FormItem label="" style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Input
                style={{ width: "220px" }}
                placeholder="请输入名称搜索"
                value={formState.keyword}
                onUpdate:value={(v) => (formState.keyword = v)}
              />
            </FormItem>
            <FormItem style={{ paddingRight: 0, marginRight: "10px", marginBottom: "10px" }}>
              <Button type="primary" onClick={queryForm}>
                查询
              </Button>
              <Button style={{ marginLeft: "10px" }} onClick={reset}>
                重置
              </Button>
            </FormItem>
          </Form>
          <Table
            rowKey="deviceId"
            columns={deviceColumns}
            dataSource={dataSource.value}
            pagination={false}
            loading={loading.value}
            rowSelection={rowSelection.value}
            scroll={{ y: 300 }}
          />
          <Page
            style={{ textAlign: "right" }}
            current={pagination.value.pageNumber}
            pageSize={pagination.value.pageSize}
            total={pagination.value.total}
            onPageChange={pageChange}
          />
        </Modal>
      </ZhConfigProvider>
    );
  },
});
