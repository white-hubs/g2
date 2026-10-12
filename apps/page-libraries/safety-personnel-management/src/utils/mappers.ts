import type {
  CertCategoryTreeVO,
  CertTypeVO,
  CommitteeVO,
  EmployeeCertVO,
  OrgNodeTreeVO,
  PersonPoolUserVO,
  PersonVO,
  ResumeDayGroupVO,
  ResumeItemVO,
} from "@g2-contract/safety-personnel";
import { dayjs } from "@g2-platform/pc-ui";

import { PERSON_TYPE_CODE_LABEL } from "../constants";
import type {
  CertCategoryUI,
  CertRowUI,
  CertTypeRowUI,
  CommitteeRowUI,
  OrgMemberUI,
  OrgNodeUI,
  PersonnelCardUI,
  PoolPersonUI,
  ResumeItemUI,
} from "../types/ui";
import { formatReviewStatus } from "./cert-review";
import { formatDateTime } from "./format-time";
import { resolveMemberAvatarUrl } from "./member-avatar";

const levelName = (level: number): string => `层级${["一", "二", "三", "四", "五"][level - 1] ?? level}级`;

export function orgMemberToPoolPerson(member: OrgMemberUI): PoolPersonUI {
  return {
    personId: member.userId,
    name: member.userName,
    dept: member.dept ?? "",
    post: "",
    phone: member.phone ?? "",
  };
}

export function mapOrgTree(nodes: OrgNodeTreeVO[]): OrgNodeUI[] {
  return nodes.map((n) => ({
    id: String(n.id ?? ""),
    name: n.name ?? "",
    level: n.level ?? 1,
    levelName: levelName(n.level ?? 1),
    parentId: n.parentId != null ? String(n.parentId) : null,
    members: (n.members ?? []).map((m) => ({
      userId: String(m.userId ?? ""),
      userName: m.userName ?? "",
      dept: m.deptName,
      phone: m.mobile,
      avatar: m.avatar,
      avatarUrl: resolveMemberAvatarUrl(m),
    })),
    children: mapOrgTree(n.children ?? []),
    expanded: false,
  }));
}

export function mapPersonCard(row: PersonVO): PersonnelCardUI {
  const types = (row.typeCodes ?? []).map((c) => PERSON_TYPE_CODE_LABEL[c] ?? c);
  return {
    personId: String(row.id ?? ""),
    name: row.userName ?? "",
    phone: row.phone ?? "",
    company: row.companyName ?? "",
    dept: row.deptName ?? "",
    post: row.postName ?? "",
    personTypes: types,
  };
}

export function mapPoolPerson(row: PersonPoolUserVO): PoolPersonUI {
  return {
    personId: String(row.userId ?? ""),
    name: row.userName ?? "",
    dept: row.deptName ?? "",
    post: row.postName ?? "",
    phone: row.phone ?? "",
  };
}

export function mapCommitteeRow(row: CommitteeVO): CommitteeRowUI {
  return {
    committeeId: String(row.id ?? ""),
    committeeName: row.committeeName ?? "",
    deptName: row.deptName ?? "",
    contactPhone: row.contactPhone,
    intro: row.introduction,
    memberCount: row.memberCount ?? 0,
    attachmentName: row.firstAttachmentName,
  };
}

export function remainingDaysFromValidEnd(validEnd?: string): number {
  if (!validEnd) {
    return 0;
  }
  return dayjs(validEnd).startOf("day").diff(dayjs().startOf("day"), "day");
}

export function mapCertRow(row: EmployeeCertVO, typeName = ""): CertRowUI {
  const remaining = row.remainingDays ?? remainingDaysFromValidEnd(row.validEnd);
  return {
    certId: String(row.id ?? ""),
    certTypeName: row.typeName ?? typeName,
    employeeName: row.userName ?? "",
    phone: row.phone ?? "",
    certName: row.certName ?? "",
    reviewStatus: formatReviewStatus(row),
    remainingDays: remaining,
    expireStatus: row.expireStatus,
  };
}

export function mapCertTypeRow(row: CertTypeVO, categoryName = ""): CertTypeRowUI {
  return {
    typeId: String(row.id ?? ""),
    categoryName: row.categoryName ?? categoryName,
    typeName: row.typeName ?? "",
    definition: row.definition,
    validPeriod: row.validPeriod ?? 0,
    needReview: row.needReview ?? false,
    warnDays: row.warnDays ?? 0,
    reviewPeriod: row.reviewPeriod,
  };
}

export function mapCertCategoryTree(nodes: CertCategoryTreeVO[]): CertCategoryUI[] {
  return nodes.map((n) => ({
    id: String(n.id ?? ""),
    name: n.name ?? "",
    sortNo: n.sortNo,
    children: mapCertCategoryTree(n.children ?? []),
  }));
}

export function certCategoryToTreeSelectData(
  nodes: CertCategoryTreeVO[],
): { value: string; title: string; children?: ReturnType<typeof certCategoryToTreeSelectData> }[] {
  return nodes.map((n) => ({
    value: String(n.id ?? ""),
    title: n.name ?? "",
    children: n.children?.length ? certCategoryToTreeSelectData(n.children) : undefined,
  }));
}

export function certCategoryToTreeData(
  nodes: CertCategoryTreeVO[],
): { key: string; title: string; children?: { key: string; title: string }[] }[] {
  return nodes.map((n) => ({
    key: String(n.id ?? ""),
    title: n.name ?? "",
    children: n.children?.length ? certCategoryToTreeData(n.children) : undefined,
  }));
}

export function buildCategoryNameMap(nodes: CertCategoryTreeVO[], map = new Map<string, string>()): Map<string, string> {
  for (const n of nodes) {
    if (n.id != null) {
      map.set(String(n.id), n.name ?? "");
    }
    if (n.children?.length) {
      buildCategoryNameMap(n.children, map);
    }
  }
  return map;
}

export function timelineSummary(group: ResumeDayGroupVO): string {
  const parts: string[] = [];
  if (group.patrolCount) {
    parts.push(`巡查 ${group.patrolCount}`);
  }
  if (group.meetingCount) {
    parts.push(`会议 ${group.meetingCount}`);
  }
  if (group.trainingCount) {
    parts.push(`培训 ${group.trainingCount}`);
  }
  if (group.approvalCount) {
    parts.push(`审批 ${group.approvalCount}`);
  }
  if (group.alarmCount) {
    parts.push(`告警 ${group.alarmCount}`);
  }
  if (group.otherCount) {
    parts.push(`其他 ${group.otherCount}`);
  }
  return parts.join(" · ") || "暂无记录";
}

export function mapResumeItem(item: ResumeItemVO): ResumeItemUI {
  return {
    id: item.id ?? "",
    title: item.name ?? item.typeName ?? "",
    taskTime: formatDateTime(item.recordTime),
    businessType: item.businessType,
    businessKey: item.businessKey,
    businessTypeName: item.businessTypeName,
  };
}
