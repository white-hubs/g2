import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { supplementLedgerDetail, supplementLedgerDetailExport } from "@/api/staff-supplement";
import { usePageName } from "@/hook/use-page-name";
import { KEYWORD_ALIAS } from "@/keyword-alias";
import { logger } from "@/logger";

/** 补卡台账详情 */
export const SupplementLedgerDetail = defineComponent({
  setup: () => {
    const router = useRouter();
    const { title: pageTitle } = usePageName();
    const { userId, period } = useRoute().query;
    const defaultPeriod = period
      ? period.toString().split(",")
      : [dayjs().startOf("month").format("YYYY-MM-DD"), dayjs().endOf("month").format("YYYY-MM-DD")];
    const formState = reactive({
      userId,
      period: defaultPeriod,
    });

    const exportLoading = ref(false);
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await supplementLedgerDetailExport({ ...formState, period: formState.period.join(",") })
          .then((res) => {
            const { data } = res;
            const link = document.createElement("a");
            const blob = new Blob([data as BlobPart], {
              type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            link.style.display = "none";
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "补卡台账.xlsx");
            document.body.append(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
          })
          .catch((res) => {
            logger.debug(res);
            message.warn("未查询到数据，无法导出");
          });
      } catch (error) {
        logger.error(error);
      } finally {
        exportLoading.value = false;
      }
    };

    const columns: PcTableColumn[] = [
      {
        title: `${KEYWORD_ALIAS.staff}姓名`,
        dataIndex: "userName",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text ?? "--"}>{text ?? "--"}</PopOver>,
      },
      {
        title: "补卡申请时间",
        dataIndex: "createTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => {
          const time = dayjs(text).format("YYYY-MM-DD HH:mm:ss");
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "补卡处理时间",
        dataIndex: "updateTime",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => {
          const time = dayjs(text).format("YYYY-MM-DD HH:mm:ss");
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "补卡日期",
        dataIndex: "clockInDate",
        ellipsis: true,
        customRender: ({ text }: { text: string }): VNode => {
          const time = dayjs(text).format("YYYY-MM-DD");
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "补卡班次",
        dataIndex: "classesName",
        ellipsis: true,
        customRender: ({ record }: { record: { startWorkTime: string; endWorkTime: string } }): VNode => {
          const res = record.startWorkTime ? `${record.startWorkTime}-${record.endWorkTime}` : "--";
          return <PopOver content={res || "--"}>{res || "--"}</PopOver>;
        },
      },
    ];

    const loading = ref(false);
    const dataSource = ref<unknown[]>([]);
    const pagination = ref({
      pageSize: 10,
      pageNumber: 1,
      total: 0,
    });

    const getQuery = () => ({
      userId: formState.userId,
      period: formState.period,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: ReturnType<typeof getQuery> = {
      userId,
      period: defaultPeriod,
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
      const restoredPeriod = next.period;
      formState.period = Array.isArray(restoredPeriod)
        ? restoredPeriod
        : restoredPeriod
          ? String(restoredPeriod).split(",")
          : defaultPeriod;
      formState.userId = next.userId ?? null;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const current = ++requestVersion;
      try {
        loading.value = true;
        const res = await supplementLedgerDetail({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
          period: formState.period.join(","),
        });
        if (current !== requestVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        logger.debug(error);
        message.error("加载数据失败");
      } finally {
        if (current === requestVersion) {
          loading.value = false;
        }
      }
    };

    const pageChange = (pageNumber: number, pageSize: number): void => {
      pagination.value.pageNumber = pageNumber || 1;
      pagination.value.pageSize = pageSize;
      getTableData().then(() => {
        syncQuery();
      });
    };

    const queryForm = async (): Promise<void> => {
      pagination.value.pageNumber = 1;
      await getTableData();
      syncQuery();
    };
    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      queryFormApi.setFormValues(formState);
      await getTableData();
    };

    onMounted(async () => {
      applyQuery(queryState.state);
      queryFormApi.setFormValues(formState);
      await getTableData();
      syncQuery();
    });

    const [ResultTable, tableApi] = usePcTable({
      columns: columns,
      rowKey: "id",
      tableCode: "attendance-supplement-ledger-detail",
      autoFetch: false,
    });
    watchEffect(() => {
      tableApi.setColumns(columns);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });
    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      syncStateRef: formState,
      schema: [
        {
          component: "RangePicker",
          fieldName: "period",
          label: "日期",
          defaultValue: defaultPeriod,
          componentProps: { allowClear: false, valueFormat: "YYYY-MM-DD" },
        },
      ],
      handleSubmit: () => {
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
        <Page
          cachePageQuery={false}
          current={pagination.value.pageNumber}
          pageSize={pagination.value.pageSize}
          total={pagination.value.total}
          onPageChange={pageChange}
        />
      ),
      "footer-btn": (): VNode => (
        <Button
          onClick={() => {
            router.back();
          }}
        >
          返回
        </Button>
      ),
    };
    return (): VNode => (
      <>
        <Layout title={(pageTitle ?? "补卡台账") + "-详情"} v-slots={layoutSlots} />
      </>
    );
  },
});
