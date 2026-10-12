import type { HazardAcceptanceInfoVO, HazardDetailBasicInfoVO, HazardProcessLogVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { readRecordText, renderStatusTag, renderValue } from "../detail-utils";
import { InlineAiPanel, LedgerStepCard } from "./step-shared";
import { formatTime } from "@/utils/format-time";

const rootCauseText: Record<string, string> = {
  MANAGEMENT_DEFECT: "管理缺陷",
  SYSTEM_DEFICIENCY: "制度缺失",
  EQUIPMENT_AGING: "设备老化",
  TRAINING_INSUFFICIENT: "培训不足",
  DESIGN_DEFECT: "设计缺陷",
  FORCE_MAJEURE: "不可抗力",
  HUMAN_VIOLATION: "人为违规",
};

const findAcceptanceLog = (logs?: HazardProcessLogVO[]): HazardProcessLogVO | undefined =>
  (logs ?? []).find((log) => {
    const record = log as HazardProcessLogVO & Record<string, unknown>;
    const actionText = readRecordText(record, ["action", "actionName", "title", "nodeName"]).toUpperCase();
    return actionText.includes("ACCEPT") || actionText.includes("验收");
  });

export const AcceptanceResultStep = (props: {
  basicInfo: HazardDetailBasicInfoVO;
  acceptanceInfo?: HazardAcceptanceInfoVO | undefined;
  logs?: HazardProcessLogVO[] | undefined;
  activeStep: number;
}): VNodeChild => {
  const acceptanceLog = findAcceptanceLog(props.logs);
  const locked = props.activeStep < 6;
  const acceptanceTime = props.acceptanceInfo?.closedTime || acceptanceLog?.operatedTime || acceptanceLog?.operationTime;
  const submittedTime = props.acceptanceInfo?.submittedTime || props.basicInfo.rectificationSubmittedTime;
  const acceptanceUserName =
    props.acceptanceInfo?.acceptanceUserName ||
    props.acceptanceInfo?.acceptanceUserId ||
    props.basicInfo.acceptanceUserName ||
    props.basicInfo.acceptanceUserId ||
    acceptanceLog?.operatorName;
  const rootCauseCode = props.acceptanceInfo?.rootCauseCode || props.basicInfo.rootCauseCode;
  const aiAcceptanceSuggestion = props.acceptanceInfo?.aiAcceptanceSuggestion || props.basicInfo.aiAcceptanceSuggestion;

  return LedgerStepCard({
    index: 6,
    title: "验收结果",
    meta: locked ? "等待整改完成并提交验收" : formatTime(acceptanceTime),
    locked,
    children: locked ? null : (
      <>
        <div class="hazard-ledger-acceptance-result">
          <span>治理状态</span>
          <strong>{renderStatusTag(props.basicInfo.governanceStatus)}</strong>
          <span>验收人</span>
          <strong>{renderValue(acceptanceUserName)}</strong>
          <span>提交验收时间</span>
          <strong>{formatTime(submittedTime)}</strong>
          <span>验收时间</span>
          <strong>{formatTime(acceptanceTime)}</strong>
          <span>最终根因</span>
          <strong>{renderValue(rootCauseCode ? rootCauseText[String(rootCauseCode)] || String(rootCauseCode) : "")}</strong>
          <span>退回次数</span>
          <strong>{renderValue(props.acceptanceInfo?.rejectCount ?? props.basicInfo.acceptanceRejectCount)}</strong>
          <span>验收意见</span>
          <strong>
            {renderValue(acceptanceLog?.opinion || acceptanceLog?.content || acceptanceLog?.description || acceptanceLog?.remark)}
          </strong>
        </div>
        {InlineAiPanel({ title: "AI 验收建议", meta: "AI生成 · 仅供参考", content: aiAcceptanceSuggestion })}
      </>
    ),
  });
};
