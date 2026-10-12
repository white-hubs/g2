import type { FileVO } from "./types";

/** 重点人员（原 key-personnel-management）API 类型 */

export type KeyPersonRiskLevel = "HIGH" | "MEDIUM" | "LOW";
export type KeyPersonStatus = "ACTIVE" | "INACTIVE";

export interface KeyPersonPageVO {
  id: number;
  personCode: string;
  name: string;
  phone: string;
  areaId?: number;
  areaName?: string;
  areaSequence?: string;
  riskLevel: KeyPersonRiskLevel;
  riskLevelName?: string;
  supervisorUserId?: number;
  supervisorName?: string;
  supervisionReason?: string;
  status?: KeyPersonStatus;
  statusName?: string;
  createTime?: string;
  updateTime?: string;
}

export interface KeyPersonReportVO {
  id: number;
  personId: number;
  content: string;
  reportAttachmentFileIds?: string[];
  reportAttachmentFiles?: FileVO[];
  reportTime?: string;
  reporterUserId?: number;
  reporterName?: string;
}

export interface KeyPersonDetailVO extends KeyPersonPageVO {
  idCard?: string;
  photoFileId?: string;
  photoFile?: FileVO;
  personAttachmentFileIds?: string[];
  personAttachmentFiles?: FileVO[];
  reports?: KeyPersonReportVO[];
}

export interface KeyPersonSaveParam {
  name: string;
  phone: string;
  idCard?: string;
  areaSequence: string;
  riskLevel: KeyPersonRiskLevel;
  supervisorUserId: number;
  supervisionReason: string;
  photoFileId?: string;
  clearPhoto?: boolean;
  personAttachmentFileIds?: string[];
}

export interface KeyPersonReportSaveParam {
  content: string;
  reportAttachmentFileIds?: string[];
}

export interface KeyPersonOptionVO {
  id: number;
  name: string;
  personCode?: string;
  areaId?: number;
  areaName?: string;
  areaSequence?: string;
}

export interface KeyPersonAreaOptionVO {
  id: number;
  parentId?: number;
  level?: number;
  name: string;
  code?: string;
  sequence: string;
  children?: KeyPersonAreaOptionVO[];
}

export interface KeyPersonSupervisorOptionVO {
  userId: number;
  name: string;
  mobileMasked?: string;
  organizationName?: string;
}

export interface KeyPersonAreaCountVO {
  areaId: number;
  areaName: string;
  count: number;
}

export interface KeyPersonStatisticsVO {
  totalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  areaSupervisorCounts?: KeyPersonAreaCountVO[];
  areaHighRiskCounts?: KeyPersonAreaCountVO[];
}

export interface PageKeyPersonsParams {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  riskLevel?: KeyPersonRiskLevel;
  status?: KeyPersonStatus;
  areaSequence?: string;
}

export interface PageKeyPersonReportsParams {
  personId: number;
  pageNumber: number;
  pageSize: number;
  "period.begin"?: string;
  "period.end"?: string;
}
