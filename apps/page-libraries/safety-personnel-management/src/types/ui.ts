import type { FileVO } from "@g2-contract/safety-personnel";

export interface OrgMemberUI {
  userId: string;
  userName: string;
  dept?: string;
  phone?: string;
  /** 用户头像文件信息 */
  avatar?: FileVO;
  avatarUrl?: string;
}

export interface OrgNodeUI {
  id: string;
  name: string;
  level: number;
  levelName: string;
  parentId: string | null;
  members: OrgMemberUI[];
  children: OrgNodeUI[];
  expanded?: boolean;
}

export interface PersonnelCardUI {
  personId: string;
  name: string;
  phone: string;
  company: string;
  dept: string;
  post: string;
  personTypes: string[];
}

export interface PoolPersonUI {
  personId: string;
  name: string;
  dept: string;
  post: string;
  phone: string;
}

export interface CommitteeRowUI {
  committeeId: string;
  committeeName: string;
  deptName: string;
  contactPhone?: string;
  intro?: string;
  memberCount: number;
  attachmentName?: string;
}

export interface CertRowUI {
  certId: string;
  certTypeName: string;
  employeeName: string;
  phone: string;
  certName: string;
  reviewStatus: string;
  remainingDays: number;
  expireStatus?: string;
}

export interface CertTypeRowUI {
  typeId: string;
  categoryName: string;
  typeName: string;
  definition?: string;
  validPeriod: number;
  needReview: boolean;
  warnDays: number;
  reviewPeriod?: number;
}

export interface CertCategoryUI {
  id: string;
  name: string;
  sortNo?: number;
  children: CertCategoryUI[];
}

export interface ResumeItemUI {
  id: string;
  title: string;
  taskTime: string;
  businessType?: string;
  businessKey?: string;
  businessTypeName?: string;
}
