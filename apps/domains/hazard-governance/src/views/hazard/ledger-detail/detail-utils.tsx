import type { HazardDetailBasicInfoVO, HazardDetailVO, HazardProcessLogVO } from "@g2-contract/hazard-governance";
import type { VNodeChild } from "vue";

import type { HazardLevel } from "../shared/data";
import {
  levelColor,
  levelText,
  normalizeHazardSourceType,
  normalizeHazardStatus,
  sourceTypeColor,
  sourceTypeText,
  statusColor,
  statusText,
} from "../shared/data";
import { Tag } from "@/pc-ui-runtime";

export type DetailRecord = HazardDetailBasicInfoVO & Record<string, unknown>;
export type HazardDetailResponse = HazardDetailVO | { data?: unknown; result?: unknown; details?: unknown };
export type DetailProcessInfoRecord = NonNullable<HazardDetailVO["processInfo"]> & Record<string, unknown>;
export type DetailWithLogs = HazardDetailVO &
  Record<string, unknown> & {
    operationLogs?: HazardProcessLogVO[];
    processLogs?: HazardProcessLogVO[];
  };
export type ProcessLogRecord = HazardProcessLogVO & Record<string, unknown>;

export interface TimelineNode {
  id: string;
  title: string;
  operator: string;
  operatedTime: string;
  content: string;
  tone: "done" | "active";
}

const doneStatuses = new Set(["APPROVED", "PASSED", "COMPLETED", "DONE", "FINISHED", "ACCEPTED", "CLOSED", "SUCCESS"]);
const activeStatuses = new Set(["PROCESSING", "ACTIVE", "CURRENT", "RUNNING", "TODO", "PENDING", "RECTIFYING"]);

export const renderValue = (value?: string | number | boolean | null): string => {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return String(value);
};

export const readText = (record: DetailRecord | undefined, keys: string[]): string => {
  if (!record) {
    return "";
  }
  const value = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined || value === null ? "" : String(value);
};

export const readRecordText = (record: Record<string, unknown> | undefined, keys: string[]): string => {
  if (!record) {
    return "";
  }
  const value = keys.map((key) => record[key]).find((item) => item !== undefined && item !== null && item !== "");
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).join("，");
  }
  return value === undefined || value === null ? "" : String(value);
};

export const readCategoryName = (record: DetailRecord): string => {
  if (Array.isArray(record.categoryNamePath) && record.categoryNamePath.length > 0) {
    return record.categoryNamePath.map(String).join(" / ");
  }
  return readText(record, ["categoryName", "hazardCategoryName", "typeName"]);
};

export const unwrapHazardDetail = (response: HazardDetailResponse): HazardDetailVO | undefined => {
  const candidate =
    response && typeof response === "object"
      ? ((response as { data?: unknown }).data ??
        (response as { result?: unknown }).result ??
        (response as { details?: unknown }).details ??
        response)
      : undefined;
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }
  const detail = candidate as HazardDetailVO;
  const record = candidate as Record<string, unknown>;
  const detailWithLogs = detail as DetailWithLogs;
  const fallbackBasicInfo = [record.basicInfo, record.hazardInfo, record.hazard, record.detail].filter(
    (item) => item && typeof item === "object" && !Array.isArray(item),
  )[0] as HazardDetailBasicInfoVO | undefined;
  const fallbackProcessInfo = [record.processInfo, record.process, record.processes].filter(
    (item) => item && typeof item === "object" && !Array.isArray(item),
  )[0] as DetailProcessInfoRecord | undefined;
  const operationLogs = detailWithLogs.operationLogs ?? detailWithLogs.processLogs;
  if (detail.basicInfo || detail.processInfo || fallbackBasicInfo || fallbackProcessInfo || operationLogs) {
    const mergedDetail: HazardDetailVO = { ...detail };
    const basicInfo = detail.basicInfo ?? fallbackBasicInfo;
    const processInfo = {
      ...fallbackProcessInfo,
      ...detail.processInfo,
      ...(operationLogs ? { operationLogs } : {}),
    };
    if (basicInfo) {
      mergedDetail.basicInfo = basicInfo;
    }
    if (Object.keys(processInfo).length > 0) {
      mergedDetail.processInfo = processInfo;
    }
    return mergedDetail;
  }
  return { basicInfo: candidate as HazardDetailBasicInfoVO };
};

