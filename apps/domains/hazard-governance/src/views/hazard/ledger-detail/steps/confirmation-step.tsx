import type { HazardDetailBasicInfoVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { formatRectificationDeadlineHours } from "../../shared/data";
import { type DetailRecord, readText, renderLevelTag } from "../detail-utils";
import { DetailField, DetailGrid, LedgerStepCard } from "./step-shared";
import { formatTime } from "@/utils/format-time";

const formatDeadline = (basicInfo: HazardDetailBasicInfoVO): string => {
  if (basicInfo.deadline) {
    return formatTime(basicInfo.deadline);
  }
  if (basicInfo.rectificationDeadlineHours) {
    return formatRectificationDeadlineHours(basicInfo.rectificationDeadlineHours);
  }
  return "-";
};

export const ConfirmationStep = (props: { basicInfo: HazardDetailBasicInfoVO }): VNodeChild => {
  const record = props.basicInfo as DetailRecord;
  const confirmUserName = readText(record, ["confirmUserName", "confirmUserId"]);
  const overdueText = props.basicInfo.overdue ? `已超${Math.max(1, Math.ceil((props.basicInfo.overdueHours ?? 0) / 24))}天` : "";

  return LedgerStepCard({
    index: 2,
    title: "确认与分级",
    meta: formatTime(props.basicInfo.confirmedTime),
    children: DetailGrid({
      children: (
        <>
          {DetailField({ label: "确认人", value: confirmUserName })}
          {DetailField({ label: "确认时间", value: formatTime(props.basicInfo.confirmedTime) })}
          {DetailField({
            label: "隐患等级",
            value: <span class="hazard-ledger-level-inline">{renderLevelTag(props.basicInfo.level)}</span>,
          })}
          {DetailField({
            label: "整改截止日",
            value: (
              <span class="hazard-ledger-deadline-inline">
                {formatDeadline(props.basicInfo)}
                {overdueText ? <em>{overdueText}</em> : null}
              </span>
            ),
          })}
          {DetailField({ label: "风险单元", value: props.basicInfo.riskUnitName || props.basicInfo.riskUnitId })}
          {DetailField({ label: "风险对象", value: props.basicInfo.riskObjectName || props.basicInfo.riskObjectId })}
          {DetailField({ label: "整改责任人", value: props.basicInfo.responsibleUserName || props.basicInfo.responsibleUserId })}
          {DetailField({ label: "验收人", value: props.basicInfo.acceptanceUserName || props.basicInfo.acceptanceUserId })}
        </>
      ),
    }),
  });
};
