import type { HazardAcceptanceCommand, HazardAcceptanceDetailVO, HazardRectificationProgressVO } from "@g2-contract/hazard-governance";
import { HazardAcceptanceRootCauseCode, HazardActionCode } from "@g2-contract/hazard-governance";
import { computed, defineComponent, onMounted, reactive, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { hasAiRichTextContent, sanitizeAiRichText } from "../shared/ai-rich-text-panel";
import type { HazardLevel } from "../shared/data";
import { levelColor, levelText, rootCauseTagOptions } from "../shared/data";
import { goBack, useLayoutTitle } from "../shared/page";
import { ReadonlyFileUpload } from "../shared/readonly-file-upload";
import { useAuthRequest } from "@/api/request";
import { acceptHazardAcceptance, getHazardAcceptanceDetail } from "@/api/server";
import { PageLayout as PcLayout } from "@/pc-ui-runtime";
import { Button, Card, Form, FormItem, RadioGroup, Select, Space, Spin, Tag, Textarea, message } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

import "./index.less";

const renderValue = (value?: string | number | boolean | null): string => {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
};

const renderLevel = (level?: string): JSX.Element => {
  const normalizedLevel = level as HazardLevel | undefined;
  return (
    <Tag color={normalizedLevel ? levelColor[normalizedLevel] : undefined}>
      {normalizedLevel ? (levelText[normalizedLevel] ?? level) : "-"}
    </Tag>
  );
};

const splitLines = (value?: string): string[] =>
  value
    ? value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const formatHistoryDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatTime(value, "-");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
};

const normalizeRootCauseCode = (value?: string): HazardAcceptanceRootCauseCode | undefined =>
  rootCauseTagOptions.find((item) => item.value === value)?.value;

const unwrapAcceptanceDetail = (response: unknown): HazardAcceptanceDetailVO | undefined => {
  if (response && typeof response === "object") {
    const record = response as Record<string, unknown>;
    const candidate = record.data ?? record.result ?? record.details ?? response;
    return candidate && typeof candidate === "object" ? (candidate as HazardAcceptanceDetailVO) : undefined;
  }
  return undefined;
};

