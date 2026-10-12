import type { ConferenceDevice } from "@g2-contract/meet-room";
import { Modal, Page, Space, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

import { getMeetRoomApplicationCode, getMeetRoomClient } from "../domain-context";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.css";

export const DevicePickerModal = defineComponent({
  name: "MeetRoomDevicePickerModal",
  props: { multiple: { type: Boolean, default: true } },
  emits: ["selected"],
  setup(props, { emit, expose }) {
    const open = ref(false);
    const query = reactive({ keyword: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const selectedKeys = ref<string[]>([]);
    const selectedRows = ref<ConferenceDevice[]>([]);

    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_DEVICE_PICKER",
      rowKey: "deviceId",
      rowSelection: props.multiple ? "checkbox" : "radio",
      rowSelectionChange(keys, rows) {
        selectedKeys.value = keys.map(String);
        selectedRows.value = rows as ConferenceDevice[];
      },
      columns: [
        { title: "设备名称", dataIndex: "deviceName", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "所属产品", dataIndex: "deviceProdName", width: 180, ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "产品品类",
          dataIndex: "deviceProdCategoryName",
          width: 180,
          ellipsis: true,
          customRender: ({ text: value }) => text(value),
        },
        { title: "所在区域", dataIndex: "areaName", width: 200, ellipsis: true, customRender: ({ text: value }) => text(value) },
      ],
      fetchApi: async () => {
        try {
          const result = await getMeetRoomClient().pageAvailableDevices({
            applicationCode: getMeetRoomApplicationCode(),
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            keyword: query.keyword.trim() || undefined,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "设备列表加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
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
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入设备名称" },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.keyword = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const openModal = (rows: ConferenceDevice[] = []): void => {
      selectedRows.value = [...rows];
      selectedKeys.value = rows.map((item) => String(item.deviceId));
      tableApi.setSelectedRowKeys(selectedKeys.value);
      open.value = true;
      tableApi.query();
    };
    expose({ openModal });

    return () => (
      <Modal
        open={open.value}
        title="选择设备"
        width="960px"
        okText="确定"
        cancelText="取消"
        onCancel={() => (open.value = false)}
        onOk={() => {
          emit("selected", [...selectedRows.value]);
          open.value = false;
        }}
      >
        <div class={styles.pageContent} style={{ height: "560px" }}>
          <PcForm />
          <PcTable />
          <Space style={{ justifyContent: "space-between" }}>
            <span class={styles.deviceSelectionHint}>已选择 {selectedKeys.value.length} 台设备</span>
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber, pageSize) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          </Space>
        </div>
      </Modal>
    );
  },
});
