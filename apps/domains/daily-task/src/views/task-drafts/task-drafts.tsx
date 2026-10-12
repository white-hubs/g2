// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import { DailyTaskStatus } from "@g2-client/daily-task/client";
import { getCurrentDailyType, initDailyTypeFromRoute } from "@g2-client/daily-task/client";
import { computed, defineComponent, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { DailyTaskTypeSelect, DailyTaskUrgencySelect } from "@/components/daily-task-widgets";
import { Button, Page, PopConfirm, PopOver, message } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";
import { getTaskTypeLabel } from "@/utils/daily-task-edit-common";
import { usePageName } from "@/utils/page-title";

export const TaskDrafts = defineComponent({
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
      keyword: "",
      taskCategoryId: "",
      urgencyId: "",
      total: 0,
    });

    const searchFormSchema = [
      {
        component: DailyTaskTypeSelect,
        label: taskTypeLabel.value,
        fieldName: "taskCategoryId",
        componentProps: {
          placeholder: `请选择${taskTypeLabel.value}`,
          allowClear: true,
        },
      },
      {
        component: DailyTaskUrgencySelect,
        label: "紧急程度",
        fieldName: "urgencyId",
        componentProps: {
          placeholder: "请选择",
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
    const [PcForm] = usePcForm({
      syncStateRef: searchParams,
      onHydratedQuery: () => {
        tableApi.query();
      },
      layout: "horizontal",
      handleSubmit: (data) => {
        searchParams.keyword = (data.keyword as string) ?? "";
        searchParams.taskCategoryId = (data.taskCategoryId as string) ?? "";
        searchParams.urgencyId = (data.urgencyId as string) ?? "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.keyword = "";
        searchParams.taskCategoryId = "";
        searchParams.urgencyId = "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      schema: searchFormSchema,
      showCollapseButton: true,
    });

    const columns = [
      {
        title: "任务名称",
        dataIndex: "taskName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "紧急程度",
        dataIndex: "urgencyName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: taskTypeLabel.value,
        dataIndex: "taskCategoryName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "负责人",
        dataIndex: "taskUserName",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "任务时限",
        dataIndex: "deadline",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        title: "创建人",
        dataIndex: "publishUser",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        title: "创建时间",
        dataIndex: "startTime",
        ellipsis: true,
        align: "center",
        customRender: ({ text }: { text: string }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        dataIndex: "action",
        title: "操作",
        slots: {
          customRender: "action",
        },
        fixed: "right",
        width: 180,
        customRender: ({ record }: { record: Record<string, string> }): JSX.Element => (
          <>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void router.push(`/d/daily-task/task-edit?type=edit&id=${record.id}`);
              }}
            >
              编辑
            </Button>
            <PopConfirm
              title="确认删除该项？"
              onConfirm={() => {
                deleteRow(record.id);
              }}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </PopConfirm>
          </>
        ),
      },
    ];
    const page = reactive({
      pageNumber: searchParams.pageNumber,
      pageSize: searchParams.pageSize,
      total: searchParams.total,
    });
    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () => {
        const params = {
          dailyType: getCurrentDailyType(),
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          status: DailyTaskStatus.DRAFT,
          keyword: searchParams.keyword ?? "",
          taskCategoryId: searchParams.taskCategoryId ?? "",
          urgencyId: searchParams.urgencyId ?? "",
        };
        return cubeDailyTaskService.getDailyTaskPage(params);
      },
      fetchLoaded: (data) => {
        page.total = data.total;
        searchParams.total = data.total;
        page.pageNumber = searchParams.pageNumber;
        page.pageSize = searchParams.pageSize;
      },
    });
    const handleChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      searchParams.pageNumber = pageNumber;
      searchParams.pageSize = pageSize;
      tableApi.query();
    };
    const deleteRow = async (id: string): Promise<void> => {
      try {
        await cubeDailyTaskService.deleteDailyTask(id);
        message.success("操作成功");
        tableApi.query();
      } catch {}
    };
    const slots = {
      "layout-content": (): JSX.Element => (
        <div>
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handleChange} />
      ),
    };
    return (): JSX.Element => <PageLayout title={pageTitle} v-slots={slots}></PageLayout>;
  },
});
