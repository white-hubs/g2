import type { HazardApprovalTaskStatus, HazardApprovalTaskSummaryVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import { readRecordText, renderValue } from "../detail-utils";
import { LedgerStepCard } from "./step-shared";
import { CheckCircleOutlined, ClockCircleOutlined, Tag } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

type ApprovalStatusKey = HazardApprovalTaskStatus | "UNKNOWN";
type ApprovalStatusTone = "pending" | "waiting" | "approved" | "rejected" | "unknown";
type ApprovalTaskRecord = HazardApprovalTaskSummaryVO &
  Record<string, unknown> & {
    roleName?: string;
    approverRoleName?: string;
    approvalRoleName?: string;
    nodeRoleName?: string;
    personName?: string;
  };

const approvalStatusConfig: Record<ApprovalStatusKey, { text: string; color?: string; tone: ApprovalStatusTone }> = {
  PENDING: { text: "待处理", color: "processing", tone: "pending" },
  WAITING: { text: "等待前序节点", color: "default", tone: "waiting" },
  APPROVED: { text: "已通过", color: "green", tone: "approved" },
  REJECTED: { text: "已退回", color: "red", tone: "rejected" },
  UNKNOWN: { text: "未知状态", color: "default", tone: "unknown" },
};

const normalizeApprovalStatus = (status?: string): ApprovalStatusKey => {
  const normalized = status?.toUpperCase();
  if (normalized === "PENDING" || normalized === "WAITING" || normalized === "APPROVED" || normalized === "REJECTED") {
    return normalized;
  }
  if (normalized && ["PASSED", "PASS", "COMPLETED", "DONE", "SUCCESS"].includes(normalized)) {
    return "APPROVED";
  }
  if (normalized && ["RETURNED", "BACK", "FAILED", "FAIL"].includes(normalized)) {
    return "REJECTED";
  }
  if (normalized && ["PROCESSING", "ACTIVE", "CURRENT", "TODO"].includes(normalized)) {
    return "PENDING";
  }
  return status ? "UNKNOWN" : "PENDING";
};

const getApprovalStatusConfig = (status?: string): { text: string; color?: string; tone: ApprovalStatusTone } => {
  const normalized = normalizeApprovalStatus(status);
  if (normalized === "UNKNOWN" && status) {
    return { ...approvalStatusConfig.UNKNOWN, text: renderValue(status) };
  }
  return approvalStatusConfig[normalized];
};

const isPassed = (status?: string): boolean => normalizeApprovalStatus(status) === "APPROVED";

const getTaskDisplayName = (task: HazardApprovalTaskSummaryVO): string => {
  const record = task as ApprovalTaskRecord;
  const roleName = readRecordText(record, ["roleName", "approverRoleName", "approvalRoleName", "nodeRoleName", "nodeName", "role"]);
  const personName = readRecordText(record, ["personName", "approverName", "operatorName", "approverId"]);

  if (roleName && personName && roleName !== personName) {
    return `${roleName} · ${personName}`;
  }
  return renderValue(roleName || personName);
};

const renderStatusIcon = (tone: ApprovalStatusTone): VNodeChild => {
  if (tone === "approved") {
    return <CheckCircleOutlined />;
  }
  if (tone === "rejected") {
    return "×";
  }
  return <ClockCircleOutlined />;
};

export const ApprovalRecordStep = (props: { tasks?: HazardApprovalTaskSummaryVO[] | undefined; activeStep: number }): VNodeChild => {
  const tasks = props.tasks ?? [];
  const allPassed = tasks.length > 0 && tasks.every((task) => isPassed(task.status));
  const meta = tasks.length > 0 ? `${tasks.length} 个节点 · ${allPassed ? "全部通过" : "审批中"}` : "暂无审批记录";

  return LedgerStepCard({
    index: 4,
    title: "审批记录",
    meta,
    locked: props.activeStep < 3,
    children:
      tasks.length > 0 ? (
        <>
          <div class="hazard-ledger-approval-route">
            {tasks.map((task, index) => {
              const statusConfig = getApprovalStatusConfig(task.status);
              return (
                <div
                  class={["hazard-ledger-approval-node", `hazard-ledger-approval-node-${statusConfig.tone}`].join(" ")}
                  key={String(task.id ?? task.sequenceNo ?? index)}
                >
                  <span>{renderStatusIcon(statusConfig.tone)}</span>
                  <strong>{getTaskDisplayName(task)}</strong>
                  <em>{statusConfig.text}</em>
                  <small>{formatTime(task.completedTime || task.activatedTime)}</small>
                </div>
              );
            })}
          </div>
          <div class="hazard-ledger-approval-list">
            {tasks.map((task, index) => {
              const statusConfig = getApprovalStatusConfig(task.status);
              return (
                <article key={String(task.id ?? task.sequenceNo ?? index)}>
                  <div>
                    <strong>{getTaskDisplayName(task)}</strong>
                    <span>{formatTime(task.completedTime || task.activatedTime)}</span>
                  </div>
                  <Tag color={statusConfig.color}>{statusConfig.text}</Tag>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div class="hazard-ledger-empty">暂无审批记录</div>
      ),
  });
};
