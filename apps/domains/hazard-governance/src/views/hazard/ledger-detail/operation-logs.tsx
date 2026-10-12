import type { HazardApprovalTaskSummaryVO, HazardDetailVO, HazardRectificationProgressVO } from "@g2-contract/hazard-governance";
import { defineComponent } from "vue";
import type { PropType, VNodeChild } from "vue";

import type { HazardLevel } from "../shared/data";
import { levelText } from "../shared/data";
import {
  type DetailRecord,
  type ProcessLogRecord,
  type TimelineNode,
  getStatusTone,
  mapLogRecordToTimeline,
  readCategoryName,
  readProcessLogRecords,
  renderValue,
} from "./detail-utils";
import { Card, CheckCircleOutlined, ClockCircleOutlined } from "@/pc-ui-runtime";
import { formatTime } from "@/utils/format-time";

const createFallbackTimeline = (currentDetail: HazardDetailVO): TimelineNode[] => {
  const basicInfo = currentDetail.basicInfo;
  const processInfo = currentDetail.processInfo;
  const nodes: TimelineNode[] = [];
  if (!basicInfo) {
    return nodes;
  }
  const basicRecord = basicInfo as DetailRecord;
  const categoryName = readCategoryName(basicRecord);
  const levelName = basicInfo.level && basicInfo.level in levelText ? levelText[basicInfo.level as HazardLevel] : basicInfo.level;

  if (basicInfo.reportedTime || categoryName || basicInfo.level) {
    nodes.push({
      id: "auto-level",
      title: "系统自动分级",
      operator: "系统",
      operatedTime: basicInfo.reportedTime || "",
      content: `AI推荐：类型「${renderValue(categoryName)}」 → 等级「${renderValue(levelName)}」`,
      tone: "active",
    });
  }

  if (basicInfo.confirmedTime || basicInfo.confirmUserName || basicInfo.responsibleUserName) {
    nodes.push({
      id: "confirm",
      title: "确认属实 · 指派整改人",
      operator: renderValue(basicInfo.confirmUserName ?? basicInfo.confirmUserId),
      operatedTime: basicInfo.confirmedTime || "",
      content: `确认属实，整改人：${renderValue(
        basicInfo.responsibleUserName ?? basicInfo.responsibleUserId,
      )}，验收人：${renderValue(basicInfo.acceptanceUserName ?? basicInfo.acceptanceUserId)}，时限${renderValue(
        basicInfo.rectificationDeadlineHours,
      )}小时`,
      tone: "done",
    });
  }

  const plan = processInfo?.currentPlan;
  if (plan?.submittedTime || plan?.rectificationMeasures || plan?.attachments?.length) {
    nodes.push({
      id: "submit-approval",
      title: "提交审批",
      operator: renderValue(plan.submittedByName ?? plan.submittedName ?? plan.submittedBy),
      operatedTime: plan.submittedTime || "",
      content: `整改方案：${renderValue(plan.rectificationMeasures || plan.rectificationContent)}${
        plan.attachments?.length ? `。方案附件${plan.attachments.length}份` : ""
      }`,
      tone: "done",
    });
  }

  (processInfo?.approvalTasks ?? []).forEach((task: HazardApprovalTaskSummaryVO, index: number) => {
    nodes.push({
      id: `approval-${String(task.id ?? task.sequenceNo ?? index)}`,
      title: getStatusTone(task.status) === "done" ? "审批通过" : renderValue(task.nodeName || "审批节点"),
      operator: renderValue(task.approverName ?? task.approverId),
      operatedTime: task.completedTime || task.activatedTime || "",
      content: task.status ? `审批状态：${renderValue(task.status)}` : "",
      tone: getStatusTone(task.status),
    });
  });

  (processInfo?.progressRecords ?? []).forEach((record: HazardRectificationProgressVO, index: number) => {
    const imageText = record.afterImages?.length ? `，上传整改后照片${record.afterImages.length}张` : "";
    nodes.push({
      id: `progress-${String(record.id ?? index)}`,
      title: "执行整改",
      operator: renderValue(record.recordUserName ?? record.recordUserId),
      operatedTime: record.recordTime || "",
      content: `进度更新：${renderValue(record.progressPercent)}%${imageText}${record.progressContent ? `。${record.progressContent}` : ""}`,
      tone: record.progressPercent === 100 ? "done" : "active",
    });
  });

  return nodes;
};

const getTimelineNodes = (currentDetail: HazardDetailVO): TimelineNode[] => {
  const logs = readProcessLogRecords(currentDetail).map((item, index) => mapLogRecordToTimeline(item as ProcessLogRecord, index));
  const nodes = logs.length > 0 ? logs : createFallbackTimeline(currentDetail);
  return nodes.toSorted((prev, next) => String(next.operatedTime).localeCompare(String(prev.operatedTime)));
};

const renderTimelineNode = (node: TimelineNode): VNodeChild => (
  <div class={["hazard-ledger-timeline-item", `hazard-ledger-timeline-item-${node.tone}`].join(" ")} key={node.id}>
    <div class="hazard-ledger-timeline-marker">{node.tone === "done" ? <CheckCircleOutlined /> : <ClockCircleOutlined />}</div>
    <div class="hazard-ledger-timeline-content">
      <strong>{node.title}</strong>
      <span>
        {renderValue(node.operator)} · {formatTime(node.operatedTime)}
      </span>
      {node.content ? <p>{node.content}</p> : null}
    </div>
  </div>
);

export const OperationLogs = defineComponent({
  name: "HazardLedgerOperationLogs",
  props: {
    detail: { type: Object as PropType<HazardDetailVO>, required: true },
  },
  setup: (props) => {
    return () => {
      const timelineNodes = getTimelineNodes(props.detail);
      return (
        <Card>
          <div class="hazard-ledger-timeline">
            {timelineNodes.length > 0 ? timelineNodes.map(renderTimelineNode) : <div class="hazard-ledger-empty">暂无处理过程</div>}
          </div>
        </Card>
      );
    };
  },
});
