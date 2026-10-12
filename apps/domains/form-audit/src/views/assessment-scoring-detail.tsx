import type { AppraisalRecordDetail, AppraisalRecordDetailItem } from "@g2-contract/form-audit";
import { Button, Descriptions, DescriptionsItem, PageLayout, Spin, Tag, message, usePcTable } from "@g2-platform/pc-ui";
import { computed, defineComponent, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getFormAuditClient } from "../domain-context";
import { errorMessage, periodLabel } from "../shared";

const valueText = (value: unknown): string => (value === null || value === undefined || String(value).trim() === "" ? "--" : String(value));
const sourceLabel = (value?: string): string => ({ FORM: "表单", INSPECT: "巡检", MAINTAIN: "维保" })[value ?? ""] ?? value ?? "--";
const withRowKey = (record: AppraisalRecordDetailItem, index: number): AppraisalRecordDetailItem & { rowKey: string } => ({
  ...record,
  rowKey: record.id ?? `${record.contentType}-${record.itemName}-${record.sourceRefName}-${index}`,
});

export const AssessmentScoringDetail = defineComponent({
  name: "FormAuditAssessmentScoringDetail",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(true);
    const detail = ref<AppraisalRecordDetail>();

    const [PcTable, tableApi] = usePcTable({
      tableCode: "FORM_AUDIT_SCORING_DETAIL",
      rowKey: "rowKey",
      autoFetch: false,
      columns: [
        {
          title: "类别",
          dataIndex: "contentType",
          width: 90,
          customRender: ({ text }: { text?: string }) => (
            <Tag color={text === "SPOT_CHECK" ? "blue" : "green"}>{text === "SPOT_CHECK" ? "抽查" : "检查"}</Tag>
          ),
        },
        { title: "来源", dataIndex: "sourceType", width: 90, customRender: ({ text }: { text?: string }) => sourceLabel(text) },
        { title: "底稿名称", dataIndex: "sourceRefName", width: 150, ellipsis: true },
        { title: "考核内容", dataIndex: "contentDesc", width: 170, ellipsis: true },
        { title: "评分标准", dataIndex: "standardDesc", width: 170, ellipsis: true },
        { title: "评分项", dataIndex: "itemName", width: 140, ellipsis: true },
        {
          title: "实际结果",
          dataIndex: "rawValue",
          width: 130,
          customRender: ({ record }: { record: AppraisalRecordDetailItem }) => valueText(record.rawValue || record.matchedRangeText),
        },
        { title: "原始扣分", dataIndex: "originDeductScore", width: 100 },
        { title: "调整扣分", dataIndex: "manualAdjustDeductScore", width: 100 },
        { title: "最终扣分", dataIndex: "finalDeductScore", width: 100, fixed: "right" },
      ],
    });

    const load = async (): Promise<void> => {
      const id = String(route.params.id ?? "");
      if (!id) {
        message.error("缺少考核记录 ID");
        loading.value = false;
        return;
      }
      try {
        detail.value = (await getFormAuditClient().getAppraisalRecord(id)) ?? undefined;
        tableApi.setDataSource((detail.value?.details ?? []).map((record, index) => withRowKey(record, index)));
      } catch (error) {
        message.error(errorMessage(error, "考核评分详情加载失败"));
      } finally {
        loading.value = false;
      }
    };
    void load();

    const finalTotal = computed(() => detail.value?.finalTotalScore ?? detail.value?.originTotalScore);
    return () => (
      <PageLayout
        title="考核评分详情"
        v-slots={{
          "layout-content": () => (
            <Spin spinning={loading.value}>
              <div class="form-audit-page" style={{ minHeight: "280px", overflow: "auto" }}>
                {detail.value ? (
                  <>
                    <h2 class="form-audit-section-title">基础信息</h2>
                    <Descriptions bordered column={3} size="small">
                      <DescriptionsItem label="表单名称">{valueText(detail.value.name)}</DescriptionsItem>
                      <DescriptionsItem label="检查项目">{valueText(detail.value.inspectionItem)}</DescriptionsItem>
                      <DescriptionsItem label="责任部门">{valueText(detail.value.responsibleDepartmentNames)}</DescriptionsItem>
                      <DescriptionsItem label="考核周期">{periodLabel(detail.value.periodType)}</DescriptionsItem>
                      <DescriptionsItem label="总分">{valueText(detail.value.originTotalScore)}</DescriptionsItem>
                      <DescriptionsItem label="最终得分">
                        <strong>{valueText(finalTotal.value)}</strong>
                      </DescriptionsItem>
                      <DescriptionsItem label="抽查得分">
                        {valueText(detail.value.finalSpotCheckScore ?? detail.value.originSpotCheckScore)}
                      </DescriptionsItem>
                      <DescriptionsItem label="检查得分">
                        {valueText(detail.value.finalInspectionScore ?? detail.value.originInspectionScore)}
                      </DescriptionsItem>
                      <DescriptionsItem label="调整说明">{valueText(detail.value.adjustRemark)}</DescriptionsItem>
                    </Descriptions>
                    <h2 class="form-audit-section-title" style={{ marginTop: "24px" }}>
                      评分明细
                    </h2>
                    <PcTable />
                  </>
                ) : !loading.value ? (
                  <div class="form-audit-empty">暂无考核记录详情</div>
                ) : null}
              </div>
            </Spin>
          ),
          "footer-page": () => (
            <div class="form-audit-footer-actions">
              <Button onClick={() => void router.push("/d/form-audit/assessment-scoring")}>返回</Button>
            </div>
          ),
        }}
      />
    );
  },
});
