import type { FieldConfiguration } from "@g2-contract/meet-room";
import { Page, PageLayout, Switch, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive } from "vue";

import { getMeetRoomClient } from "../domain-context";
import { errorMessage, text } from "../shared";

import styles from "../styles.module.css";

export const FieldSettingsPage = defineComponent({
  name: "FieldSettingsPage",
  setup() {
    const query = reactive({ fieldName: "" });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const update = async (record: FieldConfiguration, patch: Partial<FieldConfiguration>): Promise<void> => {
      try {
        await getMeetRoomClient().updateFieldConfiguration({ id: record.id, ...patch });
        Object.assign(record, patch);
        message.success("设置成功");
      } catch (error) {
        message.error(errorMessage(error, "设置失败"));
        tableApi.query();
      }
    };
    const [PcTable, tableApi] = usePcTable({
      tableCode: "MEET_ROOM_FIELD_SETTINGS",
      rowKey: "id",
      columns: [
        { title: "字段名称", dataIndex: "fieldName", ellipsis: true, customRender: ({ text: value }) => text(value) },
        { title: "字段编码", dataIndex: "fieldCode", ellipsis: true, customRender: ({ text: value }) => text(value) },
        {
          title: "是否必填",
          dataIndex: "required",
          width: 160,
          customRender: ({ record }: { record: FieldConfiguration }) => (
            <Switch
              checked={Boolean(record.required)}
              checkedChildren="是"
              unCheckedChildren="否"
              onChange={(checked) => void update(record, { required: Boolean(checked) })}
            />
          ),
        },
        {
          title: "是否显示",
          dataIndex: "hidden",
          width: 160,
          customRender: ({ record }: { record: FieldConfiguration }) => (
            <Switch
              checked={!record.hidden}
              checkedChildren="显示"
              unCheckedChildren="隐藏"
              onChange={(checked) => void update(record, { hidden: !checked })}
            />
          ),
        },
      ],
      fetchApi: async () => {
        try {
          const result = await getMeetRoomClient().listFieldConfigurations({
            fieldName: query.fieldName || undefined,
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
          });
          page.total = result.total;
          return result;
        } catch (error) {
          message.error(errorMessage(error, "字段配置加载失败"));
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
          fieldName: "fieldName",
          label: "",
          defaultValue: "",
          componentProps: { allowClear: true, placeholder: "请输入字段名称" },
        },
      ],
      handleSubmit(values) {
        query.fieldName = String(values.fieldName ?? "").trim();
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.fieldName = "";
        page.pageNumber = 1;
        tableApi.query();
      },
    });
    return () => (
      <PageLayout
        title="字段设置"
        v-slots={{
          "layout-content": () => (
            <div class={styles.pageContent}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
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
          ),
        }}
      />
    );
  },
});
