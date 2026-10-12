import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { overtimeDetailExport, overtimeDetailPage } from "@/api/staff-overtime";
import { KEYWORD_ALIAS } from "@/keyword-alias";

import "./overtime-ledger.less";

/** 加班台账 */
export const OverTimeLedgerDetail = defineComponent({
  setup: () => {
    const { userId, date, type } = useRoute().query;
    const dateTime: string = date as string;
    const ledgerDate = ref<string[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });
    const dataSource = ref<unknown[]>([]);
    const loading = ref(false);
    let requestVersion = 0;
    const getQuery = () => ({
      period: ledgerDate.value,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: ReturnType<typeof getQuery> = {
      period: dateTime ? dateTime.split(",") : ([] as string[]),
      pageNumber: 1,
      pageSize: 10,
    };
    const queryState = usePcQueryState({
      initialState: queryDefaults,
      storage: "url",
      resolveValue: (field, raw) => {
        if (field === "pageNumber" || field === "pageSize") {
          return Number(raw);
        }
        if (field === "period") {
          return String(raw).split(",");
        }
        return raw;
      },
    });
    const applyQuery = (next: Partial<typeof queryDefaults>): void => {
      const period = next.period;
      ledgerDate.value = Array.isArray(period) ? period : period ? String(period).split(",") : [];
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());
    onMounted(async () => {
      applyQuery(queryState.state);
      queryFormApi.setFormValues({ period: ledgerDate.value });
      await getTableData();
    });
    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => {
        syncQuery();
      });
    };
    const getTableData = async (): Promise<void> => {
      const current = ++requestVersion;
      loading.value = true;
      try {
        const { data } = await overtimeDetailPage({
          userId,
          workType: type,
          period: ledgerDate.value.length > 0 ? ledgerDate.value.join(",") : "",
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
        });
        if (current !== requestVersion) {
          return;
        }
        dataSource.value = data.records;
        pagination.value.total = data.total;
      } catch (error) {
        message.error(error instanceof Error ? error.message : "加载加班明细失败");
      } finally {
        if (current === requestVersion) {
          loading.value = false;
        }
      }
    };
    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      syncQuery();
    };
    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      queryFormApi.setFormValues({ period: ledgerDate.value });
      await getTableData();
    };
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      exportLoading.value = true;
      try {
        exportLoading.value = true;

        await overtimeDetailExport({
          userId,
          workType: type,
          period: ledgerDate.value.length > 0 ? ledgerDate.value.join(",") : "",
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
        })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "请假台账详情.xlsx");
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          })
          .catch(() => {
            message.warn("未查询到数据，无法导出");
          });
      } catch (error) {
        message.error(error instanceof Error ? error.message : "导出失败");
      } finally {
        exportLoading.value = false;
      }
    };
    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          component: "RangePicker",
          fieldName: "period",
          label: "",
          defaultValue: dateTime ? dateTime.split(",") : undefined,
          componentProps: { valueFormat: "YYYY-MM-DD", allowClear: false },
        },
      ],
      handleSubmit: (values) => {
        ledgerDate.value = Array.isArray(values.period) ? values.period.map(String) : [];
        void queryForm();
      },
      handleReset: () => {
        void reset();
      },
    });
    const layoutSlots = {
      "layout-header": (): VNode => (
        <Button type="primary" onClick={exportExcel} loading={exportLoading.value}>
          导出
        </Button>
      ),
      "layout-content": (): VNode => (
        <>
          <QueryForm />
          <ResultTable />
        </>
      ),
      "footer-page": (): VNode => (
        <>
          <Page
            cachePageQuery={false}
            current={pagination.value.pageNumber}
            pageSize={pagination.value.pageSize}
            total={pagination.value.total}
            onPageChange={pageChange}
          />
        </>
      ),
    };
    const exportLoading = ref(false);
    const columns: PcTableColumn[] = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "userName",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      // {
      //   title: '加班申请时间',
      //   dataIndex: 'department',

      // },
      // {
      //   title: '加班处理时间',
      //   dataIndex: 'department',
      // },
      {
        title: "加班类型",
        dataIndex: "workType",
        customRender: ({ text }: { text: string }): string =>
          text === "REST" ? "休息日加班" : text === "WORK" ? "工作日加班" : text === "FESTIVAL" ? "节假日加班" : "",
      },
      {
        title: "加班开始时间",
        dataIndex: "startTime",
        customRender: ({ text }: { text: number }): string => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        title: "加班结束时间",
        dataIndex: "endTime",
        customRender: ({ text }: { text: number }): string => dayjs(text).format("YYYY-MM-DD HH:mm:ss"),
      },
      {
        title: "加班时长(小时)",
        dataIndex: "actualDuration",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
    ];
    const [ResultTable, tableApi] = usePcTable({
      columns: columns,
      rowKey: "id",
      tableCode: "attendance-overtime-ledger-detail",
      autoFetch: false,
    });
    watchEffect(() => {
      tableApi.setColumns(columns);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });
    return (): VNode => <Layout title="加班台账" v-slots={layoutSlots} />;
  },
});
