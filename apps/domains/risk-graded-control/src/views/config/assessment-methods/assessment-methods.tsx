import { computed, defineComponent, reactive, ref } from "vue";

import { getAssessmentMethod, pageAssessmentMethods } from "@/api/server";
import { RiskLevelTag } from "@/components/risk-level-tag/risk-level-tag";
import { LIST_ACTION_LINK_PROPS, RISK_LEVEL_LABEL, TABLE_PAGE_SIZE } from "@/constants";
import { useAuthRequest } from "@/hooks/use-auth-request";
import {
  Button,
  Drawer,
  Form,
  FormItem,
  Input,
  Page,
  PageLayout as PcLayout,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  usePcForm,
  usePcTable,
  type ColumnType,
} from "@/pc-ui-runtime";
import type { AssessmentMethodVO, AssessmentDimension, AssessmentLevelRule } from "@/types/risk";
import { showApiError } from "@/utils/api-error";
import { createListPageState } from "@/utils/list-page";
import { useLayoutTitle } from "@/utils/page-title";
import { mapAssessmentMethodFromApi } from "@/utils/risk-control-mapper";

export const AssessmentMethodsPage = defineComponent({
  name: "AssessmentMethodsPage",
  setup() {
    const page = reactive(createListPageState(TABLE_PAGE_SIZE));
    const search = reactive({
      keyword: "",
    });
    const drawerVisible = ref(false);

    const form = reactive({
      code: "",
      name: "",
      formula: "",
      description: "",
      status: "ENABLED" as AssessmentMethodVO["status"],
      dimensions: [] as AssessmentDimension[],
      levelRules: [] as AssessmentLevelRule[],
    });

    const fillForm = (record: AssessmentMethodVO): void => {
      form.code = record.code;
      form.name = record.name;
      form.formula = record.formula;
      form.description = record.description ?? "";
      form.status = record.status;
      form.dimensions = record.dimensions.map((d) => ({ ...d, options: [...d.options] }));
      form.levelRules = record.levelRules.map((r) => ({ ...r }));
    };

    const formatDimensions = (method: AssessmentMethodVO): string =>
      method.dimensions.map((d) => `${d.name}(${d.code})`).join(" / ") || "—";

    const formatLevelRules = (method: AssessmentMethodVO): string =>
      method.levelRules.map((r) => `${r.range} ${RISK_LEVEL_LABEL[r.level]}`).join(" · ") || "—";

    const openView = async (record: AssessmentMethodVO): Promise<void> => {
      try {
        const vo = await useAuthRequest(() => getAssessmentMethod(record.id));
        fillForm(mapAssessmentMethodFromApi(vo));
        drawerVisible.value = true;
      } catch (e) {
        showApiError(e);
      }
    };

    const dimensionColumns: ColumnType[] = [
      { title: "维度编码", dataIndex: "code", width: 90 },
      { title: "维度名称", dataIndex: "name", width: 120 },
      {
        title: "评分选项",
        dataIndex: "options",
        customRender: ({ record }: { record: AssessmentDimension }) => (
          <Space wrap size={4}>
            {record.options.map((o) => (
              <Tag key={o.value}>
                {o.label}={o.value}
              </Tag>
            ))}
          </Space>
        ),
      },
    ];

    const ruleColumns: ColumnType[] = [
      {
        title: "风险等级",
        dataIndex: "level",
        width: 110,
        customRender: ({ text }: { text: AssessmentLevelRule["level"] }) => <RiskLevelTag level={text} />,
      },
      { title: "颜色", dataIndex: "color", width: 70 },
      { title: "分值范围", dataIndex: "range", width: 120 },
      { title: "管控要求", dataIndex: "requirement", ellipsis: true },
    ];

    const columns: ColumnType[] = [
      { title: "方法编码", dataIndex: "code", width: 90 },
      { title: "方法名称", dataIndex: "name", width: 200, ellipsis: true },
      {
        title: "评价维度",
        dataIndex: "dimensions",
        width: 220,
        ellipsis: true,
        customRender: ({ record }: { record: AssessmentMethodVO }) => formatDimensions(record),
      },
      {
        title: "等级判定规则",
        dataIndex: "levelRules",
        width: 280,
        ellipsis: true,
        customRender: ({ record }: { record: AssessmentMethodVO }) => <span style={{ fontSize: "12px" }}>{formatLevelRules(record)}</span>,
      },
      {
        title: "适用场景",
        dataIndex: "description",
        width: 160,
        ellipsis: true,
        customRender: ({ text }: { text: string }) => text || "—",
      },
      {
        title: "状态",
        dataIndex: "status",
        width: 80,
        customRender: ({ text }: { text: string }) => (
          <Tag color={text === "ENABLED" ? "green" : "default"}>{text === "ENABLED" ? "启用" : "停用"}</Tag>
        ),
      },
      {
        title: "操作",
        fixed: "right",
        dataIndex: "action",
        width: 80,
        customRender: ({ record }: { record: AssessmentMethodVO }) => (
          <Button
            {...LIST_ACTION_LINK_PROPS}
            onClick={() => {
              void openView(record);
            }}
          >
            查看
          </Button>
        ),
      },
    ];

    const fetchMethodPage = async () => {
      const result = await useAuthRequest(() =>
        pageAssessmentMethods({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: search.keyword.trim() || undefined,
        }),
      );
      const records = (result?.records ?? []).map(mapAssessmentMethodFromApi);
      return {
        total: result?.total ?? 0,
        pages: result?.pages ?? 0,
        records,
      };
    };

    const [PcTable, tableApi] = usePcTable({
      columns,
      tableCode: "RISK_ASSESSMENT_METHODS",
      rowKey: "id",
      fetchApi: fetchMethodPage,
      fetchLoaded: (data) => {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      schema: [
        {
          component: "Input",
          label: "",
          fieldName: "keyword",
          componentProps: { placeholder: "搜索方法名称/编码", allowClear: true, maxlength: 100 },
        },
      ],
      syncStateRef: search,
      syncMap: (values) => ({
        keyword: (values.keyword as string | undefined) ?? "",
      }),
      onHydratedQuery: () => {
        tableApi.query();
      },
      handleSubmit: (values) => {
        search.keyword = (values.keyword as string | undefined) ?? "";
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset: () => {
        search.keyword = "";
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

    const drawerTitle = computed(() => `查看评估方法：${form.name}`);

    const slots = {
      "layout-content": () => (
        <div class="risk-stack risk-table-page">
          <PcForm />
          <PcTable />
          <Drawer
            title={drawerTitle.value}
            open={drawerVisible.value}
            width={720}
            onClose={() => {
              drawerVisible.value = false;
            }}
            footer={
              <Button
                onClick={() => {
                  drawerVisible.value = false;
                }}
              >
                关闭
              </Button>
            }
          >
            <Form layout="vertical">
              <FormItem label="方法编码">
                <Input v-model:value={form.code} disabled />
              </FormItem>
              <FormItem label="方法名称">
                <Input v-model:value={form.name} disabled />
              </FormItem>
              <FormItem label="计算公式">
                <Input v-model:value={form.formula} disabled />
              </FormItem>
              <FormItem label="适用场景">
                <Input v-model:value={form.description} disabled />
              </FormItem>
              <FormItem label="状态">
                <Select v-model:value={form.status} disabled>
                  <SelectOption value="ENABLED">启用</SelectOption>
                  <SelectOption value="DISABLED">停用</SelectOption>
                </Select>
              </FormItem>
            </Form>
            <h4 style={{ margin: "16px 0 8px" }}>评价维度配置</h4>
            <Table columns={dimensionColumns} dataSource={form.dimensions} rowKey="code" pagination={false} size="small" />
            <h4 style={{ margin: "16px 0 8px" }}>等级判定规则</h4>
            <Table columns={ruleColumns} dataSource={form.levelRules} rowKey="level" pagination={false} size="small" />
          </Drawer>
        </div>
      ),
      "footer-page": () => <Page current={page.pageNumber} pageSize={page.pageSize} total={page.total} onPageChange={handlePageChange} />,
    };

    return () => <PcLayout title={useLayoutTitle("评估方法配置")} v-slots={slots} />;
  },
});
