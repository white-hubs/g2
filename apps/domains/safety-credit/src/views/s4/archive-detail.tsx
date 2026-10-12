import type {
  CreditStatus,
  SafetyCreditArchiveDetailVO,
  SafetyCreditBehaviorVO,
  SafetyCreditBenefitRecordVO,
  SafetyCreditCheckQualityVO,
  SafetyCreditMerchantScoreSummaryVO,
  SafetyCreditScoreTrendPointVO,
} from "@g2-contract/safety-credit";
import { Button, Modal, PageLayout, Tag, Textarea, message } from "@g2-platform/pc-ui";
import { computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  behaviorTypeLabel,
  benefitRecordStatusColor,
  benefitRecordStatusLabel,
  checkExecutionStatusColor,
  checkExecutionStatusLabel,
  cleanText,
  creditGradeColor,
  creditGradeLabel,
  displayText,
  formatDateTime,
  industryTypeLabel,
  inputTypeLabel,
  qualityStatusColor,
  qualityStatusLabel,
} from "../s2/shared";
import { getSafetyCreditClient } from "@/domain-context";

import "../s2/s2.less";
import "./s4.less";

type BehaviorTab = "all" | "penalty" | "bonus";

function scoreClass(value?: number): string {
  if ((value ?? 0) > 0) {
    return "s2-score-positive";
  }
  if ((value ?? 0) < 0) {
    return "s2-score-negative";
  }
  return "";
}

function signedScore(value?: number): string {
  if (value === undefined || value === null) {
    return "--";
  }
  return value > 0 ? `+${value}` : String(value);
}

function isPenaltyBehavior(record: SafetyCreditBehaviorVO): boolean {
  return (
    (record.scoreChange ?? 0) < 0 ||
    record.behaviorType === "PENALTY" ||
    record.behaviorType === "CHECK_OVERDUE" ||
    record.behaviorType === "CHECK_FAKE"
  );
}

function isBonusBehavior(record: SafetyCreditBehaviorVO): boolean {
  return (record.scoreChange ?? 0) > 0 || record.behaviorType === "BONUS" || record.behaviorType === "CHECK_MONTHLY_QUALIFIED";
}

function behaviorKind(record: SafetyCreditBehaviorVO): string {
  if (isPenaltyBehavior(record)) {
    return "违规扣分";
  }
  if (isBonusBehavior(record)) {
    return "主动加分";
  }
  return behaviorTypeLabel(record.behaviorType);
}

function behaviorTagColor(record: SafetyCreditBehaviorVO): string {
  if (isPenaltyBehavior(record)) {
    return "red";
  }
  if (isBonusBehavior(record)) {
    return "green";
  }
  return "blue";
}

function behaviorSubtype(record: SafetyCreditBehaviorVO): string {
  return displayText(record.eventName ?? record.eventId ?? record.businessType);
}

function behaviorSource(record: SafetyCreditBehaviorVO): string {
  return displayText(record.applicationName ?? inputTypeLabel(record.inputType));
}

function trendChange(points?: SafetyCreditScoreTrendPointVO[]): number | undefined {
  if (points === undefined || points.length < 2) {
    return undefined;
  }
  const latest = points.at(-1)?.score;
  const previous = points.at(-2)?.score;
  if (latest === undefined || previous === undefined) {
    return undefined;
  }
  return latest - previous;
}

function statusOperation(status?: CreditStatus): "suspend" | "recover" {
  return status === "SUSPENDED" ? "recover" : "suspend";
}

