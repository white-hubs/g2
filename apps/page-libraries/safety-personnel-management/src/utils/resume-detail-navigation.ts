import { message } from "@g2-platform/pc-ui";

import { openBusinessPage } from "./open-business-page";

/** 资产依赖流引擎业务 */
const propertyManagementFlowBusinessType = [
  "PROPERTY_DEPOSITORY",
  "PROPERTY_ALLOT_PERSONAL",
  "PROPERTY_ALLOT_UNIT",
  "PROPERTY_WEED_OUT",
  "CONSUMABLE_ADD",
  "CONSUMABLE_REDUCE",
];

/** 依赖于新版流引擎的业务（与工作中心 use-list-operate 一致） */
const baseFlowEngine = [
  "ATTENDANCE_MANAGEMENT",
  "PERSONNELMANAGEMENT",
  "OFFICIAL_MANAGEMENT",
  "WORK_REPORT",
  "SMALLENFINEERING",
  "HIDDENDANGER",
  "FAULT",
  "COMPLAINT",
  "OUTSOURCE_REPAIR",
  "RETROFIT",
  "VISITOR_MANAGEMENT",
  "MEETING_ROOM_MANAGEM",
  "APPROVAL_CENTER",
  "PARKINGMANAGE",
];

export interface ResumeNavigateTarget {
  applicationCode: string;
  path: string;
}

export interface ResumeNavigateInput {
  businessType?: string;
  businessKey?: string;
  businessTypeName?: string;
}

/** 履历仅有 businessType，按工作中心 TaskRecord 规则推导 applicationCode */
function resolveApplicationCode(businessType: string): string {
  if (propertyManagementFlowBusinessType.includes(businessType)) {
    return "PROPERTY_MANAGEMENT";
  }
  if (["EXAM_TASK", "CULTIVATE_TASK"].includes(businessType)) {
    return "SECURE_EDU";
  }
  if (["approve_report", "approve_node", "approve_report_stat"].includes(businessType)) {
    return "XRXPROGECT";
  }
  return businessType;
}

/**
 * 解析跳转目标，逻辑对齐 work-center/app/src/hook/use-list-operate.ts operate(detail)。
 * 唯一额外分支：CONFERENCE_MEETING → 会议室预约记录列表。
 */
export function resolveResumeNavigateTarget(item: ResumeNavigateInput): ResumeNavigateTarget | null {
  const businessType = item.businessType?.trim();
  const businessKey = item.businessKey?.trim();
  const businessTypeName = item.businessTypeName ?? "详情";

  if (!businessType) {
    return null;
  }

  // 会议室：跳预约记录列表（安全履历专用，工作中心无此分支）
  if (businessType === "CONFERENCE_MEETING") {
    return {
      applicationCode: "MEETING_ROOM_MANAGEM",
      path: "/portal/meet-room/reservation-log",
    };
  }

  const applicationCode = resolveApplicationCode(businessType);
  let target = "";

  if (baseFlowEngine.includes(applicationCode) && businessType === "OFFICIAL_FOCUS_WORK_REPLY" && businessKey) {
    const id = businessKey.split("_")[0];
    target = `/portal/governmentManagement/eventHandleDetail?id=${id}`;
  } else if (baseFlowEngine.includes(applicationCode)) {
    if (!businessKey) {
      return null;
    }
    target = `/portal/stream-engine-render/index?businessType=${businessType}&processInstanceId=${businessKey}&type=detail&title=${businessTypeName}&appName=agencyCenter`;
  } else if (applicationCode === "PROPERTY_MANAGEMENT") {
    if (!businessKey || !propertyManagementFlowBusinessType.includes(businessType)) {
      return null;
    }
    target = `/portal/stream-engine-render/index?businessType=${businessType}&processInstanceId=${businessKey}&type=detail&title=${businessTypeName}&appName=agencyCenter`;
  } else if (applicationCode === "SECURE_EDU") {
    if (!businessKey) {
      return null;
    }
    if (businessType === "EXAM_TASK") {
      target = `/portal/secure-edu/exam-task-form?action=detail&id=${businessKey}&appName=agencyCenter`;
    } else if (businessType === "CULTIVATE_TASK") {
      target = `/portal/secure-edu/training-task-form?action=detail&id=${businessKey}&appName=agencyCenter`;
    }
  } else if (applicationCode === "XRXPROGECT") {
    if (!businessKey) {
      return null;
    }
    if (businessType === "approve_report") {
      target = `/portal/xrx-engineering-management/report-detail?action=approve&id=${businessKey}`;
    } else if (businessType === "approve_node") {
      target = `/portal/xrx-engineering-management/plan-approve-detail?action=edit&id=${businessKey}`;
    } else if (businessType === "approve_report_stat") {
      target = `/portal/xrx-engineering-management/statistic-detail?action=approve&id=${businessKey}`;
    }
  } else if (["GAS_MANAGEMENT", "SECURITY_MONITORING"].includes(businessType)) {
    if (!businessKey) {
      return null;
    }
    target = `/portal/genericEquipmentMonitor/alarmDetail?businessKey=${businessKey}&type=detail&id=${businessKey}`;
  } else if (["DAILY_TASK", "DAILY_INSPECTION", "DAILY_SMALL_INSPECTION", "GRID_MANAGE"].includes(businessType)) {
    if (!businessKey) {
      return null;
    }
    target = `/portal/daily-task/task-edit?type=detail&id=${businessKey}`;
  } else if (businessType === "INSPECTION") {
    if (!businessKey) {
      return null;
    }
    target = `/portal/inspection/inspectionTaskDetails?type=detail&id=${businessKey}`;
  }

  if (!target) {
    return null;
  }

  return { applicationCode, path: target };
}

export function openResumeDetail(item: ResumeNavigateInput): void {
  const target = resolveResumeNavigateTarget(item);
  if (!target) {
    message.warning("暂无详情");
    return;
  }
  openBusinessPage(target.applicationCode, target.path);
}