export const AcceptanceDetail = defineComponent({
  name: "AcceptanceDetail",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const detail = shallowRef<HazardAcceptanceDetailVO>();
    const loading = shallowRef(false);
    const submitting = shallowRef(false);
    const form = reactive<HazardAcceptanceCommand>({ accepted: true, rootCauseCode: undefined, opinion: "" });
    const hazardId = computed(() => String(route.query.id ?? ""));
    const basicInfo = computed(() => detail.value?.basicInfo);
    const progressRecords = computed(() =>
      (detail.value?.progressRecords ?? []).toSorted((a, b) => String(b.recordTime ?? "").localeCompare(String(a.recordTime ?? ""))),
    );
    const latestProgress = computed(() => progressRecords.value[0]);
    const aiAcceptanceSuggestion = computed(() => {
      return detail.value?.basicInfo?.aiAcceptanceSuggestion ?? "";
    });
    const sanitizedAiAcceptanceSuggestion = computed(() => sanitizeAiRichText(aiAcceptanceSuggestion.value));
    const showAiAcceptanceSuggestion = computed(() => hasAiRichTextContent(sanitizedAiAcceptanceSuggestion.value));
    const rootCauseOptions = computed(() => {
      const rootCauseCode = basicInfo.value?.rootCauseCode ?? detail.value?.rootCauseCode;
      return rootCauseCode && !rootCauseTagOptions.some((item) => item.value === rootCauseCode)
        ? [{ label: rootCauseCode, value: rootCauseCode as HazardAcceptanceRootCauseCode }, ...rootCauseTagOptions]
        : rootCauseTagOptions;
    });
    const canAccept = computed(() => {
      if (!detail.value) return false;
      const actions = detail.value.actions?.length ? detail.value.actions : basicInfo.value?.actions;
      return detail.value.canAccept !== false && (actions?.length ? actions.includes(HazardActionCode.ACCEPTANCE) : true);
    });

    const loadDetail = async (): Promise<void> => {
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      loading.value = true;
      try {
        const response = await useAuthRequest(() => getHazardAcceptanceDetail(hazardId.value));
        const currentDetail = unwrapAcceptanceDetail(response);
        detail.value = currentDetail;
        form.rootCauseCode = normalizeRootCauseCode(currentDetail?.basicInfo?.rootCauseCode ?? currentDetail?.rootCauseCode);
      } finally {
        loading.value = false;
      }
    };

    const submitAcceptance = async (): Promise<void> => {
      if (!hazardId.value) {
        message.warning("缺少隐患ID");
        return;
      }
      if (!form.rootCauseCode) {
        message.warning("请选择根因标签");
        return;
      }
      submitting.value = true;
      try {
        await useAuthRequest(() => acceptHazardAcceptance(hazardId.value, { ...form }));
        message.success(form.accepted ? "验收已通过" : "验收已退回");
        form.opinion = "";
        window.history.back();
      } finally {
        submitting.value = false;
      }
    };

    onMounted(loadDetail);

    const renderInfoItem = (label: string, value: string | JSX.Element): JSX.Element => (
      <div class="acceptance-info-item" key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    );

    const renderMeasure = (currentDetail: HazardAcceptanceDetailVO): JSX.Element => {
      const plan = currentDetail.currentPlan;
      const measures = splitLines(plan?.rectificationMeasures);
      return (
        <Card title="整改措施" class="acceptance-card">
          <div class="acceptance-plan">
            {measures.length ? (
              <ol>
                {measures.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ) : (
              <p>{renderValue(plan?.rectificationMeasures)}</p>
            )}
            <div class="acceptance-measure-meta">
              <span>完成进度：{renderValue(latestProgress.value?.progressPercent)}%</span>
              <span>
                整改人：
                {renderValue(
                  latestProgress.value?.recordUserName ??
                    latestProgress.value?.recordUserId ??
                    basicInfo.value?.responsibleUserName ??
                    basicInfo.value?.responsibleUserId ??
                    plan?.submittedByName ??
                    plan?.submittedName ??
                    plan?.submittedBy,
                )}
              </span>
              <span>验收人：{renderValue(basicInfo.value?.acceptanceUserName ?? basicInfo.value?.acceptanceUserId)}</span>
            </div>
          </div>
        </Card>
      );
    };

    const renderProgress = (record: HazardRectificationProgressVO): JSX.Element => (
      <div class="acceptance-progress-item" key={String(record.id)}>
        <div class="acceptance-progress-head">
          <strong>
            {formatHistoryDate(record.recordTime)} · {renderValue(record.recordUserName ?? record.recordUserId)}
          </strong>
          <Tag color={record.progressPercent === 100 ? "green" : "blue"}>进度 {renderValue(record.progressPercent)}%</Tag>
        </div>
        <p>{renderValue(record.progressContent)}</p>
        {record.afterImages?.length ? <ReadonlyFileUpload files={record.afterImages} emptyText="暂无照片" /> : null}
      </div>
    );

    const renderAiReview = (): JSX.Element | null =>
      showAiAcceptanceSuggestion.value ? (
        <Card title="AI验收建议" class="acceptance-card acceptance-ai-review-card">
          <div class="acceptance-ai-review-body" innerHTML={sanitizedAiAcceptanceSuggestion.value} />
          <div class="acceptance-ai-review-hint">AI初验结果仅供参考，验收结论由验收人独立做出</div>
        </Card>
      ) : null;

    const renderContent = (currentDetail: HazardAcceptanceDetailVO): JSX.Element => (
      <div class="acceptance-detail-page">
        <section class="acceptance-detail-main">
          <Card title="隐患信息" class="acceptance-card">
            <div class="acceptance-info-grid">
              {renderInfoItem("隐患编号", renderValue(basicInfo.value?.code ?? currentDetail.id))}
              {renderInfoItem("等级", renderLevel(basicInfo.value?.level))}
              {renderInfoItem("发现时间", formatTime(currentDetail.rectificationSubmittedTime))}
              {renderInfoItem("位置", renderValue(basicInfo.value?.locationName))}
              {renderInfoItem("整改责任人", renderValue(basicInfo.value?.responsibleUserName ?? basicInfo.value?.responsibleUserId))}
              {renderInfoItem("验收人", renderValue(basicInfo.value?.acceptanceUserName ?? basicInfo.value?.acceptanceUserId))}
              {renderInfoItem("确认人", "-")}
            </div>
            <div class="acceptance-desc">{renderValue(basicInfo.value?.description)}</div>
          </Card>

          {renderMeasure(currentDetail)}

          <Card title={`汇报记录（倒序，共${progressRecords.value.length}条）`} class="acceptance-card">
            <div class="acceptance-progress-list">
              {progressRecords.value.length ? (
                progressRecords.value.map(renderProgress)
              ) : (
                <div class="acceptance-empty">暂无整改进度记录</div>
              )}
            </div>
          </Card>

          {renderAiReview()}
        </section>

        <section class="acceptance-detail-side">
          <Card title="验收判定" class="acceptance-card">
            <Form layout="vertical" model={form}>
              <FormItem label="判定结果" required>
                <RadioGroup
                  disabled={!canAccept.value || submitting.value}
                  options={[
                    { label: "验收通过", value: true },
                    { label: "验收不通过", value: false },
                  ]}
                  v-model:value={form.accepted}
                />
              </FormItem>
              <FormItem label="根因标签" required>
                <Select
                  disabled={!canAccept.value || submitting.value}
                  options={rootCauseOptions.value}
                  allowClear
                  placeholder="请选择根因类型"
                  v-model:value={form.rootCauseCode}
                />
              </FormItem>
              <FormItem label="验收说明">
                <Textarea
                  disabled={!canAccept.value || submitting.value}
                  rows={5}
                  maxlength={500}
                  placeholder={canAccept.value ? "请输入现场核验情况" : "当前任务不可验收"}
                  v-model:value={form.opinion}
                />
              </FormItem>
            </Form>
            <div class="acceptance-action-buttons">
              <Button
                class="acceptance-submit-button"
                type="primary"
                loading={submitting.value}
                disabled={!canAccept.value}
                onClick={() => submitAcceptance()}
              >
                提交
              </Button>
            </div>
            <div class="acceptance-check-line">
              校验通过：验收人({renderValue(basicInfo.value?.acceptanceUserName ?? basicInfo.value?.acceptanceUserId)}) ≠ 整改人(
              {renderValue(basicInfo.value?.responsibleUserName ?? basicInfo.value?.responsibleUserId)})
            </div>
          </Card>

          <Card title="验收规则" class="acceptance-card">
            <div class="acceptance-rule-list">
              <div>
                <span class="acceptance-rule-pass">✔</span>通过 → 闭环归档 + 标注根因标签
              </div>
              <div>
                <span class="acceptance-rule-reject">✖</span>不通过 → 退回整改人重新整改
              </div>
              <div>
                <span class="acceptance-rule-warn">⚠</span>退回≥3次 → 自动升级告警
              </div>
              <div>
                <span class="acceptance-rule-lock">▣</span>验收人≠整改人（系统强制校验）
              </div>
            </div>
          </Card>
        </section>
      </div>
    );

    const slots = {
      "layout-content": () => (
        <div class="viewport">
          <Spin class="acceptance-detail-spin" spinning={loading.value}>
            {detail.value ? renderContent(detail.value) : <div class="acceptance-empty acceptance-detail-empty">暂无验收详情</div>}
          </Spin>
        </div>
      ),
      "footer-page": () => (
        <Space>
          <Button onClick={() => goBack(router, { name: "acceptance-list" })}>返回</Button>
        </Space>
      ),
    };

    return () => <PcLayout title={useLayoutTitle("验收详情")} v-slots={slots} />;
  },
});