export const ArchiveDetail = defineComponent({
  name: "ArchiveDetail",
  setup: () => {
    const route = useRoute();
    const router = useRouter();
    const loading = ref(false);
    const operating = ref(false);
    const operationVisible = ref(false);
    const operationReason = ref("");
    const detail = ref<SafetyCreditArchiveDetailVO | null>(null);
    const scoreSummary = ref<SafetyCreditMerchantScoreSummaryVO>({});
    const behaviors = ref<SafetyCreditBehaviorVO[]>([]);
    const checkRecords = ref<SafetyCreditCheckQualityVO[]>([]);
    const benefitRecords = ref<SafetyCreditBenefitRecordVO[]>([]);
    const activeBehaviorTab = ref<BehaviorTab>("all");

    const filteredBehaviors = computed(() => {
      if (activeBehaviorTab.value === "penalty") {
        return behaviors.value.filter(isPenaltyBehavior);
      }
      if (activeBehaviorTab.value === "bonus") {
        return behaviors.value.filter(isBonusBehavior);
      }
      return behaviors.value;
    });

    function merchantId(): string | undefined {
      const value = route.params.merchantId;
      if (Array.isArray(value)) {
        return value[0];
      }
      return value;
    }

    async function load(): Promise<void> {
      const id = merchantId();
      if (id === undefined) {
        message.warning("商户ID不能为空");
        void router.push("/d/safety-credit/archives");
        return;
      }
      loading.value = true;
      const [archiveResult, scoreResult, behaviorResult, checkResult, benefitResult] = await Promise.allSettled([
        getSafetyCreditClient().getArchive(id),
        getSafetyCreditClient().getMerchantScoreSummary(id),
        getSafetyCreditClient().pageBehaviors({ merchantId: id, pageNumber: 1, pageSize: 20 }),
        getSafetyCreditClient().pageCheckQuality({ merchantId: id, pageNumber: 1, pageSize: 3 }),
        getSafetyCreditClient().pageBenefitRecords({ merchantId: id, pageNumber: 1, pageSize: 5 }),
      ] as const);
      if (archiveResult.status === "fulfilled") {
        detail.value = archiveResult.value;
      } else {
        message.error("信用档案加载失败");
      }
      scoreSummary.value = scoreResult.status === "fulfilled" ? scoreResult.value : {};
      behaviors.value = behaviorResult.status === "fulfilled" ? (behaviorResult.value.records ?? []) : [];
      checkRecords.value = checkResult.status === "fulfilled" ? (checkResult.value.records ?? []) : [];
      benefitRecords.value = benefitResult.status === "fulfilled" ? (benefitResult.value.records ?? []) : [];
      loading.value = false;
    }

    function backToList(): void {
      void router.push("/d/safety-credit/archives");
    }

    function openOperation(): void {
      operationReason.value = "";
      operationVisible.value = true;
    }

    async function submitOperation(): Promise<void> {
      const reason = cleanText(operationReason.value);
      if (reason === undefined) {
        message.warning(statusOperation(detail.value?.creditStatus) === "suspend" ? "请输入停用原因" : "请输入恢复原因");
        return;
      }
      const id = detail.value?.merchantId;
      if (id === undefined) {
        return;
      }
      operating.value = true;
      try {
        if (statusOperation(detail.value?.creditStatus) === "suspend") {
          await getSafetyCreditClient().suspendArchive(id, { reason });
          message.success("商户信用已停用");
        } else {
          await getSafetyCreditClient().recoverArchive(id, { reason });
          message.success("商户信用已恢复");
        }
        operationVisible.value = false;
        await load();
      } finally {
        operating.value = false;
      }
    }

    function renderTrendChart(): JSX.Element {
      const points = scoreSummary.value.scoreTrend ?? [];
      if (points.length === 0) {
        return <div class="s4-empty-block">暂无趋势数据</div>;
      }
      const width = 430;
      const height = 130;
      const paddingX = 28;
      const paddingTop = 16;
      const paddingBottom = 28;
      const scores = points.map((item) => item.score ?? 0);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const range = maxScore === minScore ? 10 : maxScore - minScore;
      const plotPoints = points
        .map((item, index) => {
          const x = paddingX + (points.length === 1 ? 0 : (index * (width - paddingX * 2)) / (points.length - 1));
          const score = item.score ?? minScore;
          const y = paddingTop + ((maxScore - score) * (height - paddingTop - paddingBottom)) / range;
          return `${x},${y}`;
        })
        .join(" ");
      return (
        <svg class="s4-trend-svg" viewBox={`0 0 ${width} ${height}`} role="img">
          <line x1={paddingX} y1={height - paddingBottom} x2={width - paddingX} y2={height - paddingBottom} class="axis" />
          <polyline points={plotPoints} class="line" />
          {points.map((item, index) => {
            const x = paddingX + (points.length === 1 ? 0 : (index * (width - paddingX * 2)) / (points.length - 1));
            return (
              <text x={x} y={height - 4} text-anchor="middle" class="label">
                {displayText(item.month)}
              </text>
            );
          })}
        </svg>
      );
    }

    function renderBehaviorRows(): JSX.Element[] | JSX.Element {
      if (filteredBehaviors.value.length === 0) {
        return (
          <tr>
            <td colspan={5}>暂无行为记录</td>
          </tr>
        );
      }
      return filteredBehaviors.value.map((record) => (
        <tr key={String(record.id)}>
          <td>
            <Tag color={behaviorTagColor(record)}>{behaviorKind(record)}</Tag>
          </td>
          <td>{behaviorSubtype(record)}</td>
          <td class={scoreClass(record.scoreChange)}>{signedScore(record.scoreChange)}</td>
          <td>{behaviorSource(record)}</td>
          <td>{formatDateTime(record.occurredTime)}</td>
        </tr>
      ));
    }

    function renderCheckRows(): JSX.Element[] | JSX.Element {
      if (checkRecords.value.length === 0) {
        return (
          <tr>
            <td colspan={4}>暂无自查记录</td>
          </tr>
        );
      }
      return checkRecords.value.map((record) => (
        <tr key={String(record.executionId)}>
          <td>{displayText(record.checkName)}</td>
          <td>{formatDateTime(record.submitTime)}</td>
          <td>
            <Tag color={checkExecutionStatusColor(record.executionStatus)}>{checkExecutionStatusLabel(record.executionStatus)}</Tag>
          </td>
          <td>
            <Tag color={qualityStatusColor(record.qualityStatus)}>{qualityStatusLabel(record.qualityStatus)}</Tag>
          </td>
        </tr>
      ));
    }

    function renderBenefitRows(): JSX.Element[] | JSX.Element {
      if (benefitRecords.value.length === 0) {
        return (
          <tr>
            <td colspan={4}>暂无权益历史</td>
          </tr>
        );
      }
      return benefitRecords.value.map((record) => (
        <tr key={String(record.id)}>
          <td>{displayText(record.ruleName)}</td>
          <td>{formatDateTime(record.effectiveTime)}</td>
          <td>{formatDateTime(record.expireTime)}</td>
          <td>
            <Tag color={benefitRecordStatusColor(record.status)}>{benefitRecordStatusLabel(record.status)}</Tag>
          </td>
        </tr>
      ));
    }

    onMounted(() => {
      void load();
    });

    const layoutSlots = {
      "layout-header": (): JSX.Element => (
        <Button
          danger={statusOperation(detail.value?.creditStatus) === "suspend"}
          onClick={openOperation}
          disabled={detail.value === null || loading.value}
        >
          {statusOperation(detail.value?.creditStatus) === "suspend" ? "信用停用" : "恢复信用"}
        </Button>
      ),
      "layout-content": (): JSX.Element => {
        const change = trendChange(scoreSummary.value.scoreTrend);
        return (
          <div class="safety-credit-s2 s4-archive-detail">
            <section class="s4-detail-top-grid">
              <div class="s4-detail-card s4-profile-card">
                <div class="score-ring">
                  <strong>{displayText(detail.value?.currentScore)}</strong>
                  <span>/100</span>
                </div>
                <div class="profile-info">
                  <h3>{displayText(detail.value?.merchantName)}</h3>
                  <div class="profile-tags">
                    <Tag color={creditGradeColor(detail.value?.creditGrade)}>{creditGradeLabel(detail.value?.creditGrade)}</Tag>
                    <Tag color="blue">{industryTypeLabel(detail.value?.industryType)}</Tag>
                  </div>
                  <p>
                    较上月 <strong class={scoreClass(change)}>{signedScore(change)}</strong> · 加入时间：
                    {formatDateTime(detail.value?.joinTime)}
                  </p>
                </div>
              </div>

              <div class="s4-detail-card">
                <h3>信用分变化趋势（近6个月）</h3>
                {renderTrendChart()}
              </div>

              <div class="s4-detail-card s4-score-summary-card">
                <h3>奖惩汇总</h3>
                <div class="score-summary-row">
                  <span>总扣分</span>
                  <strong class="s2-score-negative">{signedScore(scoreSummary.value.deductScore)}</strong>
                </div>
                <div class="score-summary-row">
                  <span>总加分</span>
                  <strong class="s2-score-positive">{signedScore(scoreSummary.value.bonusScore)}</strong>
                </div>
                <div class="score-summary-row">
                  <span>净变动</span>
                  <strong class={scoreClass(scoreSummary.value.netChange)}>{signedScore(scoreSummary.value.netChange)}</strong>
                </div>
                <p>
                  扣分Top3：
                  {(scoreSummary.value.deductTop3 ?? []).length === 0
                    ? "--"
                    : (scoreSummary.value.deductTop3 ?? [])
                        .map((item) => `${displayText(item.name)}(${displayText(item.score)})`)
                        .join(" · ")}
                </p>
              </div>
            </section>

            <section class="s4-detail-card s4-behavior-panel">
              <div class="s4-detail-tabs">
                {[
                  { label: "全部记录", value: "all" },
                  { label: "违规扣分", value: "penalty" },
                  { label: "加分记录", value: "bonus" },
                ].map((tab) => (
                  <button
                    type="button"
                    class={["s4-detail-tab", activeBehaviorTab.value === tab.value ? "active" : ""]}
                    onClick={() => (activeBehaviorTab.value = tab.value as BehaviorTab)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <table class="s4-detail-table">
                <thead>
                  <tr>
                    <th>行为类型</th>
                    <th>子类型</th>
                    <th>分值</th>
                    <th>来源</th>
                    <th>发生时间</th>
                  </tr>
                </thead>
                <tbody>{renderBehaviorRows()}</tbody>
              </table>
            </section>

            <section class="s4-detail-bottom-grid">
              <div class="s4-detail-card">
                <h3>自查记录</h3>
                <table class="s4-detail-table">
                  <thead>
                    <tr>
                      <th>清单类型</th>
                      <th>提交时间</th>
                      <th>完成状态</th>
                      <th>AI质检</th>
                    </tr>
                  </thead>
                  <tbody>{renderCheckRows()}</tbody>
                </table>
              </div>
              <div class="s4-detail-card">
                <h3>权益历史</h3>
                <table class="s4-detail-table">
                  <thead>
                    <tr>
                      <th>规则名称</th>
                      <th>生效时间</th>
                      <th>失效时间</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>{renderBenefitRows()}</tbody>
                </table>
              </div>
            </section>

            <Modal
              okText="确定"
              cancelText="取消"
              v-model:open={operationVisible.value}
              title={statusOperation(detail.value?.creditStatus) === "suspend" ? "停用信用" : "恢复信用"}
              width={560}
              confirmLoading={operating.value}
              onOk={() => void submitOperation()}
              onCancel={() => {
                operationVisible.value = false;
              }}
            >
              <div class="s4-operation-body">
                <span>商户</span>
                <strong>{displayText(detail.value?.merchantName)}</strong>
                <label>{statusOperation(detail.value?.creditStatus) === "suspend" ? "停用原因" : "恢复原因"}</label>
                <Textarea
                  value={operationReason.value}
                  placeholder={statusOperation(detail.value?.creditStatus) === "suspend" ? "请输入停用原因" : "请输入恢复原因"}
                  maxlength={500}
                  onUpdate:value={(inputValue) => {
                    const value = inputValue as string;
                    return (operationReason.value = value);
                  }}
                />
              </div>
            </Modal>
          </div>
        );
      },
      "footer-btn": (): JSX.Element => <Button onClick={backToList}>返回</Button>,
    };

    return (): JSX.Element => (
      <PageLayout
        title={detail.value === null ? "商户信用档案" : `${displayText(detail.value.merchantName)} - 信用档案`}
        v-slots={layoutSlots}
      />
    );
  },
});
