import { type PcTableColumn, dayjs, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, message, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watchEffect } from "vue";
import { useRoute } from "vue-router";

import { exportHandleLog, getHandleLogPage } from "@/api/handle-record";
import { usePageName } from "@/hook/use-page-name";
import { logger } from "@/logger";
import { hasPermission } from "@/permission";
import { appFunctionCodes } from "@/permission";

export const HandleRecord = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const permission = appFunctionCodes.attendanceHandleLogRecord;
    const defaultPeriod = [dayjs().startOf("month").format("YYYY-MM-DD"), dayjs().endOf("month").format("YYYY-MM-DD")];
    const formState = reactive<{ userName: string; period: string[]; keyword: string; objType: string | undefined }>({
      userName: "",
      period: defaultPeriod,
      keyword: "",
      objType: undefined,
    });

    const exportLoading = ref(false);
    const exportExcel = async (): Promise<void> => {
      if (exportLoading.value) {
        return;
      }
      try {
        exportLoading.value = true;
        await exportHandleLog({
          ...formState,
          period: formState.period.join(","),
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
            link.setAttribute("download", "操作日志记录.xlsx");
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

    const columns = [
      {
        title: "操作时间",
        dataIndex: "operationTime",
        ellipsis: true,
        width: 180,
        fixed: "left",
        customRender: ({ text }: { text: string }): VNode => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "操作人",
        dataIndex: "userName",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "业务应用",
        dataIndex: "businessType",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作",
        dataIndex: "operationType",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作对象",
        dataIndex: "operationObj",
        ellipsis: true,
        width: 180,
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "操作内容",
        dataIndex: "operationContent",
        ellipsis: true,
        width: 400,
        customRender: ({ text }: { text: string }): VNode => {
          const tag = text ? <p style={{ maxWidth: "400px" }} v-html={text} /> : "--";
          return <PopOver content={tag as string}>{tag}</PopOver>;
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
      userName: formState.userName,
      period: formState.period,
      keyword: formState.keyword,
      objType: formState.objType,
      pageNumber: pagination.value.pageNumber,
      pageSize: pagination.value.pageSize,
    });
    const queryDefaults: {
      userName: string;
      period: string[];
      keyword: string;
      objType: string | undefined;
      pageNumber: number;
      pageSize: number;
    } = {
      userName: "",
      period: defaultPeriod,
      keyword: "",
      objType: undefined,
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
      formState.userName = (next.userName as string) ?? "";
      formState.period = Array.isArray(next.period)
        ? (next.period as string[])
        : typeof (next.period as unknown) === "string"
          ? String(next.period).split(",")
          : defaultPeriod;
      formState.keyword = (next.keyword as string) ?? "";
      formState.objType = next.objType as string | undefined;
      pagination.value.pageNumber = Number(next.pageNumber ?? 1);
      pagination.value.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());
    const objTypeOptions = [
      { value: "ATTENDANCE_SECTION", label: "考勤组" },
      { value: "CLASSES", label: "班次" },
      { value: "ARRANGE_WORK", label: "人员排班" },
      { value: "BE_ON_DUTY", label: "人员值班" },
      { value: "HOLIDAY_BALANCE", label: "假期余额" },
      { value: "HOLIDAY_TYPE", label: "假期类型" },
      { value: "OVERTIME_RULE", label: "加班规则" },
      { value: "SUPPLEMENT_CARD_RULE", label: "补卡规则" },
    ];

    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      loading.value = true;
      try {
        const res = await getHandleLogPage({
          pageNumber: pagination.value.pageNumber,
          pageSize: pagination.value.pageSize,
          ...formState,
          period: formState.period.join(","),
        });
        if (request !== requestVersion) {
          return;
        }
        if (res.data) {
          const { records, total } = res.data;
          dataSource.value = records;
          pagination.value.total = total;
        }
      } catch (error) {
        if (request === requestVersion) {
          message.error(error instanceof Error ? error.message : "数据加载失败");
        }
      } finally {
        if (request === requestVersion) {
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
      await getTableData();
    };

    onMounted(async () => {
      applyQuery(queryState.state);
      await getTableData();
      syncQuery();
    });

    const layoutSlots = {
      "layout-header": (): VNode => (
        <div>
          {hasPermission(permission.export) && (
            <Button type="primary" onClick={exportExcel} loading={exportLoading.value}>
              导出
            </Button>
          )}
        </div>
      ),
      "layout-content": (): VNode => (
        <>
          <QueryForm />
          <PcDataTable />
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
    };
    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "period",
          label: "日期",
          component: "DateRangePicker",
          defaultValue: formState.period,
          componentProps: {
            valueFormat: "YYYY-MM-DD",
            get allowClear() {
              return false;
            },
          },
        },
        {
          fieldName: "userName",
          label: "操作人",
          component: "Input",
          defaultValue: formState.userName,
          componentProps: {
            get placeholder() {
              return "请输入操作人姓名";
            },
            get showCount() {
              return false;
            },
          },
        },
        {
          fieldName: "objType",
          label: "操作对象",
          component: "Select",
          defaultValue: formState.objType,
          componentProps: {
            get placeholder() {
              return "请选择操作对象";
            },
            get options() {
              return objTypeOptions;
            },
          },
        },
        {
          fieldName: "keyword",
          label: "操作内容",
          component: "Input",
          defaultValue: formState.keyword,
          componentProps: {
            get placeholder() {
              return "请输入操作内容";
            },
            get showCount() {
              return false;
            },
          },
        },
      ],
      handleSubmit: () => void queryForm(),
      handleReset: () => void reset(),
      handleValuesChange: (values) => {
        formState.period = values["period"] as typeof formState.period;
        formState.userName = values["userName"] as typeof formState.userName;
        formState.objType = values["objType"] as typeof formState.objType;
        formState.keyword = values["keyword"] as typeof formState.keyword;
      },
    });
    watchEffect(() =>
      queryFormApi.setFormValues({
        period: formState.period,
        userName: formState.userName,
        objType: formState.objType,
        keyword: formState.keyword,
      }),
    );
    const [PcDataTable, tableApi] = usePcTable({ columns: [], autoFetch: false, rowKey: "id", tableCode: tableCode });
    watchEffect(() => {
      tableApi.setColumns(columns as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = loading.value;
    });

    return (): VNode => (
      <>
        <Layout title={pageTitle ?? "操作日志记录"} v-slots={layoutSlots} />
      </>
    );
  },
});
