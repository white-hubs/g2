import type * as ContractApi from "@g2-contract/work-order-center";
import * as VueApi from "vue";

import * as WorkOrderContext from "../domain-context";
import * as PcUi from "../pc-ui-runtime";
import { downloadBlob, errorMessage, rangePeriod } from "../shared";

import styles from "../styles.module.less";

const { Button, Page, PageLayout, message, usePcForm, usePcTable } = PcUi;
const { defineComponent, reactive, ref } = VueApi;

type StatisticsRow = ContractApi.WorkOrderStatistics & { tableKey: string };

export const WorkOrderStatistics = defineComponent({
  name: "WorkOrderCenterStatistics",
  setup() {
    const query = reactive<{ businessType?: string; period?: unknown[] }>({});
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });
    const businessTypes = ref<{ label: string; value: string }[]>([]);
    const exporting = ref(false);

    const makeQuery = () => ({
      pageNumber: page.pageNumber,
      pageSize: page.pageSize,
      businessType: query.businessType,
      period: rangePeriod(query.period),
    });

    const [PcTable, tableApi] = usePcTable({
      tableCode: "WORK_ORDER_CENTER_STATISTICS",
      rowKey: "tableKey",
      columns: [
        { title: "工单类型", dataIndex: "businessTypeName", width: 220, ellipsis: true },
        { title: "工单总数", dataIndex: "totalNumber", width: 140, align: "center" },
        { title: "处理中工单数", dataIndex: "processNumber", width: 150, align: "center" },
        { title: "驳回工单数", dataIndex: "rejectNumber", width: 140, align: "center" },
        { title: "撤销工单数", dataIndex: "undoNumber", width: 140, align: "center" },
        { title: "完成工单数", dataIndex: "dealNumber", width: 140, align: "center" },
      ],
      fetchApi: async () => {
        const result = await WorkOrderContext.getWorkOrderCenterClient().pageStatistics(makeQuery());
        result.records = result.records.map(
          (record, index): StatisticsRow => ({
            ...record,
            tableKey: `${record.businessType ?? record.businessTypeName ?? "unknown"}-${index}`,
          }),
        );
        return result as typeof result & { records: StatisticsRow[] };
      },
      fetchLoaded(data) {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        {
          component: "Select",
          fieldName: "businessType",
          label: "工单类型",
          componentProps: {
            allowClear: true,
            showSearch: true,
            options: businessTypes,
            placeholder: "请选择工单类型",
          },
        },
        {
          component: "RangePicker",
          fieldName: "period",
          label: "发起时间",
          componentProps: { valueFormat: "YYYY-MM-DD" },
        },
      ],
      handleSubmit(values) {
        query.businessType = typeof values.businessType === "string" ? values.businessType : undefined;
        query.period = Array.isArray(values.period) ? values.period : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        query.businessType = undefined;
        query.period = undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    const exportStatistics = async (): Promise<void> => {
      if (exporting.value) {
        return;
      }
      exporting.value = true;
      try {
        downloadBlob(await WorkOrderContext.getWorkOrderCenterClient().exportStatistics(makeQuery()), "工单统计.xlsx");
      } catch (error) {
        message.error(errorMessage(error, "导出失败"));
      } finally {
        exporting.value = false;
      }
    };

    void WorkOrderContext.getWorkOrderCenterClient()
      .listBusinessTypes()
      .then((items) => {
        businessTypes.value = items.map((item) => ({ label: item.name, value: item.code }));
      })
      .catch((error: unknown) => message.error(errorMessage(error, "工单类型加载失败")));

    return () => (
      <PageLayout
        title="工单统计"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" loading={exporting.value} disabled={!page.total} onClick={() => void exportStatistics()}>
              导出
            </Button>
          ),
          "layout-content": () => (
            <div class={styles.tablePage}>
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () =>
            page.total > 0 ? (
              <Page
                current={page.pageNumber}
                pageSize={page.pageSize}
                total={page.total}
                cachePageQuery={false}
                onPageChange={(pageNumber: number, pageSize: number) => {
                  page.pageNumber = pageNumber;
                  page.pageSize = pageSize;
                  tableApi.query();
                }}
              />
            ) : null,
        }}
      />
    );
  },
});
