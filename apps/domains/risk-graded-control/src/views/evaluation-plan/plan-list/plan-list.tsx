import { defineComponent, reactive } from "vue";
import { useRouter } from "vue-router";

import { deleteAssessmentPlan, pageAssessmentPlans, patchAssessmentPlan } from "@/api/server";
import { LIST_ACTION_DELETE_PROPS, LIST_ACTION_LINK_PROPS, TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  AntModal,
  Button,
  Page,
  PageLayout as PcLayout,
  Space,
  Switch,
  message,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { EvaluationPlanVO } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapEvaluationPlanFromApi } from "@/utils/risk-control-mapper";

export const PlanListPage = defineComponent({
  name: "PlanListPage",
  setup() {
    const router = useRouter();
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
      status: "" as "" | "ENABLED" | "DISABLED",
    });

    const reloadList = (): void => {
      tableApi.query();
    };

    const toggleStatus = async (record: EvaluationPlanVO, checked: boolean): Promise<void> => {
      try {
        await useAuthRequest(() => patchAssessmentPlan(record.id, { enabled: checked }));
        message.success(checked ? "已启用" : "已停用");
        reloadList();
      } catch (e) {
        showApiError(e);
      }
    };

    const handleDelete = (record: EvaluationPlanVO): void => {
      AntModal.confirm({
        centered: true,
        title: "删除确认",
        content: `确定删除评估计划「${record.name}」吗？`,
        onOk: async () => {
          try {
            await useAuthRequest(() => deleteAssessmentPlan(record.id));
            message.success("删除成功");
            reloadList();
          } catch (e) {
            showApiError(e);
          }
        },
      });
    };

    const columns: ColumnType[] = [
      { dataIndex: "name", title: "计划名称", width: 220, ellipsis: true },
      { dataIndex: "unitName", title: "评估单元", width: 180, ellipsis: true },
      { dataIndex: "cycle", title: "评估周期", width: 100 },
      {
        dataIndex: "nextExecuteTime",
        title: "下次执行时间",
        width: 190,
        customRender: ({ text }: { text?: string }): JSX.Element => <span style={{ whiteSpace: "nowrap" }}>{text || "-"}</span>,
      },
      {
        dataIndex: "notifyCount",
        title: "通知人数",
        width: 90,
        customRender: ({ text }: { text: number }): string => `${text} 人`,
      },
      {
        dataIndex: "status",
        title: "状态",
        width: 110,
        customRender: ({ record }: { record: EvaluationPlanVO }): JSX.Element => (
          <Switch
            checked={record.status === "ENABLED"}
            checkedChildren="启用"
            unCheckedChildren="禁用"
            onChange={(checked) => {
              void toggleStatus(record, Boolean(checked));
            }}
          />
        ),
      },
      {
        dataIndex: "action",
        title: "操作",
        fixed: "right",
        width: 130,
        customRender: ({ record }: { record: EvaluationPlanVO }): JSX.Element => (
          <Space>
            <Button {...LIST_ACTION_LINK_PROPS} onClick={() => router.push({ name: "evaluation-plan-form", query: { id: record.id } })}>
              编辑
            </Button>
            <Button {...LIST_ACTION_DELETE_PROPS} onClick={() => handleDelete(record)}>
              删除
            </Button>
          </Space>
        ),
      },
    ];

    const fetchPlanPage = async () => {
      const result = await useAuthRequest(() =>
        pageAssessmentPlans({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
          status: search.status || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapEvaluationPlanFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_EVALUATION_PLANS",
      rowKey: "id",
      fetchApi: fetchPlanPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Select",
          label: "状态",
          fieldName: "status",
          defaultValue: "",
          componentProps: {
            allowClear: true,
            placeholder: "全部",
            options: [
              { label: "全部", value: "" },
              { label: "启用", value: "ENABLED" },
              { label: "停用", value: "DISABLED" },
            ],
          },
        },
        {
          component: "Input",
          label: "关键词",
          fieldName: "keyword",
          componentProps: { placeholder: "计划名称/单元", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
        status: (values.status as "" | "ENABLED" | "DISABLED" | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        search.status = (values.status as "" | "ENABLED" | "DISABLED" | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
        search.status = "";
        page.pageNumber = 1;
        tableApi.query();
      },
      showCollapseButton: true,
    });

    const handlePageChange = (pageNumber: number, pageSize: number): void => {
      page.pageNumber = pageNumber;
      page.pageSize = pageSize;
      tableApi.query();
    };

    const slots = {
      "layout-header": (): JSX.Element => (
        <Button type="primary" onClick={() => router.push({ name: "evaluation-plan-form" })}>
          新增
        </Button>
      ),
      "layout-content": (): JSX.Element => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
        </div>
      ),
      "footer-page": (): JSX.Element => (
        <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />
      ),
    };

    return () => <PcLayout title={useLayoutTitle("评估计划")} v-slots={slots} />;
  },
});
