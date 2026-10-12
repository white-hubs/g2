// @ts-nocheck — 从 ghcloud daily-task 迁入，运行时依赖已切换为 g2 Platform/Client。
import {
  type DailyPlanModel,
  PlanStatusColor,
  PlanStatusMap,
  PlanStatusOptions,
  UrgencyColor,
  getCurrentDailyType,
  initDailyTypeFromRoute,
} from "@g2-client/daily-task/client";
import { computed, defineComponent, markRaw, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { cubeDailyTaskService } from "@/api/server";
import { DailyTaskTypeSelect } from "@/components/daily-task-widgets";
import { AntModal, Button, Page, PopConfirm, PopOver, Switch, message } from "@/pc-ui-runtime";
import { PageLayout, usePcForm, usePcTable } from "@/pc-ui-runtime";
import { dayjs } from "@/pc-ui-runtime";
import { getTaskTypeLabel } from "@/utils/daily-task-edit-common";
import { usePageName } from "@/utils/page-title";

export const TaskPlan = defineComponent({
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
      taskCategoryId: "",
      keyword: "",
      total: 0,
    });

    /**
     * 表格
     */
    const columns = [
      {
        sort: 0,
        title: "名称",
        dataIndex: "planName",
        align: "center",
        ellipsis: true,
        defaultVisible: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        sort: 1,
        title: taskTypeLabel.value,
        dataIndex: "taskCategoryName",
        align: "center",
        ellipsis: true,
        defaultVisible: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || ""}>{text || "--"}</PopOver>,
      },
      {
        sort: 2,
        title: "任务对象数",
        dataIndex: "targetCount",
        align: "center",
        ellipsis: true,
        defaultVisible: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text || "--"}>{text || "--"}</PopOver>,
      },
      {
        sort: 3,
        title: "生效时间",
        dataIndex: "startTime",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: number }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        sort: 4,
        title: "失效时间",
        dataIndex: "endTime",
        align: "center",
        ellipsis: true,
        defaultVisible: true,
        customRender: ({ text }: { text: number }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        sort: 5,
        title: "紧急程度",
        dataIndex: "urgencyName",
        align: "center",
        ellipsis: true,
        customRender: ({ record }: { record: { urgencyId: string; urgencyName: string; id: string } }): JSX.Element => {
          const text = record.urgencyName;
          const textColor = UrgencyColor.get(text || "");
          return (
            <PopOver content={text || ""}>
              <span style={{ color: textColor || "" }}>{text || "--"}</span>
            </PopOver>
          );
        },
      },
      {
        sort: 6,
        title: "状态",
        dataIndex: "status",
        align: "center",
        ellipsis: true,
        defaultVisible: true,
        customRender: ({ text }: { text: string }): JSX.Element => {
          const textVal = text ? PlanStatusMap.get(text) : "";
          const textColor = PlanStatusColor.get(text || "");
          return (
            <PopOver content={textVal || ""}>
              <span style={{ color: textColor }}>{textVal || "--"}</span>
            </PopOver>
          );
        },
      },
      {
        sort: 7,
        title: "创建人",
        dataIndex: "createByName",
        align: "center",
        ellipsis: true,
        defaultVisible: true,
        customRender: ({ text }: { text: string }): JSX.Element => <PopOver content={text}>{text}</PopOver>,
      },
      {
        sort: 8,
        title: "创建时间",
        dataIndex: "createTime",
        align: "center",
        ellipsis: true,
        customRender: ({ text }: { text: number }): JSX.Element => {
          const time = text ? dayjs(text).format("YYYY-MM-DD HH:mm:ss") : "--";
          return <PopOver content={time}>{time}</PopOver>;
        },
      },
      {
        sort: 9,
        title: "停用/启用",
        dataIndex: "enable",
        align: "center",
        defaultVisible: true,
        customRender: ({ record }: { record: { enable: boolean; planName: string; id: string } }): JSX.Element => (
          <Switch
            v-model:checked={record.enable}
            checkedValue
            unCheckedValue={false}
            onChange={() => {
              AntModal.confirm({
                title: `是否确认${record.enable ? "启用" : "禁用"}计划${record.planName}`,
                onOk: async () => {
                  try {
                    await cubeDailyTaskService.updateDailyPlanEnable({
                      id: record.id,
                      enable: record.enable,
                    });
                    message.success(`${record.enable ? "启用" : "禁用"}成功`);
                    tableApi.query();
                  } catch (error) {
                    const { errorMessage } = (error as { toJSON: () => { errorMessage: string } }).toJSON();
                    message.error(errorMessage || "请求失败");
                  }
                },
                onCancel: () => {
                  record.enable = !record.enable;
                },
              });
            }}
            checked-children="启用"
            un-checked-children="禁用"
          />
        ),
      },
      {
        sort: 10,
        title: "操作",
        dataIndex: "action",
        width: 200,
        fixed: "right",
        defaultVisible: true,
        customRender: ({ record }: { record: DailyPlanModel }): JSX.Element => (
          <>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void router.push(`/d/daily-task/task-plan-edit?type=detail&id=${record.id}`);
              }}
            >
              详情
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void router.push(`/d/daily-task/task-plan-edit?type=edit&id=${record.id}`);
              }}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              onClick={() => {
                void router.push(`/d/daily-task/task-plan-edit?type=copy&id=${record.id}`);
              }}
            >
              复制
            </Button>
            <PopConfirm
              title="确认删除该项？"
              onConfirm={async () => {
                try {
                  await cubeDailyTaskService.deleteDailyPlan({ id: record.id });
                  message.success("删除成功");
                  tableApi.query();
                } catch (error) {
                  const { errorMessage } = (error as { toJSON: () => { errorMessage: string } }).toJSON();
                  message.error(errorMessage || "请求失败");
                }
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

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode,
      rowKey: "id",
      fetchApi: async () =>
        cubeDailyTaskService.getDailyPlanPage({
          pageNumber: searchParams.pageNumber,
          pageSize: searchParams.pageSize,
          dailyType: getCurrentDailyType(),
          status: searchParams.status ?? "",
          name: searchParams.keyword ?? "",
          taskCategoryId: searchParams.taskCategoryId ?? "",
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
            ...Object.keys(PlanStatusOptions).map((item) => ({
              label: PlanStatusOptions[item as keyof typeof PlanStatusOptions],
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
        component: markRaw(DailyTaskTypeSelect),
        label: taskTypeLabel.value,
        fieldName: "taskCategoryId",
        componentProps: {
          placeholder: `请选择${taskTypeLabel.value}`,
          allowClear: true,
          fieldNames: { label: "name", value: "id" },
          onChange: (value: string): void => {
            searchParams.pageNumber = 1;
            searchParams.taskCategoryId = value;
            tableApi.query();
          },
        },
      },
      {
        component: "Input",
        label: "",
        fieldName: "keyword",
        componentProps: {
          placeholder: "计划名称",
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
        searchParams.keyword = data.keyword ? (data.keyword as string) : "";
        searchParams.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        searchParams.pageNumber = 1;
        searchParams.keyword = "";
        searchParams.status = "";
        searchParams.taskCategoryId = "";
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
            void router.push(`/d/daily-task/task-plan-edit?type=create`);
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
