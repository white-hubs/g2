import type { HazardAcceptanceRootCauseCode } from "@g2-contract/hazard-governance";
import type {
  HazardRepeatedRectificationDecisionCommand,
  HazardRepeatedRectificationDetailVO,
  HazardRepeatedRectificationRecordVO,
  HazardRepeatedRectificationRootCauseDistributionVO,
  HazardRepeatedRectificationStatus,
} from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, reactive, shallowRef } from "vue";
import type { VNodeChild } from "vue";
import { useRoute, useRouter } from "vue-router";

import { AiRichTextPanel } from "../shared/ai-rich-text-panel";
import { rootCauseTagOptions } from "../shared/data";
import { goBack, useLayoutTitle } from "../shared/page";
import { useAuthRequest } from "@/api/request";
import { decideHazardRepeatedRectification, getHazardRepeatedRectificationDetail } from "@/api/server";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";
import { Button, Card, Form, FormItem, Select, Space, Tag, Textarea, TimeLine, TimeLineItem, message } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const statusTagColor: Record<string, string> = {
  WATCH: "warning",
  IMPORTANT: "orange",
  HIGH_REPEAT: "red",
};

interface DecisionFormState {
  finalRootCauseCode: HazardAcceptanceRootCauseCode | undefined;
  decisionRemark: string;
}

const rootCauseLabelMap = rootCauseTagOptions.reduce<Record<string, string>>((record, item) => {
  record[item.value] = item.label;
  return record;
}, {});

const normalizeRootCauseCode = (value?: string): HazardAcceptanceRootCauseCode | undefined =>
  rootCauseTagOptions.find((item) => item.value === value)?.value;

const renderRootCauseTag = (name?: string, code?: HazardAcceptanceRootCauseCode): VNodeChild => {
  const label = name || (code ? rootCauseLabelMap[code] : undefined);
  if (!label) return "-";
  return <Tag>{label}</Tag>;
};

const formatDate = (value?: string): string => formatTime(value, "-").slice(0, 10);

const renderDistribution = (item: HazardRepeatedRectificationRootCauseDistributionVO): VNodeChild => (
  <div class="hazard-root-cause-distribution-item" key={item.rootCauseCode ?? item.rootCauseName}>
    {renderRootCauseTag(item.rootCauseName, item.rootCauseCode)}
    <strong>{item.count ?? 0}次</strong>
  </div>
);

const renderRecord = (record: HazardRepeatedRectificationRecordVO, index: number): VNodeChild => (
  <TimeLineItem key={record.hazardId ?? record.hazardCode ?? index} color="blue">
    <div class="hazard-root-cause-record">
      <div class="hazard-root-cause-record-main">
        <strong>{formatDate(record.closedTime)} 闭环</strong>
        <span>{record.hazardDescription || record.hazardCode || "-"}</span>
        <div class="hazard-root-cause-record-tags">
          <span>根因标签：</span>
          {renderRootCauseTag(record.rootCauseName, record.rootCauseCode)}
        </div>
      </div>
      <div class="hazard-root-cause-record-user">验收人：{record.acceptanceUserName || record.acceptanceUserId || "-"}</div>
    </div>
  </TimeLineItem>
);

