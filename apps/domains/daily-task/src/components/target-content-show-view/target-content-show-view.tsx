// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import {
  type DailyTaskRelateModel,
  DailyTaskStatus,
  DailyTaskStatusColor,
  DailyTaskStatusOptions,
  DailyTaskTargetCategoryOptions,
  TaskResultOptions,
  type TaskSummaryModel,
} from "@g2-client/daily-task/client";
import { defineComponent, onMounted, reactive } from "vue";
import { useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { Button, Page, PopOver } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";

import styles from "./target-content-show-view.module.css";

export const TargetContentShowView = defineComponent({
  props: {
    taskId: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    const router = useRouter();
    const page = reactive({
      pageNumber: 1,
      pageSize: 10,
      total: 0,
    });

    const taskSummary = reactive<TaskSummaryModel>({
      taskName: "",
      total: 0,
      checked: 0,
      abnormal: 0,
      progress: 0,
      status: "",
    });

    const getTaskSummary = async (): Promise<void> => {
      if (!props.taskId) {
        return;
      }
      try {
        const resp = await cubeDailyTaskService.getTaskSummary({
          taskId: props.taskId,
        });
        if (resp) {
          Object.assign(taskSummary, resp);
        }
      } catch {}
    };

    const getStatusColor = (): string => {
      const key = taskSummary.status || "";
      return DailyTaskStatusColor.get(key) ?? "#666";
    };

    onMounted(() => {
      getTaskSummary();
    });

    const searchFormSchema = [
      {
        component: "Select",
        label: "对象类型",
        fieldName: "targetType",
        defaultValue: null,
        componentProps: {
          placeholder: "对象类型",
          options: DailyTaskTargetCategoryOptions,
        },
      },
      {
        component: "Select",
        label: "结果",
        fieldName: "result",
        defaultValue: "",
        componentProps: {
          allowClear: true,
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
        },
      },
      {
        component: "RangePicker",
        label: "时间",
        fieldName: "executeTime",
        componentProps: {
          valueFormat: "YYYY-MM-DD HH:mm:ss",
          allowClear: true,
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: {
          placeholder: "对象名称",
        },
      },
    ];

    const [PcForm, formApi] = usePcForm({
      layout: "horizontal",
      handleSubmit: () => {
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        page.pageNumber = 1;
        tableApi.query();
      },
      schema: searchFormSchema,
      showCollapseButton: true,
    });

    const columns = [
      {
        title: "对象名称",
        dataIndex: "targetName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "对象类型",
        dataIndex: "targetType",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const targetTypeName = DailyTaskTargetCategoryOptions.find((item) => item.value === text)?.label || "--";
          return <PopOver content={text || "--"}>{targetTypeName || "--"}</PopOver>;
        },
      },
      {
        title: "状态",
        dataIndex: "status",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const statusName = DailyTaskStatusOptions[text as keyof typeof DailyTaskStatusOptions] || "--";
          return <PopOver content={statusName || "--"}>{statusName || "--"}</PopOver>;
        },
      },
      {
        title: "执行人",
        dataIndex: "executorName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "时间",
        dataIndex: "executionTime",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "结果",
        dataIndex: "executionResult",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const resultName = TaskResultOptions[text as keyof typeof TaskResultOptions] || "--";
          return <PopOver content={resultName || "--"}>{resultName || "--"}</PopOver>;
        },
      },
      {
        title: "异常明细",
        dataIndex: "exceptionDetail",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        dataIndex: "action",
        title: "操作",
        slots: {
          customRender: "action",
        },
        fixed: "right",
        width: 120,
        customRender: ({ record }: { record: DailyTaskRelateModel }): JSX.Element => {
          const isShow = record.status === DailyTaskStatus.DONE;
          return (
            <Button type="link" size="small" disabled={!isShow} onClick={() => showRowRecord(record)}>
              查看详情
            </Button>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "target-content-show-view",
      rowKey: "targetId",
      fetchApi: async () => {
        const params = {
          pageSize: page.pageSize,
          pageNumber: page.pageNumber,
          taskId: props.taskId ?? "",
          keyword: (formApi.formValues.keyword as string) ?? "",
          result: (formApi.formValues.result as string) ?? "",
          targetType: (formApi.formValues.targetType as string) ?? "",
          executeTime: ((formApi.formValues.executeTime as string[]) ?? []).join(","),
        };
        return cubeDailyTaskService.getDailyTaskRelatePage(params);
      },
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const showRowRecord = (record: DailyTaskRelateModel): void => {
      void router.push(`/d/daily-task/task-target-info?taskId=${record.taskId}&targetId=${record.id}`);
    };

    const slots = {
      "layout-content": (): JSX.Element => (
        <div>
          <div class={styles.statRow}>
            <div class={`${styles.statItem} ${styles.isTotal}`}>
              <span class={styles.statLabel}>对象总数</span>
              <span class={styles.statValue}>{taskSummary.total}</span>
            </div>
            <div class={`${styles.statItem} ${styles.isChecked}`}>
              <span class={styles.statLabel}>已检查</span>
              <span class={styles.statValue}>{taskSummary.checked}</span>
            </div>
            <div class={`${styles.statItem} ${styles.isAbnormal}`}>
              <span class={styles.statLabel}>异常</span>
              <span class={styles.statValue}>{taskSummary.abnormal}</span>
            </div>
            <div class={`${styles.statItem} ${styles.isProgress}`}>
              <span class={styles.statLabel}>完成进度</span>
              <span class={styles.statValue}>{Math.round((taskSummary.progress ?? 0) * 100)}%</span>
            </div>
            <div class={styles.statItem}>
              <span class={styles.statLabel}>任务状态</span>
              <span class={styles.statValue} style={{ color: getStatusColor() }}>
                {DailyTaskStatusOptions[taskSummary.status as keyof typeof DailyTaskStatusOptions] || "--"}
              </span>
            </div>
          </div>
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handleChange} />
      ),
    };
    return (): JSX.Element => <PageLayout showHeader={false} v-slots={slots}></PageLayout>;
  },
});
