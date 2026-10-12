import type { HazardDetailBasicInfoVO, HazardRectificationPlanVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { readRecordText } from "../detail-utils";
import { FileBlock, InlineAiPanel, LedgerStepCard, TextBlock } from "./step-shared";
import { formatTime } from "@/utils/format-time";

const diffDays = (start?: string, end?: string): number | undefined => {
  if (!start || !end) {
    return undefined;
  }
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return undefined;
  }
  return Math.max(1, Math.ceil((endTime - startTime) / 86400000));
};

export const RectificationPlanStep = (props: {
  basicInfo: HazardDetailBasicInfoVO;
  plan?: HazardRectificationPlanVO | undefined;
  activeStep: number;
}): VNodeChild => {
  const planRecord = props.plan as (HazardRectificationPlanVO & Record<string, unknown>) | undefined;
  const approvedDays = diffDays(props.plan?.submittedTime, props.plan?.approvedTime);
  const meta = props.plan?.submittedTime
    ? `方案提交 ${formatTime(props.plan.submittedTime)}${props.plan.approvedTime ? ` · 审批通过 ${formatTime(props.plan.approvedTime)}` : ""}${
        approvedDays ? ` · 耗时 ${approvedDays} 天` : ""
      }`
    : "";
  const aiSuggestion =
    props.plan?.aiDisposalSuggestion || props.basicInfo.aiDisposalSuggestion || readRecordText(planRecord, ["aiSuggestion"]);
  const sceneImages = props.plan?.sceneImages?.length ? props.plan.sceneImages : props.basicInfo.sceneImages;

  return LedgerStepCard({
    index: 3,
    title: "整改方案",
    meta,
    locked: props.activeStep < 3,
    children: (
      <>
        {TextBlock({ label: "整改内容", value: props.plan?.rectificationContent })}
        {TextBlock({ label: "整改措施", value: props.plan?.rectificationMeasures, ordered: true })}
        {TextBlock({ label: "临时管控措施", value: props.plan?.temporaryControlMeasures })}
        {FileBlock({ label: "整改前照片", files: sceneImages })}
        {InlineAiPanel({ title: "AI 处置建议", meta: "AI生成 · 仅供参考", content: aiSuggestion })}
      </>
    ),
  });
};