export const RootCauseDetail = defineComponent({
  name: "RootCauseDetail",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const detail = shallowRef<HazardRepeatedRectificationDetailVO>({});
    const submitting = shallowRef(false);
    const decisionForm = reactive<DecisionFormState>({
      finalRootCauseCode: undefined,
      decisionRemark: "",
    });
    const id = computed(() => route.query.id as string | undefined);
    const days = computed(() => Number(route.query.days ?? 30));
    const status = computed(() => (route.query.status as HazardRepeatedRectificationStatus | undefined) ?? "ACTIVE");
    const pageNumber = computed(() => Number(route.query.pageNumber ?? 1));
    const pageSize = computed(() => Number(route.query.pageSize ?? 1000));

    const title = computed(() => detail.value.riskObjectName || detail.value.riskUnitName || "根因详情");
    const isDecided = computed(() => Boolean(detail.value.finalRootCauseCode));
    const aiSuggestedRootCause = computed(() => {
      const [first] = (detail.value.rootCauseDistributions ?? []).toSorted((a, b) => (b.count ?? 0) - (a.count ?? 0));
      return first?.rootCauseName || (first?.rootCauseCode ? rootCauseLabelMap[first.rootCauseCode] : "");
    });
    const aiAnalysisMeta = computed(() => {
      const generatedTime = detail.value.aiRootCauseReportTime;
      return ["AI生成：首次分析", generatedTime ? formatDate(generatedTime) : ""].filter(Boolean).join(" ");
    });
    const subTitle = computed(() => {
      const parts = [
        detail.value.riskObjectName,
        detail.value.riskUnitName ? `（${detail.value.riskUnitName}）` : undefined,
        detail.value.categoryName ? `隐患类型：${detail.value.categoryName}` : undefined,
        `近${days.value}天复发${detail.value.currentRecurrenceCount ?? 0}次`,
        detail.value.statusTagName,
      ].filter(Boolean);
      return parts.join(" · ");
    });

    const loadDetail = async (): Promise<void> => {
      const detailId = id.value;
      if (!detailId) return;
      detail.value = await useAuthRequest(() =>
        getHazardRepeatedRectificationDetail({
          id: detailId,
          pageNumber: pageNumber.value,
          pageSize: pageSize.value,
          status: status.value,
          days: days.value,
        }),
      );
      decisionForm.finalRootCauseCode = normalizeRootCauseCode(detail.value.finalRootCauseCode);
      decisionForm.decisionRemark = detail.value.decisionRemark ?? "";
    };

    const submitDecision = async (): Promise<void> => {
      const detailId = id.value;
      if (!detailId) {
        message.warning("缺少屡改屡犯案件ID");
        return;
      }
      if (isDecided.value) {
        message.warning("确认根因后不可修改");
        return;
      }
      if (!decisionForm.finalRootCauseCode) {
        message.warning("请选择最终根因标签");
        return;
      }
      const payload: HazardRepeatedRectificationDecisionCommand = {
        finalRootCauseCode: decisionForm.finalRootCauseCode,
        ...(decisionForm.decisionRemark ? { decisionRemark: decisionForm.decisionRemark } : {}),
        ...(detail.value.version === undefined ? {} : { version: detail.value.version }),
      };
      submitting.value = true;
      try {
        await useAuthRequest(() => decideHazardRepeatedRectification(detailId, payload));
        message.success("根因裁定已确认");
        await loadDetail();
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      void loadDetail();
    });

    const renderAiAnalysisReport = (): VNodeChild => (
      <AiRichTextPanel title="AI根因分析报告" meta={aiAnalysisMeta.value} content={detail.value.aiRootCauseReport ?? ""} />
    );

    const slots = {
      "layout-content": () => (
        <div class="hazard-root-cause-detail">
          <header class="hazard-root-cause-detail-header">
            <h1>根因详情</h1>
            <p>{subTitle.value}</p>
          </header>
          <section class="hazard-root-cause-overview">
            <div class="hazard-root-cause-overview-item">
              <span>风险对象</span>
              <strong>{title.value}</strong>
            </div>
            <div class="hazard-root-cause-overview-item">
              <span>隐患类型</span>
              <strong>{detail.value.categoryName || "-"}</strong>
            </div>
            <div class="hazard-root-cause-overview-item">
              <span>近{days.value}天复发</span>
              <strong class="is-red">{detail.value.currentRecurrenceCount ?? 0}次</strong>
            </div>
            <div class="hazard-root-cause-overview-item">
              <span>平均复发天数</span>
              <strong>{detail.value.averageRecurrenceDays == null ? "-" : `${detail.value.averageRecurrenceDays}天`}</strong>
            </div>
          </section>
          {detail.value.status === "ACTIVE" ? (
            <section class="hazard-root-cause-trend">
              <span>治理生效中：</span>
              <strong>较裁定前复发趋势持续跟踪</strong>
              {detail.value.statusTagName ? (
                <Tag color={statusTagColor[String(detail.value.statusTag ?? "")]}>{detail.value.statusTagName}</Tag>
              ) : null}
            </section>
          ) : null}
          <Card title="历次闭环记录" class="hazard-root-cause-card">
            <TimeLine>{(detail.value.records ?? []).map(renderRecord)}</TimeLine>
            {(detail.value.records ?? []).length === 0 ? <div class="hazard-muted">暂无闭环记录</div> : null}
            <div class="hazard-root-cause-distribution">
              <div class="hazard-root-cause-distribution-title">
                人工标签分布（{(detail.value.records ?? []).length}次闭环 × 多位验收人独立标注）
              </div>
              <div class="hazard-root-cause-distribution-list">
                {(detail.value.rootCauseDistributions ?? []).map(renderDistribution)}
                {(detail.value.rootCauseDistributions ?? []).length === 0 ? <span class="hazard-muted">暂无根因分布</span> : null}
              </div>
            </div>
          </Card>
          {renderAiAnalysisReport()}
          <Card title="安全总监裁定" class="hazard-root-cause-card hazard-root-cause-director-decision">
            {isDecided.value ? (
              <div class="hazard-root-cause-decision-meta">
                <span>已裁定</span>
                <strong>确认根因后不可修改</strong>
                <em>裁定人：{detail.value.decisionUserName || detail.value.decisionUserId || "-"}</em>
                <em>裁定时间：{formatDate(detail.value.decisionTime)}</em>
              </div>
            ) : null}
            <div class="hazard-root-cause-decision-form">
              <Form labelCol={{ span: 2 }} wrapperCol={{ span: 22 }}>
                <FormItem label="最终根因标签" required>
                  <div class="hazard-root-cause-decision-root">
                    <Select
                      v-model:value={decisionForm.finalRootCauseCode}
                      options={rootCauseTagOptions}
                      disabled={isDecided.value}
                      placeholder="请选择最终根因标签"
                    />
                    {aiSuggestedRootCause.value ? <span>AI建议：{aiSuggestedRootCause.value}</span> : null}
                  </div>
                </FormItem>
                <FormItem label="裁定说明">
                  <Textarea
                    rows={3}
                    maxlength={1000}
                    disabled={isDecided.value}
                    placeholder="请输入裁定说明"
                    v-model:value={decisionForm.decisionRemark}
                  />
                </FormItem>
              </Form>
            </div>
            <Space class="hazard-root-cause-decision-actions">
              <Button type="primary" loading={submitting.value} disabled={isDecided.value} onClick={submitDecision}>
                确认根因
              </Button>
              <span>确认后不可修改</span>
            </Space>
          </Card>
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => goBack(router, { name: "root-cause-list" })}>返回</Button>
        </Space>
      ),
    };

    return () => <PcLayout title={useLayoutTitle("根因详情")} v-slots={slots} />;
  },
});
