import type { PcFormSchemaProp } from "@g2-platform/pc-ui";
import { defineComponent, markRaw, onMounted, onUnmounted, reactive } from "vue";

import { getClient } from "./domain-context";
import { cleanQuery, errorText } from "./model";
import { useOptions } from "./options";
import { loadPcUi } from "./runtime-modules";
import { displayDate } from "./table-columns";

import styles from "./styles.module.css";
const { Page, TreeSelect, message, usePcForm, usePcTable } = await loadPcUi();
export const HistoryPanel = defineComponent({
  props: { id: { type: String, required: true } },
  setup(props) {
    const filter = reactive<Record<string, unknown>>({ handleTime: [], departmentId: undefined, handleType: undefined });
    const pager = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const choices = useOptions();
    let version = 0;
    const [PcTable, table] = usePcTable({
      tableCode: "ASSET_DETAIL_HISTORY",
      rowKey: "id",
      autoFetch: false,
      pagination: false,
      columns: [
        { title: "处理日期", dataIndex: "handleTime", width: 160, customRender: ({ text }) => displayDate(text) },
        { title: "处理方式", dataIndex: "handleTypeName", width: 160 },
        { title: "处理人", dataIndex: "createByName", width: 160 },
        { title: "处理内容", dataIndex: "remarks", width: 400, ellipsis: true },
      ],
    });
    const load = async () => {
      const current = ++version;
      table.loading.value = true;
      try {
        const result = await getClient().page("history", {
          ...cleanQuery(filter),
          id: props.id,
          pageNumber: pager.pageNumber,
          pageSize: pager.pageSize,
        });
        if (current === version) {
          table.setDataSource(result.records);
          pager.total = result.total;
        }
      } catch (error) {
        message.error(errorText(error));
      } finally {
        if (current === version) {
          table.loading.value = false;
        }
      }
    };
    const schema = (): PcFormSchemaProp[] => [
      {
        component: "RangePicker",
        fieldName: "handleTime",
        label: "处理日期",
        defaultValue: [],
        componentProps: { valueFormat: "YYYY-MM-DD", style: { width: "260px" } },
      },
      {
        component: markRaw(TreeSelect),
        fieldName: "departmentId",
        label: "处理人部门",
        componentProps: {
          treeData: choices.data.departments,
          fieldNames: { label: "name", value: "id", children: "children" },
          allowClear: true,
          placeholder: "请选择部门",
        },
      },
      {
        component: "Select",
        fieldName: "handleType",
        label: "处理方式",
        componentProps: {
          options: [
            { label: "入库", value: "DEPOSITORY" },
            { label: "派发", value: "DISTRIBUTION" },
            { label: "调拨", value: "OUTBOUND" },
            { label: "报废", value: "WEED_OUT" },
          ],
          allowClear: true,
          placeholder: "请选择处理方式",
        },
      },
    ];
    const [PcForm, form] = usePcForm({
      layout: "horizontal",
      cache: false,
      syncStateRef: filter,
      schema: schema(),
      actionsInline: true,
      showCollapseButton: false,
      handleSubmit: () => {
        pager.pageNumber = 1;
        void load();
      },
      handleReset: () => {
        pager.pageNumber = 1;
        void load();
      },
    });
    onMounted(() => {
      void load();
      void choices
        .load(["departments"])
        .then(() => form.updateSchema(schema()))
        .catch((error: unknown) => message.error(errorText(error)));
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <div class={styles.main} style={{ height: "100%" }}>
        <PcForm />
        <PcTable />
        <div style={{ alignSelf: "flex-end", paddingTop: "16px" }}>
          <Page
            cachePageQuery={false}
            current={pager.pageNumber}
            pageSize={pager.pageSize}
            total={pager.total}
            syncToUrl={false}
            onPageChange={(number: number, size: number) => {
              pager.pageNumber = number;
              pager.pageSize = size;
              void load();
            }}
          />
        </div>
      </div>
    );
  },
});
