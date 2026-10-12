import { type PcTableColumn, dayjs, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { Button, Page, PopOver, usePcQueryState } from "@g2-platform/pc-ui";
import { PageLayout as Layout } from "@g2-platform/pc-ui";
import { type VNode, defineComponent, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";

import { attendanceApprovePage } from "@/api/attendance-record";

import "./index.less";

export const AttendanceRecord = defineComponent({
  setup: () => {
    const router = useRouter();
    const statusText = (str: string): string => {
      const statusMap = new Map([
        ["SUBMIT", "提交"],
        ["UNDO", "撤销"],
        ["REPEAT", "重新提交"],
        ["APPROVAL", "审批"],
        ["BACK", "撤回"],
        ["COPY", "抄送"],
        ["REJECT", "驳回"],
        ["FINISHED", "完成"],
      ]);
      return statusMap.get(str) || "处理中";
    };
    const formState = reactive<{
      period: string[];
    }>({
      period: [],
    });
    const columns = [
      {
        title: "编号",
        dataIndex: "formNo",
        ellipsis: true,
        width: "120px",
        fixed: "left",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "申请名称",
        dataIndex: "instanceName",
        ellipsis: true,
        width: "120px",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起人",
        dataIndex: "startUserName",
        ellipsis: true,
        width: "120px",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发起部门",
        dataIndex: "startUserInfo",
        ellipsis: true,
        width: "120px",
        customRender: ({ text }: { text: { organizationName: string } }): VNode => {
          const val = text?.organizationName ?? "";
          return <PopOver content={val || "--"}>{val || "--"}</PopOver>;
        },
      },
      {
        title: "发起时间",
        dataIndex: "submitedTime",
        ellipsis: true,
        width: "120px",
        customRender: ({ text }: { text: string }): VNode => {
          const val = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "-";
          return <PopOver content={val || "--"}>{val || "--"}</PopOver>;
        },
      },
      {
        title: "处理状态",
        dataIndex: "status",
        ellipsis: true,
        width: "120px",
        customRender: ({ text }: { text: string }): VNode => {
          const val = text ? statusText(text) : "";
          return <PopOver content={val || "--"}>{val || "--"}</PopOver>;
        },
      },
      {
        title: "处理进度",
        dataIndex: "activeNodeName",
        ellipsis: true,
        width: "120px",
        customRender: ({ text }: { text: string }): VNode => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "action",
        title: "操作",
        width: "120px",
        customRender: ({ record }: { record: Record<string, string> }): VNode => (
          <>
            <Button
              type="link"
              onClick={() => {
                handleDetail(record);
              }}
            >
              详情
            </Button>
          </>
        ),
      },
    ];
    const dataSource = ref<unknown[]>([]);

    const handleDetail = (record: Record<string, string>): void => {
      const target = `/d/attendance/${route.path.endsWith("attendance-pre-record") ? "attendance-pre-statistics" : "attendance-ledger-summary"}/flow-render?businessType=${record.businessType}&processInstanceId=${record.processInstanceId}&type=detail&title=工作汇报&appName=考勤管理`;
      void router.push(decodeURIComponent(target));
    };
    const state = reactive({
      loading: false,
      exportLoading: false,
      pendingVisible: false,
      handlerVisible: false,
      searchParams: {
        pageNumber: 1,
        pageSize: 10,
        total: 0,
      },
      selectRow: "",
    });
    const getQuery = () => ({
      period: formState.period,
      pageNumber: state.searchParams.pageNumber,
      pageSize: state.searchParams.pageSize,
    });
    const queryDefaults: {
      period: string[];
      pageNumber: number;
      pageSize: number;
    } = {
      period: [],
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
      formState.period = Array.isArray(next.period)
        ? (next.period as string[])
        : typeof (next.period as unknown) === "string"
          ? String(next.period).split(",")
          : [];
      state.searchParams.pageNumber = Number(next.pageNumber ?? 1);
      state.searchParams.pageSize = Number(next.pageSize ?? 10);
    };
    const syncQuery = (): void => queryState.update(getQuery());
    let requestVersion = 0;
    const getTableData = async (): Promise<void> => {
      const request = ++requestVersion;
      state.loading = true;
      try {
        const params = {
          ...state.searchParams,
          ...searchVal.value,
          period: formState.period.length > 0 ? `${formState.period[0]},${formState.period[1]}` : "",
        };
        const { data } = await attendanceApprovePage(params);
        if (request !== requestVersion) {
          return;
        }
        dataSource.value = data.records;
        state.searchParams.total = data.total;
      } catch (error) {
        if (request === requestVersion) {
          message.error(error instanceof Error ? error.message : "数据加载失败");
        }
      } finally {
        if (request === requestVersion) {
          state.loading = false;
        }
      }
    };
    const changePage = (page: number, pageSize: number): void => {
      state.searchParams.pageNumber = page;
      state.searchParams.pageSize = pageSize;
      getTableData().then(() => syncQuery());
    };
    const route = useRoute();
    const tableCode = route.path.replaceAll("/", "");
    const searchVal = ref<Record<string, string>>({});
    const title = ref("考勤汇总统计");
    const readDrilldown = (): void => {
      const raw = route.query.searchValue;
      searchVal.value = typeof raw === "string" ? (JSON.parse(raw) as Record<string, string>) : {};
      if (searchVal.value.period) {
        formState.period = searchVal.value.period.split(",");
      }
      title.value = String(route.query.title ?? "考勤汇总统计");
    };
    watch(
      () => route.query.searchValue,
      async () => {
        readDrilldown();
        await getTableData();
        syncQuery();
      },
    );
    onMounted(async () => {
      readDrilldown();
      // 下钻参数提供初始日期；返回明细时优先恢复用户后来选择的日期和分页。
      applyQuery({
        ...queryState.state,
        period: route.query.period === undefined ? formState.period : queryState.state.period,
      });
      await getTableData();
      syncQuery();
    });
    const queryForm = async (): Promise<void> => {
      state.searchParams.pageNumber = 1;
      await getTableData();
      syncQuery();
    };
    const reset = async (): Promise<void> => {
      applyQuery(queryDefaults);
      syncQuery();
      await getTableData();
    };

    const searchForm = (): JSX.Element => (
      <>
        <div>
          <QueryForm />
        </div>
      </>
    );

    const layoutSlots = {
      "layout-content": (): VNode => (
        <>
          {searchForm()}
          <PcDataTable />
        </>
      ),
      "footer-page": (): VNode => (
        <div class="footer-content">
          <Page
            cachePageQuery={false}
            current={state.searchParams.pageNumber}
            pageSize={state.searchParams.pageSize}
            total={state.searchParams.total}
            onPageChange={changePage}
          />
          <Button
            onClick={() => {
              router.back();
            }}
          >
            返回
          </Button>
        </div>
      ),
    };
    const [QueryForm, queryFormApi] = usePcForm({
      layout: "inline",
      cache: false,
      schema: [
        {
          fieldName: "period",
          label: "时间范围",
          component: "DateRangePicker",
          defaultValue: formState.period,
          componentProps: {
            get allowClear() {
              return false;
            },
            get showTime() {
              return true;
            },
            get valueFormat() {
              return "YYYY-MM-DD HH:mm:ss";
            },
          },
        },
      ],
      handleSubmit: () => void queryForm(),
      handleReset: () => void reset(),
      handleValuesChange: (values) => {
        formState.period = values["period"] as typeof formState.period;
      },
    });
    watchEffect(() => queryFormApi.setFormValues({ period: formState.period }));
    const [PcDataTable, tableApi] = usePcTable({ columns: [], autoFetch: false, rowKey: "id", tableCode: tableCode });
    watchEffect(() => {
      tableApi.setColumns(columns as PcTableColumn[]);
      tableApi.setDataSource(dataSource.value);
      tableApi.loading.value = state.loading;
    });

    return (): VNode => (
      <>
        <Layout title={`${title.value}明细`} v-slots={layoutSlots} />
      </>
    );
  },
});
