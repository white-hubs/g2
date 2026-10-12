/** 开河 safety-personnel 模块 API 类型（契约源） */

export interface FileVO {
  id?: string;
  name?: string;
  suffix?: string;
  path?: string;
  size?: number;
  refCount?: number;
  type?: string;
  businessKey?: string;
  endpointPath?: string;
  createTime?: string;
}

export interface EmployeeCertVO {
  id?: string;
  userId?: string;
  userName?: string;
  phone?: string;
  deptName?: string;
  postName?: string;
  categoryId?: string;
  categoryName?: string;
  typeId?: string;
  typeName?: string;
  certName?: string;
  certNo?: string;
  issueOrg?: string;
  issueDate?: string;
  validStart?: string;
  validEnd?: string;
  remainingDays?: number;
  expireStatus?: string;
  warnDaysSnapshot?: number;
  needReview?: boolean;
  reviewStatus?: string;
  attachmentFileId?: string;
  attachmentFile?: FileVO;
  certStatus?: string;
  warnNotified?: boolean;
  warnNotifyTime?: string;
}

export interface EmployeeCertModifyParam {
  userId: string;
  userName?: string;
  categoryId: string;
  typeId: string;
  certName: string;
  certNo?: string;
  issueOrg?: string;
  issueDate?: string;
  validStart?: string;
  validEnd?: string;
  reviewStatus?: string;
  attachmentFileId?: string;
  certStatus?: string;
}

export interface CertCategoryTreeVO {
  id?: string;
  parentId?: string;
  name?: string;
  level?: number;
  sortNo?: number;
  status?: string;
  children?: CertCategoryTreeVO[];
}

export interface CertCategoryModifyParam {
  name: string;
  sortNo?: number;
  status?: string;
}

export interface CertTypeVO {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  typeName?: string;
  definition?: string;
  validPeriod?: number;
  validPeriodUnit?: string;
  warnDays?: number;
  needReview?: boolean;
  reviewPeriod?: number;
  reviewPeriodUnit?: string;
  status?: string;
}

export interface CertTypeModifyParam {
  categoryId: string;
  typeName: string;
  definition?: string;
  validPeriod?: number;
  validPeriodUnit?: string;
  warnDays?: number;
  needReview?: boolean;
  reviewPeriod?: number;
  reviewPeriodUnit?: string;
  status?: string;
}

export interface CommitteeVO {
  id?: string;
  committeeName?: string;
  deptId?: string;
  deptName?: string;
  introduction?: string;
  contactPhone?: string;
  attachmentCount?: number;
  firstAttachmentName?: string;
  memberCount?: number;
  status?: string;
}

export interface CommitteeMemberVO {
  userId?: string;
  userName?: string;
  phone?: string;
  deptName?: string;
  postName?: string;
  active?: boolean;
}

export interface CommitteeDetailVO extends CommitteeVO {
  members?: CommitteeMemberVO[];
  attachments?: FileVO[];
}

export interface CommitteeModifyParam {
  committeeName: string;
  deptId: string;
  contactPhone?: string;
  introduction?: string;
  userIds: string[];
  fileIds?: string[];
  status?: string;
}

export interface CommitteeChangeLogVO {
  id?: string;
  changeType?: string;
  changeContent?: string;
  operatorName?: string;
  changeTime?: string;
}

export interface OrgNodeMemberVO {
  userId?: string;
  userName?: string;
  deptName?: string;
  mobile?: string;
  /** 用户头像文件信息，可为空 */
  avatar?: FileVO;
}

export interface OrgNodeTreeVO {
  id?: string;
  parentId?: string;
  name?: string;
  level?: number;
  sortNo?: number;
  memberCount?: number;
  hasMore?: boolean;
  members?: OrgNodeMemberVO[];
  children?: OrgNodeTreeVO[];
}

export interface OrgNodeDetailVO {
  id?: string;
  parentId?: string;
  name?: string;
  level?: number;
  sortNo?: number;
  memberCount?: number;
  members?: OrgNodeMemberVO[];
}

export interface OrgNodeModifyParam {
  name: string;
  sortNo?: number;
}

export interface OrgNodeMemberSaveParam {
  userIds: string[];
}

export interface OrgUserCandidateVO {
  userId?: string;
  userName?: string;
  mobile?: string;
  deptName?: string;
  postName?: string;
  enabled?: boolean;
}

export interface HomeOrgArchitectureVO {
  root?: OrgNodeTreeVO;
}

export interface PersonVO {
  id?: string;
  userId?: string;
  userName?: string;
  phone?: string;
  companyName?: string;
  deptName?: string;
  postName?: string;
  status?: string;
  typeCodes?: string[];
  linkedAt?: string;
}

export interface PersonPoolUserVO {
  userId?: string;
  userName?: string;
  phone?: string;
  deptName?: string;
  postName?: string;
  enabled?: boolean;
}

export interface PersonLinkParam {
  userIds: string[];
  typeCode: string;
}

export interface PersonProfileVO {
  id?: string;
  userId?: string;
  userName?: string;
  phone?: string;
  companyName?: string;
  deptName?: string;
  postName?: string;
  status?: string;
  typeCodes?: string[];
}

export interface ResumeDayGroupVO {
  date?: string;
  patrolCount?: number;
  meetingCount?: number;
  trainingCount?: number;
  approvalCount?: number;
  alarmCount?: number;
  otherCount?: number;
  records?: ResumeItemVO[];
}

export interface ResumeItemVO {
  id?: string;
  type?: string;
  typeName?: string;
  name?: string;
  recordTime?: string;
  businessType?: string;
  businessTypeName?: string;
  businessKey?: string;
  url?: string;
}

export interface PageQuery {
  pageNumber: number;
  pageSize: number;
}

export interface PageCertificatesParams extends PageQuery {
  userId?: string;
  categoryId?: string;
  typeId?: string;
  keyword?: string;
  certStatus?: string;
  reviewStatus?: string;
  expireStatus?: string;
}

export interface PageCertTypesParams extends PageQuery {
  categoryId?: string;
  keyword?: string;
  status?: string;
}

export interface PageCommitteesParams extends PageQuery {
  keyword?: string;
  status?: string;
}

export interface PagePersonsParams extends PageQuery {
  typeCode?: string;
  keyword?: string;
  status?: string;
}

export interface PagePersonPoolParams extends PageQuery {
  typeCode?: string;
  keyword?: string;
  organizationId?: string;
  enabled?: boolean;
}

export interface PageOrgUserCandidatesParams extends PageQuery {
  keyword?: string;
  organizationId?: string;
  enabled?: boolean;
}

export interface PersonResumeQuery {
  startDate?: string;
  endDate?: string;
  type?: string;
}

export interface PersonResumeExportQuery extends PersonResumeQuery {
  type?: string;
}
