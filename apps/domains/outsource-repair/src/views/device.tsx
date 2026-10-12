import type { OutsourceDevice } from "@g2-client/outsource-repair/client";
import { Button, Page, PageLayout, type PcTableColumn, PopConfirm, PopOver, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { DeviceAssociationModal } from "./device-association-modal";
import { getOutsourceRepairClient, getOutsourceRepairRuntime } from "@/domain-context";

const ellipsisCell = (text: unknown): JSX.Element => (
  <PopOver placement="topLeft" content={text ? String(text) : ""}>
    {text ? String(text) : "--"}
  </PopOver>
);

export const OutsourceDeviceList = defineComponent({
  name: "OutsourceDeviceList",
  setup() {
    const client = getOutsourceRepairClient();
    const { applicationCode } = getOutsourceRepairRuntime();
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedKeys = ref<string[]>([]);
    const associationOpen = ref(false);
    const removing = ref(false);
    const importing = ref(false);
    let version = 0;

    const load = async (): Promise<void> => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await client.pageDevices({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: query.keyword || undefined,
          applicationCode,
        });
        if (current !== version) {
          return;
        }
        tableApi.setDataSource(result.records);
        page.total = result.total;
      } catch (error) {
        if (current === version) {
          message.error(error instanceof Error ? error.message : "委外设备加载失败");
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };

    const removeOne = async (record: OutsourceDevice): Promise<void> => {
      if (removing.value || !record.deviceId) {
        return;
      }
      removing.value = true;
      try {
        await client.removeDevice(record.deviceId);
        message.success("操作成功");
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "移除失败");
      } finally {
        removing.value = false;
      }
    };

    const removeBatch = async (): Promise<void> => {
      if (removing.value || selectedKeys.value.length === 0) {
        return;
      }
      removing.value = true;
      try {
        await client.batchRemoveDevices([...selectedKeys.value]);
        message.success("操作成功");
        selectedKeys.value = [];
        tableApi.setSelectedRowKeys([]);
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "批量移除失败");
      } finally {
        removing.value = false;
      }
    };

    const importDevices = async (deviceInstanceIds: string[]): Promise<void> => {
      if (importing.value || deviceInstanceIds.length === 0) {
        return;
      }
      importing.value = true;
      try {
        await client.importDevices(deviceInstanceIds);
        message.success("操作成功");
        page.pageNumber = 1;
        await load();
      } catch (error) {
        message.error(error instanceof Error ? error.message : "关联设备失败");
      } finally {
        importing.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      { title: "设备编码", dataIndex: "deviceCode", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "设备名称", dataIndex: "deviceName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "产品品类", dataIndex: "deviceCategory", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "设备品牌", dataIndex: "deviceBrand", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      { title: "所属区域", dataIndex: "areaName", ellipsis: true, customRender: ({ text }) => ellipsisCell(text) },
      {
        title: "操作",
        dataIndex: "action",
        width: 110,
        customRender: ({ record }) => (
          <PopConfirm
            title="是否移除当前选中？"
            okText="确定"
            cancelText="取消"
            onConfirm={() => void removeOne(record as OutsourceDevice)}
          >
            <Button type="link" danger disabled={removing.value}>
              移除
            </Button>
          </PopConfirm>
        ),
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "OUTSOURCE_REPAIR_DEVICE",
      rowKey: "deviceId",
      rowSelection: "checkbox",
      autoFetch: false,
      rowSelectionChange: (keys) => {
        selectedKeys.value = keys.map((key) => String(key));
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Input",
          fieldName: "keyword",
          label: "",
          componentProps: { placeholder: "请输入设备编码/名称", allowClear: true },
          defaultValue: "",
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        void load();
      },
      handleReset() {
        query.keyword = "";
        page.pageNumber = 1;
        void load();
      },
    });

    void load();

    const slots = {
      "layout-header": () => (
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            type="primary"
            loading={importing.value}
            onClick={() => {
              associationOpen.value = true;
            }}
          >
            关联设备
          </Button>
          <PopConfirm title="是否确认移除" okText="确定" cancelText="取消" onConfirm={() => void removeBatch()}>
            <Button type="primary" danger disabled={selectedKeys.value.length === 0 || removing.value}>
              批量移除
            </Button>
          </PopConfirm>
        </div>
      ),
      "layout-content": () => (
        <>
          <PcForm />
          <PcTable />
        </>
      ),
      "footer-page": () => (
        <Page
          current={page.pageNumber}
          pageSize={page.pageSize}
          total={page.total}
          cachePageQuery={true}
          onPageChange={(pageNumber: number, pageSize: number) => {
            page.pageNumber = pageNumber;
            page.pageSize = pageSize;
            void load();
          }}
        />
      ),
    };

    return () => (
      <>
        <PageLayout title="委外设备" v-slots={slots} />
        <DeviceAssociationModal
          open={associationOpen.value}
          onUpdate:open={(value: boolean) => {
            associationOpen.value = value;
          }}
          onOk={(ids: string[]) => void importDevices(ids)}
        />
      </>
    );
  },
});
