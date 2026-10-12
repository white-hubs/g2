import { APPROVAL_NODE_META, formatDateTimeValue, parseDateTimeValue, type FumigationWork } from "./state";

export interface ApprovalTimelineItem {
  key: string;
  time: string;
  actor: string;
  actionLabel: string;
  description: string;
  color: string;
}

const getTimelineTime = (item: ApprovalTimelineItem): number => parseDateTimeValue(item.time)?.valueOf() ?? 0;

export const normalizePersonName = (name: string | undefined, fallback: string): string => {
  const value = name?.trim() ?? "";
  return value === "" ? fallback : value;
};

export const buildApprovalTimeline = (work: FumigationWork): ApprovalTimelineItem[] => {
  const items: ApprovalTimelineItem[] = [];
  const submitTime = formatDateTimeValue(work.createdAt, "");
  if (submitTime !== "") {
    const applicant = normalizePersonName(work.applicantName, "申请人");
    items.push({
      key: `${work.id}-submit`,
      time: submitTime,
      actor: applicant,
      actionLabel: "提交审批",
      description: `${applicant}提交熏蒸方案`,
      color: "blue",
    });
  }
  const sortedRecords = work.approvalRecords.toSorted((left, right) => {
    const leftTime = parseDateTimeValue(left.at)?.valueOf() ?? 0;
    const rightTime = parseDateTimeValue(right.at)?.valueOf() ?? 0;
    return rightTime - leftTime;
  });
  for (const record of sortedRecords) {
    const actionLabel = record.action === "approved" ? "审批通过" : "审批驳回";
    items.push({
      key: record.id || `${record.node}-${record.at}`,
      time: formatDateTimeValue(record.at),
      actor: record.operatorName || "审批人",
      actionLabel: `${record.nodeName || APPROVAL_NODE_META[record.node].label}${actionLabel}`,
      description: record.opinion?.trim() || "无审批意见",
      color: record.action === "approved" ? "green" : "red",
    });
  }
  return items.toSorted((left, right) => getTimelineTime(right) - getTimelineTime(left));
};
