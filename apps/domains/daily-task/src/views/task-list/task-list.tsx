// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import {
  DailyTaskStatus,
  DailyTaskStatusColor,
  DailyTaskStatusMap,
  DailyTaskStatusOptions,
  DailyTaskType,
  getCurrentDailyType,
  initDailyTypeFromRoute,
} from "@g2-client/daily-task/client";
import { computed, defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { DailyTaskTypeSelect, DailyTaskUrgencySelect } from "@/components/daily-task-widgets";
import { Button, Page, PopConfirm, PopOver, message } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";
import { getTaskTypeLabel } from "@/utils/daily-task-edit-common";
import { usePageName } from "@/utils/page-title";

import styles from "./task-list.module.css";

export const TaskList = defineComponent({
  setup: () => {
    const { pageTitle } = usePageName();
    const route = useRoute();
    const router = useRouter();
    initDailyTypeFromRoute(route);
    const tableCode = route.path.replaceAll("/", "");
    const taskTypeLabel = computed(() => getTaskTypeLabel(getCurrentDailyType()));
    const searchParams = reactive({
      pageNumber: 1,
      pageSize: 10,
      status: "",
      urgencyId: "",
      taskCategoryId: "",
      queryType: "",
      keyword: "",
      period: "",
      total: 0,
    });

    /**
     * 表格
     */
    const columns = [
      {
        title: "任务名称",
        dataIndex: "taskName",
        align: "left",
        ellipsis: true,
        customRender: ({ record }: { record: Record<string, unknown> }): JSX.Element => {
          const name = (record.taskName as string) || "--";
          const master = record.master as boolean | undefined;
          const showBadge = master !== undefined;
          const prefix = master ? "主任务" : "子任务";
          const display = `${showBadge ? `【${prefix}】` : ""}${name}`;
          const badgeText = master ? "主" : "子";
          const badgeClass = master ? styles["badge-main"] : styles["badge-sub"];
          return (
            <PopOver content={display}>
              {showBadge && <span class={`${styles.badge} ${badgeClass}`}>{badgeText}</span>}
              <span>{name}</span>
            </PopOver>
          );
        },
      },
      {
        title: "发布人",
        dataIndex: "publishUser",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text}>{text}</PopOver>,
      },
      {
        title: "发布部门",
        dataIndex: "publishDepartment",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "发布时间",
        dataIndex: "startTime",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: number }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        title: taskTypeLabel.value,
        dataIndex: "taskCategoryName",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "紧急程度",
        dataIndex: "urgencyName",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: number }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "负责人",
        dataIndex: "taskUserName",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: number }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        title: "任务时限",
        dataIndex: "deadline",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time || "--"}>{time || "--"}</PopOver>;
        },
      },
      {
        title: "状态",
        dataIndex: "status",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: string }): JSX.Element => {
          const textVal = text ? DailyTaskStatusMap.get(text) : "";
          return (
            <PopOver content={textVal || ""}>
              <span style={{ color: DailyTaskStatusColor.get(text || "") }}>{textVal || "--"}</span>
            </PopOver>
          );
        },
      },
      {
        title: "操作",
        dataIndex: "action",
        fixed: "right",
        width: 200,
        customRender: ({ record }: { record: Record<string, string> }): JSX.Element => {
          const isTerminated = record.status === DailyTaskStatus.WAIT;
          return (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => {
                  void router.push(`/d/daily-task/task-edit?type=detail&id=${record.id}`);
                }}
              >
                详情
              </Button>
              {isTerminated && (
                <PopConfirm
                  title="确认终止该任务？"
                  onConfirm={async () => {
                    try {
                      await cubeDailyTaskService.terminateDailyTask(record.id);
                      message.success("终止成功");
                      tableApi.query();
                    } catch (error) {
                      const { errorMessage } = (error as { toJSON: () => { errorMessage: string } }).toJSON();
                      message.error(errorMessage || "请求失败");
                    }
                  }}
                >
                  <Button type="link" size="small" danger>
                    终止
                  </Button>
                </PopConfirm>
              )}
            </>
          );
        },
      },
    ];

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () => {
        const dailyType = getCurrentDailyType();
        const params = {
          dailyType: dailyType,
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          status: searchParams.status,
          keyword: searchParams.keyword ?? "",
          taskCategoryId: searchParams.taskCategoryId ?? "",
          urgencyId: searchParams.urgencyId ?? "",
          queryType: searchParams.queryType ?? "",
          period: searchParams.period ?? "",
        };
        if (dailyType === DailyTaskType.Inspection) {
          return cubeDailyTaskService.getDailyInspectTaskPage(params);
        } else if (dailyType === DailyTaskType.SmallInspection) {
          return cubeDailyTaskService.getDailySmallInspectionTaskPage(params);
        }
        return cubeDailyTaskService.getDailyTaskPage(params);
      },
      fetchLoaded: (data) => {
        searchParams.total = data.total;
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };

    /**
     * 表单配置
     */
    const formSchema = [
      {
        component: "Select",
        label: "状态",
        fieldName: "status",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          options: [
            {
              label: "全部",
              value: "",
            },
            ...Object.keys(DailyTaskStatusOptions).map((item) => ({
              label: DailyTaskStatusOptions[item as keyof typeof DailyTaskStatusOptions],
              value: item,
            })),
          ],
          onChange: (value: string): void => {
            searchParams.pageNumber = 1;
            searchParams.status = value;
            tableApi.query();
          },
        },
      },
      {
        component: DailyTaskTypeSelect,
        label: taskTypeLabel.value,
        fieldName: "taskCategoryId",
        componentProps: {
          placeholder: `请选择${taskTypeLabel.value}`,
          allowClear: true,
          onChange: (value: string): void => {
            searchParams.pageNumber = 1;
            searchParams.taskCategoryId = value;
            tableApi.query();
          },
        },
      },
      {
        component: DailyTaskUrgencySelect,
        label: "紧急程度",
        fieldName: "urgencyId",
        componentProps: {
          placeholder: "请选择",
          allowClear: true,
          onChange: (value: string): void => {
            searchParams.pageNumber = 1;
            searchParams.urgencyId = value;
            tableApi.query();
          },
        },
      },
      {
        component: "Select",
        label: "类型",
        fieldName: "queryType",
        defaultValue: "",
        componentProps: {
          allowClear: true,
          options: [
            {
              label: "全部",
              value: "",
            },
            {
              label: "主任务",
              value: "MAIN",
            },
            {
              label: "子任务",
              value: "SUB",
            },
          ],
          onChange: (value: string): void => {
            searchParams.pageNumber = 1;
            searchParams.queryType = value;
            tableApi.query();
          },
        },
      },
      {
        component: "RangePicker",
        label: "发布时间",
        fieldName: "period",
        componentProps: {
          valueFormat: "YYYY-MM-DD",
          allowClear: true,
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: {
          placeholder: "任务名称",
        },
      },
    ];
    const [PcForm, formApi] = usePcForm({
      syncStateRef: searchParams,
      onHydratedQuery: () => {
        tableApi.query();
      },
      layout: "horizontal",
      handleSubmit: (data) => {
        searchParams.period = data.period ? (data.period as [string, string]).join(",") : "";
        searchParams.keyword = data.keyword ? (data.keyword as string) : "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.pageNumber = 1;
        searchParams.keyword = "";
        searchParams.status = "";
        searchParams.taskCategoryId = "";
        searchParams.urgencyId = "";
        searchParams.period = "";
        searchParams.queryType = "";
        tableApi.query();
      },
      schema: formSchema,
      showCollapseButton: true,
    });
    formApi.updateSchema(formSchema);

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button
          type="primary"
          onClick={() => {
            void router.push(`/d/daily-task/task-edit?type=create`);
          }}
        >
          新增
        </Button>
      ),
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
    return (): JSX.Element => <PageLayout title={pageTitle} v-slots={slots} />;
  },
});