export const renderLevelTag = (level?: string): VNodeChild => {
  const knownLevel = (level && level in levelText ? level : undefined) as HazardLevel | undefined;
  return <Tag color={knownLevel ? levelColor[knownLevel] : undefined}>{knownLevel ? levelText[knownLevel] : renderValue(level)}</Tag>;
};

export const renderStatusTag = (governanceStatus?: string): VNodeChild => {
  const status = normalizeHazardStatus(governanceStatus);
  return <Tag color={status ? statusColor[status] : undefined}>{status ? statusText[status] : renderValue(governanceStatus)}</Tag>;
};

export const renderSourceTag = (sourceType?: string): VNodeChild => {
  const normalizedSourceType = normalizeHazardSourceType(sourceType);
  return (
    <Tag color={normalizedSourceType ? sourceTypeColor[normalizedSourceType] : undefined}>
      {normalizedSourceType ? sourceTypeText[normalizedSourceType] : renderValue(sourceType)}
    </Tag>
  );
};

export const getStatusTone = (status?: string): TimelineNode["tone"] => {
  const normalized = status?.toUpperCase();
  if (normalized && activeStatuses.has(normalized)) {
    return "active";
  }
  if (normalized && doneStatuses.has(normalized)) {
    return "done";
  }
  return "done";
};

export const getActionTitle = (record: ProcessLogRecord): string => {
  const explicitTitle = readRecordText(record, ["title", "actionName", "nodeName", "operationName", "stageName", "eventName"]);
  if (explicitTitle) {
    return explicitTitle;
  }
  const action = readRecordText(record, ["action", "operationType", "type", "nodeKey"]).toUpperCase();
  if (["APPROVE", "PASS", "AGREE"].includes(action)) return "审批通过";
  if (["REJECT", "RETURN", "BACK"].includes(action)) return "审批退回";
  if (["CONFIRM"].includes(action)) return "确认属实 · 指派整改人";
  if (["SUBMIT_APPROVAL"].includes(action)) return "提交审批";
  if (["SUBMIT_ACCEPTANCE"].includes(action)) return "提交验收";
  if (["ACCEPT", "ACCEPTANCE"].includes(action)) return "验收通过 · 闭环归档";
  return renderValue(action || readRecordText(record, ["statusName", "status"]));
};

export const mapLogRecordToTimeline = (record: ProcessLogRecord, index: number): TimelineNode => {
  const operatedTime = readRecordText(record, ["operatedTime", "operationTime", "handleTime", "recordTime", "completedTime", "createTime"]);
  const operator = readRecordText(record, [
    "operatorName",
    "handlerName",
    "userName",
    "creatorName",
    "approverName",
    "recordUserName",
    "submittedByName",
    "operatorId",
  ]);
  return {
    id: readRecordText(record, ["id", "logId", "recordId"]) || `${operatedTime || "process"}-${index}`,
    title: getActionTitle(record),
    operator: operator || "系统",
    operatedTime,
    content: readRecordText(record, ["content", "remark", "opinion", "description", "message", "detail", "summary"]),
    tone: getStatusTone(readRecordText(record, ["status", "state", "operationStatus", "nodeStatus"])),
  };
};

export const readProcessLogRecords = (currentDetail: HazardDetailVO): HazardProcessLogVO[] => {
  const detailRecord = currentDetail as DetailWithLogs;
  const processInfo = currentDetail.processInfo as DetailProcessInfoRecord | undefined;
  const candidates = [
    processInfo?.operationLogs,
    processInfo?.processLogs,
    processInfo?.logs,
    processInfo?.records,
    processInfo?.historyRecords,
    detailRecord.operationLogs,
    detailRecord.processLogs,
    detailRecord.logs,
  ];
  return (candidates.find(Array.isArray) ?? []) as HazardProcessLogVO[];
};

export const splitTextLines = (value?: string): string[] =>
  (value || "")
    .split(/\r?\n|[；;]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const toNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};
