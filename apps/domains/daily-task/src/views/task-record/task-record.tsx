// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { type DailyTaskRecordModel, RecordStatusColor, RecordStatusMap, TaskResultOptions } from "@g2-client/daily-task/client";
import { getCurrentDailyType, initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { Button, Page, PopOver } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";
import { usePageName } from "@/utils/page-title";

import styles from "./task-record.module.css";

export const TaskRecord = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    initDailyTypeFromRoute(route);
    const tableCode = route.path.replaceAll("/", "");
    /**
     * 表单配置
     */
    const formSchema = [
      {
        component: "Select",
        label: "结果",
        fieldName: "executionResult",
        defaultValue: null,
        componentProps: {
          placeholder: "巡查结果",
          options: [
            {
              label: "全部",
              value: "",
            },
            ...Object.keys(TaskResultOptions).map((item) => ({
              label: TaskResultOptions[item as keyof typeof TaskResultOptions],
              value: item,
            })),
          ],
          onChange: (value: string): void => {
            searchParams.executionResult = value;
            searchParams.pageNumber = 1;
            tableApi.query();
          },
        },
      },
      {
        component: "RangePicker",
        label: "执行时间",
        fieldName: "executionTime",
        componentProps: {
          valueFormat: "YYYY-MM-DD HH:mm:ss",
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "taskName",
        componentProps: {
          placeholder: "任务名称",
        },
      },
    ];
    const searchParams = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
      dailyType: getCurrentDailyType(),
      executionResult: "",
      executionTime: "",
      taskName: "",
    });
    const getRecordStatus = (record: DailyTaskRecordModel): string =>
      record.recordStatus || (record.executionResult === "NORMAL" ? "NORMAL" : "ABNORMAL_WAIT_REPAIR");
    const [PcForm] = usePcForm({
      syncStateRef: searchParams,
      onHydratedQuery: () => {
        tableApi.query();
      },
      layout: "horizontal",
      handleSubmit: (data) => {
        searchParams.taskName = data.taskName ? (data.taskName as string) : "";
        searchParams.executionTime = data.executionTime ? (data.executionTime as string[]).join(",") : "";
        searchParams.executionResult = data.executionResult ? (data.executionResult as string) : "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.taskName = "";
        searchParams.executionTime = "";
        searchParams.executionResult = "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      schema: formSchema,
      showCollapseButton: true,
    });

    /**
     * 表格
     */
    const columns = [
      {
        dataIndex: "taskName",
        title: "任务名称",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "executorName",
        title: "巡检人员",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "executionTime",
        title: "巡检时间",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = dayjs(text).format("YYYY-MM-DD HH:mm:ss");
          return <PopOver content={time || ""}>{time || "--"}</PopOver>;
        },
      },
      {
        dataIndex: "executionResult",
        title: "结果",
        ellipsis: true,
        align: "center",
        customRender: ({ record }: { record: DailyTaskRecordModel }): JSX.Element => {
          const status = getRecordStatus(record);
          const textVal = RecordStatusMap.get(status) || "";
          return (
            <PopOver content={textVal || ""}>
              <span style={{ color: RecordStatusColor.get(status) }}>{textVal || "--"}</span>
            </PopOver>
          );
        },
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        customRender: ({ record }: { record: DailyTaskRecordModel }): JSX.Element => (
          <>
            <Button
              type="link"
              onClick={() => {
                void router.push(`/d/daily-task/task-record-info?id=${record.id}`);
              }}
            >
              详情
            </Button>
          </>
        ),
      },
    ];
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () =>
        cubeDailyTaskService.getDailyTaskRecordPage({
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          dailyType: getCurrentDailyType(),
          executionResult: searchParams.executionResult ?? "",
          taskName: searchParams.taskName ?? "",
          executionTime: searchParams.executionTime ?? "",
        }),
      fetchLoaded: (data) => {
        searchParams.total = data.total;
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-content": (): JSX.Element => (
        <div>
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={searchParams.pageNumber} pageSize={searchParams.pageSize} total={searchParams.total} onPageChange={handleChange} />
      ),
    };
    return (): JSX.Element => <PageLayout class={styles.container} title={pageTitle} v-slots={slots} />;
  },
});
