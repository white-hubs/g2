import type { OptionItem, StatisticRow } from "@g2-contract/work-report";
import {
  Button,
  Page,
  PageLayout,
  type PcFormSchemaProp,
  type PcTableColumn,
  TreeSelect,
  message,
  usePcForm,
  usePcTable,
} from "@g2-platform/pc-ui";
import { defineComponent, markRaw, onMounted, onUnmounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getClient } from "../domain-context";
import { BASE } from "../menu-data";
import { statisticTypes } from "../model";
import { departmentTree, download, errorText, positiveInt } from "../shared";

import styles from "../styles.module.css";
export const StatisticsPage = defineComponent({
  name: "WorkReportStatisticsPage",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const filter = reactive<{ departmentId?: string; period: string[]; userName: string }>({
      departmentId: undefined,
      period: [],
      userName: "",
    });
    const pager = reactive({
      pageNumber: positiveInt(route.query.pageNumber, 1),
      pageSize: positiveInt(route.query.pageSize, 10),
      total: 0,
    });
    const departments = ref<OptionItem[]>([]);
    const exporting = ref(false);
    const selected = ref<string[]>([]);
    let version = 0;
    const openRecords = (row: StatisticRow, kind: "department" | "user" | "type", typeId?: string) => {
      void router.push({
        path: `${BASE}/record-index`,
        query: {
          searchValue: JSON.stringify({
            startUserId: kind !== "department" ? row.userId : "",
            organizationId: kind === "department" ? (row.organizationId ?? "") : "",
            reportTypeId: typeId ?? "",
            submitTime: filter.period.join(","),
          }),
        },
      });
    };
    const columns: PcTableColumn[] = [
      { title: "人员名称", dataIndex: "userName", width: 120, fixed: "left", ellipsis: true },
      { title: "部门", dataIndex: "departmentName", width: 120, ellipsis: true },
      {
        title: "部门汇报数",
        dataIndex: "departmentNum",
        width: 120,
        customRender: ({ record, text }) => (
          <Button type="link" size="small" onClick={() => openRecords(record as StatisticRow, "department")}>
            {text ?? 0}
          </Button>
        ),
      },
      {
        title: "个人汇报数",
        dataIndex: "userNum",
        width: 120,
        customRender: ({ record, text }) => (
          <Button type="link" size="small" onClick={() => openRecords(record as StatisticRow, "user")}>
            {text ?? 0}
          </Button>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      rowKey: "userId",
      tableCode: "WORK_REPORT_STATISTICS",
      rowSelection: "checkbox",
      autoFetch: false,
      pagination: false,
      rowSelectionChange(keys) {
        selected.value = keys.map(String);
      },
    });
    const query = () => ({
      pageNumber: pager.pageNumber,
      pageSize: pager.pageSize,
      departmentId: filter.departmentId,
      userName: filter.userName,
      period: filter.period.join(","),
    });
    const load = async () => {
      const current = ++version;
      tableApi.loading.value = true;
      try {
        const result = await getClient().pageStatistics(query());
        if (current !== version) {
          return;
        }
        tableApi.setColumns([
          ...columns,
          ...statisticTypes(result.records).map((type) => ({
            title: type.typeName,
            dataIndex: `reportType:${type.typeId}`,
            width: 120,
            ellipsis: true,
            customRender: ({ record }: { record: unknown }) => {
              const row = record as StatisticRow;
              const count = row.reportTypeNumList?.find((item) => item.typeId === type.typeId)?.typeNum;
              return (
                <Button
                  type="link"
                  size="small"
                  disabled={count === undefined || count === null}
                  onClick={() => openRecords(row, "type", type.typeId)}
                >
                  {count ?? "--"}
                </Button>
              );
            },
          })),
        ]);
        tableApi.setDataSource(result.records);
        pager.total = result.total;
      } catch (error) {
        if (current === version) {
          message.error(errorText(error, "汇报统计加载失败"));
        }
      } finally {
        if (current === version) {
          tableApi.loading.value = false;
        }
      }
    };
    const clearSelection = () => {
      selected.value = [];
      tableApi.setSelectedRowKeys([]);
      tableApi.setSelectedRows([]);
    };
    const schema = (): PcFormSchemaProp[] => [
      {
        component: markRaw(TreeSelect),
        fieldName: "departmentId",
        label: "部门",
        componentProps: {
          treeData: departmentTree(departments.value),
          placeholder: "请选择部门",
          allowClear: true,
          showSearch: true,
          treeNodeFilterProp: "title",
        },
      },
      {
        component: "RangePicker",
        fieldName: "period",
        label: "汇报时间",
        defaultValue: [],
        componentProps: { valueFormat: "YYYY-MM-DD", allowClear: true },
      },
      {
        component: "Input",
        fieldName: "userName",
        label: "",
        defaultValue: "",
        componentProps: { placeholder: "请输入汇报人名称", maxlength: 200, allowClear: true },
      },
    ];
    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      schema: schema(),
      syncStateRef: filter,
      cache: true,
      actionsInline: true,
      showCollapseButton: false,
      handleSubmit() {
        pager.pageNumber = 1;
        clearSelection();
        void load();
      },
      handleReset() {
        filter.departmentId = undefined;
        filter.period = [];
        filter.userName = "";
        pager.pageNumber = 1;
        clearSelection();
        void load();
      },
    });
    const exportRows = async () => {
      if (exporting.value) {
        return;
      }
      if (selected.value.length === 0) {
        message.warning("请先选择要下载的数据");
        return;
      }
      exporting.value = true;
      try {
        download(await getClient().exportStatistics({ ...query(), selectReportBys: selected.value.join(",") }), "工作汇报统计.xlsx");
      } catch (error) {
        message.error(errorText(error, "下载失败"));
      } finally {
        exporting.value = false;
      }
    };
    onMounted(() => {
      void load();
      void getClient()
        .listOrganizations()
        .then((items) => {
          departments.value = items;
          formApi.updateSchema(schema());
        })
        .catch((error: unknown) => message.error(errorText(error, "部门加载失败")));
    });
    onUnmounted(() => {
      version += 1;
    });
    return () => (
      <PageLayout
        title="工作汇报统计"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} onClick={() => void exportRows()}>
              批量下载
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.content}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-btn": () => <span>已选：{selected.value.length} 条数据</span>,
          "footer-page": () => (
            <Page
              current={pager.pageNumber}
              pageSize={pager.pageSize}
              total={pager.total}
              cachePageQuery={true}
              onPageChange={(page, size) => {
                pager.pageNumber = page;
                pager.pageSize = size;
                clearSelection();
                void load();
              }}
            />
          ),
        }}
      />
    );
  },
});
