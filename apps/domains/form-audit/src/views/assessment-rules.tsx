import type { AppraisalPeriodType, AppraisalRule } from "@g2-contract/form-audit";
import { Button, Page, PageLayout, PopConfirm, Switch, message, usePcForm, usePcTable } from "@g2-platform/pc-ui";
import { defineComponent, reactive, ref } from "vue";
import { useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { errorMessage, loadCommonOptions, periodLabel, periodOptions } from "../shared";

export const AssessmentRules = defineComponent({
  name: "FormAuditAssessmentRules",
  setup() {
    const router = useRouter();
    const query = reactive<{ keyword: string; periodType?: AppraisalPeriodType; responsibleDepartmentId?: string; enabled?: boolean }>({
      keyword: "",
    });
    const departments = ref<{ label: string; value: string }[]>([]);
    const page = reactive({ pageNumber: 1, pageSize: 10, total: 0 });

    const setEnabled = async (record: AppraisalRule, enabled: boolean): Promise<void> => {
      if (!record.id) {
        return;
      }
      const previous = record.enabled;
      record.enabled = enabled;
      try {
        await getFormAuditClient().updateAppraisalRuleEnabled(record.id, enabled);
        message.success("操作成功");
      } catch (error) {
        record.enabled = previous;
        message.error(errorMessage(error, "状态更新失败"));
      }
    };

    const remove = async (record: AppraisalRule): Promise<void> => {
      if (!record.id) {
        return;
      }
      if (record.enabled) {
        message.warning("启用中的规则不可删除，请先禁用");
        return;
      }
      if (record.inUse) {
        message.warning("规则正在使用中，不能删除");
        return;
      }
      try {
        await getFormAuditClient().deleteAppraisalRule(record.id);
        message.success("删除成功");
        tableApi.query();
      } catch (error) {
        message.error(errorMessage(error, "删除失败"));
      }
    };

    const [PcTable, tableApi] = usePcTable({
      tableCode: "FORM_AUDIT_ASSESSMENT_RULES",
      rowKey: "id",
      columns: [
        { title: "规则名称", dataIndex: "name", width: 180, ellipsis: true },
        { title: "检查项目", dataIndex: "inspectionItem", width: 180, ellipsis: true },
        {
          title: "考核周期",
          dataIndex: "periodType",
          width: 110,
          customRender: ({ text }: { text?: AppraisalPeriodType }) => periodLabel(text),
        },
        { title: "总分值", dataIndex: "totalScore", width: 90 },
        { title: "抽查分值", dataIndex: "spotCheckScore", width: 100 },
        { title: "检查分值", dataIndex: "inspectionScore", width: 100 },
        { title: "责任部门", dataIndex: "responsibleDepartmentNames", width: 180, ellipsis: true },
        {
          title: "开关",
          dataIndex: "enabled",
          width: 100,
          fixed: "right",
          customRender: ({ record }: { record: AppraisalRule }) => (
            <Switch
              checked={Boolean(record.enabled)}
              checkedChildren="启用"
              unCheckedChildren="禁用"
              onChange={(value: boolean | string | number) => void setEnabled(record, Boolean(value))}
            />
          ),
        },
        {
          title: "操作",
          dataIndex: "action",
          width: 190,
          fixed: "right",
          customRender: ({ record }: { record: AppraisalRule }) => (
            <div class="form-audit-link-actions">
              <Button type="link" size="small" onClick={() => void router.push(`/d/form-audit/assessment-rules/detail/${record.id}`)}>
                详情
              </Button>
              <Button type="link" size="small" onClick={() => void router.push(`/d/form-audit/assessment-rules/edit/${record.id}`)}>
                编辑
              </Button>
              <PopConfirm
                title="确认删除该规则？"
                okText="确定"
                cancelText="取消"
                disabled={Boolean(record.enabled || record.inUse)}
                onConfirm={() => void remove(record)}
              >
                <Button type="link" size="small" danger disabled={Boolean(record.enabled || record.inUse)}>
                  删除
                </Button>
              </PopConfirm>
            </div>
          ),
        },
      ],
      fetchApi: () =>
        getFormAuditClient().pageAppraisalRules({
          pageNumber: page.pageNumber,
          pageSize: page.pageSize,
          keyword: query.keyword || undefined,
          periodType: query.periodType,
          responsibleDepartmentId: query.responsibleDepartmentId,
          enabled: query.enabled,
        }),
      fetchLoaded(data) {
        page.total = data.total;
      },
    });

    const [PcForm] = usePcForm({
      layout: "horizontal",
      syncStateRef: query,
      schema: [
        { component: "Input", fieldName: "keyword", label: "规则名称", defaultValue: "", componentProps: { allowClear: true } },
        { component: "Select", fieldName: "periodType", label: "考核周期", componentProps: { allowClear: true, options: periodOptions } },
        {
          component: "Select",
          fieldName: "responsibleDepartmentId",
          label: "责任部门",
          componentProps: { allowClear: true, options: departments },
        },
        {
          component: "Select",
          fieldName: "enabled",
          label: "启用状态",
          componentProps: {
            allowClear: true,
            options: [
              { label: "启用", value: true },
              { label: "禁用", value: false },
            ],
          },
        },
      ],
      handleSubmit(values) {
        query.keyword = String(values.keyword ?? "").trim();
        query.periodType = typeof values.periodType === "string" ? (values.periodType as AppraisalPeriodType) : undefined;
        query.responsibleDepartmentId = typeof values.responsibleDepartmentId === "string" ? values.responsibleDepartmentId : undefined;
        query.enabled = typeof values.enabled === "boolean" ? values.enabled : undefined;
        page.pageNumber = 1;
        tableApi.query();
      },
      handleReset() {
        Object.assign(query, { keyword: "", periodType: undefined, responsibleDepartmentId: undefined, enabled: undefined });
        page.pageNumber = 1;
        tableApi.query();
      },
    });

    void loadCommonOptions()
      .then((options) => {
        departments.value = options.departments;
      })
      .catch((error: unknown) => message.error(errorMessage(error, "责任部门加载失败")));

    return () => (
      <PageLayout
        title="考核规则"
        v-slots={{
          "layout-header": () => (
            <Button type="primary" onClick={() => void router.push("/d/form-audit/assessment-rules/add")}>
              新增
            </Button>
          ),
          "layout-content": () => (
            <div class="form-audit-table-page">
              <PcForm />
              <PcTable />
            </div>
          ),
          "footer-page": () => (
            <Page
              current={page.pageNumber}
              pageSize={page.pageSize}
              total={page.total}
              cachePageQuery={false}
              onPageChange={(pageNumber: number, pageSize: number) => {
                page.pageNumber = pageNumber;
                page.pageSize = pageSize;
                tableApi.query();
              }}
            />
          ),
        }}
      />
    );
  },
});
