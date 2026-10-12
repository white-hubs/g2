import type { AppraisalPeriodType, AppraisalStatisticsPeriod } from "@g2-contract/form-audit";
import { Button, PageLayout, Tag, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { errorMessage, formatDateTime, loadCommonOptions, periodOptions } from "../shared";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 6 }, (_value, index) => ({ label: `${currentYear - index}年`, value: currentYear - index }));
const scoreText = (value?: number): string => (value === null || value === undefined || Number.isNaN(value) ? "--" : String(value));
const withRowKey = (record: AppraisalStatisticsPeriod): AppraisalStatisticsPeriod & { rowKey: string } => ({
  ...record,
  rowKey: `${record.assessmentYear ?? ""}-${record.periodType ?? ""}-${record.assessmentPeriod ?? ""}`,
});

export const AssessmentStatistics = defineComponent({
  name: "FormAuditAssessmentStatistics",
  setup() {
    const router = useRouter();
    const filters = reactive<{ periodType: AppraisalPeriodType; assessmentYear: number; responsibleDepartmentId?: string }>({
      periodType: "MONTHLY",
      assessmentYear: currentYear,
    });
    const departments = ref<{ label: string; value: string }[]>([]);
    const summary = reactive<{ originTotalScore?: number; finalTotalScore?: number; deductScore?: number }>({});
    const generatedAt = ref<string>("--");
    const generating = ref(false);

    const [PcTable, tableApi] = usePcTable({
      tableCode: "FORM_AUDIT_ASSESSMENT_STATISTICS",
      rowKey: "rowKey",
      autoFetch: false,
      columns: [
        { title: "考核周期", dataIndex: "periodLabel", width: 180, ellipsis: true },
        { title: "周期满分", dataIndex: "originTotalScore", width: 140, customRender: ({ text }: { text?: number }) => scoreText(text) },
        { title: "实得分", dataIndex: "finalTotalScore", width: 140, customRender: ({ text }: { text?: number }) => scoreText(text) },
        {
          title: "周期扣分",
          dataIndex: "deductScore",
          width: 140,
          customRender: ({ text }: { text?: number }) =>
            text === null || text === undefined ? "--" : <Tag color={text > 0 ? "red" : "default"}>{text > 0 ? `-${text}` : text}</Tag>,
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 130,
          fixed: "right",
          customRender: ({ record }: { record: AppraisalStatisticsPeriod }) => (
            <Button
              type="link"
              size="small"
              onClick={() =>
                void router.push({
                  path: "/d/form-audit/assessment-scoring",
                  query: {
                    assessmentYear: filters.assessmentYear,
                    periodType: filters.periodType,
                    assessmentPeriod: record.assessmentPeriod,
                    responsibleDepartmentId: filters.responsibleDepartmentId,
                  },
                })
              }
            >
              查看明细
            </Button>
          ),
        },
      ],
    });

    const load = async (): Promise<void> => {
      tableApi.loading.value = true;
      try {
        const data = await getFormAuditClient().getAppraisalStatistics(filters);
        Object.assign(summary, data.summary ?? {});
        generatedAt.value = formatDateTime(data.currentPreviewGeneratedAt);
        tableApi.setDataSource((data.records ?? []).map((record) => withRowKey(record)));
      } catch (error) {
        Object.assign(summary, { originTotalScore: undefined, finalTotalScore: undefined, deductScore: undefined });
        tableApi.setDataSource([]);
        message.error(errorMessage(error, "考核统计加载失败"));
      } finally {
        tableApi.loading.value = false;
      }
    };

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: filters,
      schema: [
        {
          component: "Select",
          fieldName: "responsibleDepartmentId",
          label: "部门视角",
          componentProps: { allowClear: true, options: departments, placeholder: "全市场总览" },
        },
        {
          component: "Select",
          fieldName: "assessmentYear",
          label: "年份",
          defaultValue: currentYear,
          componentProps: { options: years },
        },
        {
          component: "Select",
          fieldName: "periodType",
          label: "统计粒度",
          defaultValue: "MONTHLY",
          componentProps: { options: periodOptions },
        },
      ],
      handleSubmit(values) {
        filters.responsibleDepartmentId = typeof values.responsibleDepartmentId === "string" ? values.responsibleDepartmentId : undefined;
        filters.assessmentYear = Number(values.assessmentYear ?? currentYear);
        filters.periodType = typeof values.periodType === "string" ? (values.periodType as AppraisalPeriodType) : "MONTHLY";
        void load();
      },
      handleReset() {
        filters.responsibleDepartmentId = undefined;
        filters.assessmentYear = currentYear;
        filters.periodType = "MONTHLY";
        void load();
      },
    });

    const generate = async (): Promise<void> => {
      generating.value = true;
      try {
        const generated = await getFormAuditClient().generateAppraisalPreview();
        if (!generated) {
          message.warning("最新数据仍在生成中，请稍后刷新");
          return;
        }
        message.success("最新数据生成成功");
        await load();
      } catch (error) {
        message.error(errorMessage(error, "生成最新数据失败"));
      } finally {
        generating.value = false;
      }
    };

    void loadCommonOptions()
      .then((options) => {
        departments.value = options.departments;
      })
      .catch((error: unknown) => message.error(errorMessage(error, "部门加载失败")));
    void load();

    return () => (
      <PageLayout
        title="考核统计"
        v-slots={{
          "layout-header": () => (
            <div class="form-audit-actions">
              <span style={{ color: "#687386" }}>上次生成时间：{generatedAt.value}</span>
              <Button type="primary" loading={generating.value} onClick={() => void generate()}>
                生成最新数据
              </Button>
            </div>
          ),
          "layout-content": () => (
            <div class="form-audit-table-page">
              <PcForm />
              <div class="form-audit-stat-cards">
                <div class="form-audit-stat-card">
                  <div class="form-audit-stat-label">周期总满分</div>
                  <div class="form-audit-stat-value">{scoreText(summary.originTotalScore)}</div>
                </div>
                <div class="form-audit-stat-card">
                  <div class="form-audit-stat-label">总实得分</div>
                  <div class="form-audit-stat-value">{scoreText(summary.finalTotalScore)}</div>
                </div>
                <div class="form-audit-stat-card">
                  <div class="form-audit-stat-label">总扣分</div>
                  <div class="form-audit-stat-value is-danger">{scoreText(summary.deductScore)}</div>
                </div>
              </div>
              <PcTable />
            </div>
          ),
        }}
      />
    );
  },
});
