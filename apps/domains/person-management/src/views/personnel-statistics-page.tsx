import { Button, Page, PageLayout, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";

// 统计行类型与运行时组件分组。
import type { StaffChangeRow } from "@g2-contract/person-management";

import { getPersonManagementClient } from "../domain-context";

import styles from "./personnel-statistics.module.css";

const numberFields = [
  { key: "recruitNum", label: "招聘" },
  { key: "inductionNum", label: "入职" },
  { key: "regularWorkerNum", label: "转正" },
  { key: "quitNum", label: "离职" },
  { key: "currentNum", label: "当前人数" },
] as const;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}

function download(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "人员异动统计.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export const PersonnelStatisticsPage = defineComponent({
  name: "PersonnelChangeStatisticsPage",
  setup() {
    const query = reactive<{ period?: string[] }>({ period: undefined });
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const rows = ref<StaffChangeRow[]>([]);
    const exporting = ref(false);

    const [PcTable, tableApi] = usePcTable({
      tableCode: "PERSON_STATISTICS",
      rowKey: "organizationName",
      pagination: false,
      columns: [
        { title: "部门", dataIndex: "organizationName", width: 240, ellipsis: true },
        { title: "招聘", dataIndex: "recruitNum", width: 140, align: "right" },
        { title: "入职", dataIndex: "inductionNum", width: 140, align: "right" },
        { title: "转正", dataIndex: "regularWorkerNum", width: 140, align: "right" },
        { title: "离职", dataIndex: "quitNum", width: 140, align: "right" },
        { title: "当前人数", dataIndex: "currentNum", width: 160, align: "right" },
      ],
      fetchApi: async () => {
        try {
          const result = await getPersonManagementClient().getStaffChangeStatistics({
            pageNumber: page.pageNumber,
            pageSize: page.pageSize,
            period: Array.isArray(query.period) ? query.period.join(",") : "",
          });
          rows.value = result.records;
          page.total = result.total;
          return result;
        } catch (error) {
          rows.value = [];
          page.total = 0;
          message.error(errorMessage(error, "人员异动统计加载失败"));
          return { records: [], total: 0, pages: 0 };
        }
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      cache: false,
      schema: [
        {
          component: "RangePicker",
          fieldName: "period",
          label: "时间",
          defaultValue: undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", placeholder: ["开始日期", "结束日期"], allowClear: true },
        },
      ],
      handleSubmit(values) {
        query.period = Array.isArray(values.period) ? values.period.map(String) : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.period = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const exportRows = async (): Promise<void> => {
      if (exporting.value) {
        return;
      }
      exporting.value = true;
      try {
        download(
          await getPersonManagementClient().exportStaffChangeStatistics({
            period: Array.isArray(query.period) ? query.period.join(",") : "",
          }),
        );
      } catch (error) {
        message.error(errorMessage(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };

    return () => (
      <PageLayout
        title="人员异动统计"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} onClick={() => void exportRows()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <>
              <PcForm />
              <PcTable />
              <div class={styles.summary}>
                <strong>合计</strong>
                {numberFields.map(({ key, label }) => (
                  <span key={key}>
                    {label}：{rows.value.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)}
                  </span>
                ))}
              </div>
            </>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(number, size) => {
                page.pageNumber = number;
                page.pageSize = size;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
