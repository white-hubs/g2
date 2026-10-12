import type { Pagination, Paging } from "@g2-contract/base";

export type DutyPeriodType = "MONTH" | "QUARTER" | "YEAR" | "DAY" | "WEEK";
export type DutySignStatus = "UNSIGNED" | "SIGNED";
export type DutyAssignmentItemStatus = "PENDING" | "COMPLETED" | "OVERDUE";
export type DutyEvidenceSourceType = "SYSTEM_COLLECT" | "MANUAL";
export type DutyReportStatus = "GENERATING" | "GENERATED" | "FAILED";
export type DutyReportGenerateMethod = "AUTO" | "MANUAL";
export type DutyScoreLevel = "A" | "B" | "C" | "D";
export type DutyScoreNotifyTargetType = "POST" | "JOB" | "POSITION" | "DEPARTMENT" | "USER" | "LEGAL_ROLE";
export type DutyId = number | string;
export type DutyFileId = number | string;
export type DutyDateTime = string | number;

export interface DutyNotifyResultVO {
  success?: boolean;
  successCount?: number;
  failureCount?: number;
  message?: string;
}

export interface DutyRoleAssignedUserVO {
  userId?: number | string;
  userName?: string;
  deptId?: number | string;
  deptName?: string;
  positionName?: string;
  postName?: string;
  mobile?: string;
  assignedRoleNames?: string[];
}

export interface DutyRoleAssignmentVO {
  roleId?: string;
  roleName?: string;
  roleDisplayName?: string;
  legalBasis?: string;
  dutySummary?: string;
  users?: DutyRoleAssignedUserVO[];
  userCount?: number;
}

export interface DutyRoleUserCandidateVO extends DutyRoleAssignedUserVO {
  enabled?: boolean;
}

export interface DutyRoleAssignmentQueryParam {
  industryType?: string;
  roleId?: string;
  roleName?: string;
  keyword?: string;
}

export interface DutyRoleUserCandidateQueryParam extends Paging {
  keyword?: string;
  organizationId?: string;
}

export interface DutyRoleAssignmentItemParam {
  roleId?: string;
  roleName?: string;
  userIds: DutyId[];
}

export interface DutyRoleAssignmentSaveParam {
  assignments: DutyRoleAssignmentItemParam[];
}

export interface DutyTemplateQueryParam extends Paging {
  industryType?: string;
  roleId?: string;
  roleName?: string;
  keyword?: string;
}

export interface DutyTemplateVO {
  id?: DutyId;
  industryType?: string;
  industryTypeLabel?: string;
  roleId?: string;
  roleName?: string;
  currentVersionNo?: number;
  itemCount?: number;
  mandatoryCount?: number;
  lastUpdatedTime?: DutyDateTime;
}

export interface DutyTemplateItemVO {
  id?: DutyId;
  templateId?: DutyId;
  industryType?: string;
  industryTypeLabel?: string;
  templateLastUpdatedTime?: DutyDateTime;
  clauseNo?: string;
  lawNameCode?: string;
  lawNameLabel?: string;
  roleId?: string;
  roleName?: string;
  taskDescription?: string;
  periodType?: DutyPeriodType | string;
  periodTypeLabel?: string;
  mandatory?: boolean;
  evidenceSourceCode?: string;
  evidenceSourceName?: string;
  sourceBusinessType?: string;
  matchRuleLabel?: string;
}

export interface DutyTemplateItemStatisticsVO {
  itemCount?: number;
  mandatoryCount?: number;
  lastUpdatedTime?: DutyDateTime;
}

export interface DutyTemplateDetailVO {
  id?: DutyId;
  industryType?: string;
  roleId?: string;
  roleName?: string;
  versionId?: DutyId;
  versionNo?: number;
  current?: boolean;
  items?: DutyTemplateItemVO[];
}

export interface DutyTemplateItemBaseParam {
  clauseNo?: string;
  lawNameCode: string;
  lawNameLabel?: string;
  taskDescription: string;
  periodType: DutyPeriodType | string;
  mandatory?: boolean;
  evidenceSourceCode?: string;
  evidenceSourceName?: string;
  sourceBusinessType?: string;
  matchRuleLabel?: string;
}

export interface DutyTemplateItemSaveParam extends DutyTemplateItemBaseParam {
  id?: DutyId;
}

export interface DutyTemplateItemCreateParam extends DutyTemplateItemBaseParam {
  industryType: string;
  roleId: string;
}

export interface DutyTemplateItemsCreateParam {
  industryType: string;
  roleId: string;
  items: DutyTemplateItemBaseParam[];
}

export interface DutyTemplateItemUpdateParam extends DutyTemplateItemBaseParam {}

export interface DutyTemplateSaveParam {
  id?: DutyId;
  industryType: string;
  roleId?: string;
  roleName?: string;
  items: DutyTemplateItemSaveParam[];
  duplicateConfirmed?: boolean;
}

export interface DutyLegalClauseQueryParam {
  industryType: string;
  roleId: string;
  roleName?: string;
}

export interface DutyLegalClauseVO {
  clauseNo?: string;
  lawNameCode?: string;
  lawNameLabel?: string;
  taskDescription?: string;
  periodType?: DutyPeriodType | string;
  mandatory?: boolean;
}

export interface DutyLawNameVO {
  lawNameCode?: string;
  lawNameLabel?: string;
}

export interface DutyEvidenceSourceOptionQueryParam {
  industryType?: string;
  roleId?: string;
  roleName?: string;
}

export interface DutyEvidenceSourceOptionVO {
  sourceCode?: string;
  sourceName?: string;
  sourceBusinessType?: string;
  sourceBusinessTypeName?: string;
  matchRuleLabel?: string;
  enabled?: boolean;
}

export interface DutyTemplateItemDuplicateCheckParam {
  templateId?: number;
  clauseNo?: string;
  lawNameCode?: string;
  taskDescription?: string;
}

export interface DutyTemplateSimilarItemVO {
  itemId?: number;
  clauseNo?: string;
  lawNameCode?: string;
  taskDescription?: string;
  similarity?: number;
}

export interface DutyTemplateDuplicateCheckVO {
  duplicated?: boolean;
  similarItems?: DutyTemplateSimilarItemVO[];
}

export interface DutyTemplateVersionCreateParam {
  templateId: number;
  changeDescription?: string;
}

export interface DutyTemplateVersionRollbackParam {
  templateId: number;
  sourceVersionId: number;
  changeDescription?: string;
}

export interface DutyTemplateVersionVO {
  versionId?: number;
  templateId?: number;
  versionNo?: number;
  current?: boolean;
  createdBy?: string;
  createdByName?: string;
  createdTime?: DutyDateTime;
  changeDescription?: string;
}

export interface DutyAssignmentOverviewStatParam {
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
}

export interface DutyAssignmentOverviewStatVO {
  totalUserCount?: number;
  signedCount?: number;
  unsignedCount?: number;
  averageCompletionRate?: number;
}

export interface DutyAssignmentOverviewRoleGroupParam {
  keyword?: string;
  roleName?: string;
  signStatus?: DutySignStatus | string;
  periodType?: Extract<DutyPeriodType, "MONTH" | "QUARTER" | "YEAR"> | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
}

export interface DutyAssignmentOverviewAssignmentVO {
  assignmentId?: number;
  dispatchId?: number;
  responsibleUserName?: string;
  deptName?: string;
  roleName?: string;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  signStatus?: DutySignStatus | string;
  signTime?: DutyDateTime;
  completionRate?: number;
}

export interface DutyAssignmentOverviewRoleGroupVO {
  roleName?: string;
  userCount?: number;
  signedCount?: number;
  unsignedCount?: number;
  averageCompletionRate?: number;
  assignments?: DutyAssignmentOverviewAssignmentVO[];
}

export interface DutyAssignmentQueryParam extends Paging {
  keyword?: string;
  roleName?: string;
  signStatus?: DutySignStatus | string;
  completionRateRange?: string;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
}

export interface DutyAssignmentSummaryVO {
  assignmentId?: number;
  dispatchId?: number;
  responsibleUserId?: number;
  responsibleUserName?: string;
  deptId?: number;
  deptName?: string;
  roleName?: string;
  templateVersionNo?: number;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  dispatchTime?: DutyDateTime;
  signStatus?: DutySignStatus | string;
  signTime?: DutyDateTime;
  signDeadlineDays?: number;
  signPromptTime?: DutyDateTime;
  remainingDays?: number;
  completionRate?: number;
  totalItemCount?: number;
  completedItemCount?: number;
}

export interface DutyAssignmentDetailParam {
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  itemStatus?: DutyAssignmentItemStatus | string;
  lawNameCode?: string;
  keyword?: string;
}

export interface DutyAssignmentItemVO {
  assignmentItemId?: DutyId;
  clauseNo?: string;
  lawNameCode?: string;
  lawNameLabel?: string;
  taskDescription?: string;
  itemType?: string;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  deadlineTime?: DutyDateTime;
  status?: DutyAssignmentItemStatus | string;
  statusLabel?: string;
  overdueDays?: number;
  recordCount?: number;
  hasSystemCollectRecord?: boolean;
  hasManualRecord?: boolean;
  manualFillAllowed?: boolean;
}

export interface DutyAssignmentItemGroupVO {
  periodType?: DutyPeriodType | string;
  periodTypeLabel?: string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  itemCount?: number;
  completedItemCount?: number;
  items?: DutyAssignmentItemVO[];
}

export interface DutyAssignmentDetailVO {
  assignmentId?: number;
  responsibleUserId?: number;
  responsibleUserName?: string;
  roleName?: string;
  templateVersionNo?: number;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  signStatus?: DutySignStatus | string;
  signTime?: DutyDateTime;
  signDeadlineDays?: number;
  signPromptTime?: DutyDateTime;
  remainingDays?: number;
  industryType?: string;
  industryTypeLabel?: string;
  periodLabel?: string;
  totalItemCount?: number;
  completedItemCount?: number;
  pendingItemCount?: number;
  overdueItemCount?: number;
  completionRate?: number;
  groups?: DutyAssignmentItemGroupVO[];
}

export interface DutyMyAssignmentCurrentParam {
  periodType?: Extract<DutyPeriodType, "MONTH" | "QUARTER" | "YEAR"> | string;
  itemStatus?: DutyAssignmentItemStatus | string;
}

export interface DutyNotifyWayVO {
  code?: string;
  label?: string;
  enabled?: boolean;
}

export interface DutyDispatchRoleOptionVO {
  roleName?: string;
  userCount?: number;
  users?: DutyRoleAssignedUserVO[];
}

export interface DutyDispatchOptionQueryParam {
  industryType?: string;
  templateVersionId?: number;
}

export interface DutyDispatchOptionVO {
  roles?: DutyDispatchRoleOptionVO[];
  defaultTemplateVersionId?: number;
  notifyWays?: DutyNotifyWayVO[];
  deadlineDayOptions?: number[];
}

export interface DutyDispatchCreateParam {
  templateVersionId?: number;
  targetRoleNames?: string[];
  targetUserIds?: number[];
  signDeadlineDays?: number;
  notifyWays?: string[];
}

export interface DutyDispatchQueryParam extends Paging {
  periodType?: DutyPeriodType | string;
  roleName?: string;
  keyword?: string;
  dispatchTimeStart?: DutyDateTime;
  dispatchTimeEnd?: DutyDateTime;
}

export interface DutyDispatchVO {
  dispatchId?: number;
  dispatchName?: string;
  templateVersionId?: number;
  templateVersionNo?: number;
  dispatchTime?: DutyDateTime;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  roleNames?: string[];
  roleName?: string;
  targetUserCount?: number;
  recipientCount?: number;
  signedCount?: number;
  unsignedCount?: number;
  overdueUnsignedCount?: number;
  signDeadlineDays?: number;
  notifyResult?: DutyNotifyResultVO;
}

export interface DutySignatureQueryParam extends Paging {
  signStatus?: DutySignStatus | string;
  periodType?: DutyPeriodType | string;
  roleName?: string;
  keyword?: string;
}

export interface DutySignatureTrackingStatVO {
  signedCount?: number;
  unsignedCount?: number;
  overdueUnsignedCount?: number;
}

export interface DutySignatureVO {
  signatureId?: number;
  assignmentId?: number;
  userId?: number;
  userName?: string;
  roleName?: string;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  dispatchTime?: DutyDateTime;
  signStatus?: DutySignStatus | string;
  signTime?: DutyDateTime;
  signDeadlineDays?: number;
  signPromptTime?: DutyDateTime;
  remainingDays?: number;
  signUserId?: number;
  signUserName?: string;
  ip?: string;
  userAgent?: string;
}

export interface DutySignaturePreviewItemVO {
  taskDescription?: string;
  clauseNo?: string;
  periodType?: DutyPeriodType | string;
  mandatory?: boolean;
}

export interface DutySignaturePreviewGroupVO {
  periodType?: DutyPeriodType | string;
  itemCount?: number;
  items?: DutySignaturePreviewItemVO[];
}

export interface DutySignaturePreviewAssignmentVO {
  assignmentId?: DutyId;
  responsibleUserId?: number;
  responsibleUserName?: string;
  roleName?: string;
  templateVersionNo?: number;
  periodType?: DutyPeriodType | string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  signPromptTime?: DutyDateTime;
  signDeadlineDays?: number;
  groups?: DutySignaturePreviewGroupVO[];
}

export interface DutySignaturePreviewVO {
  assignmentIds?: DutyId[];
  userName?: string;
  alreadySigned?: boolean;
  assignments?: DutySignaturePreviewAssignmentVO[];
}

export interface DutySignatureCreateParam {
  assignmentIds: DutyId[];
  confirmed: boolean;
}

export interface DutyRecordManualCreateParam {
  assignmentItemId: DutyId;
  executionDescription: string;
  fileIds?: DutyFileId[];
}

export interface DutyFileVO {
  id?: DutyFileId;
  name?: string;
  url?: string;
  contentType?: string;
}

export interface DutyRecordVO {
  id?: number;
  assignmentItemId?: DutyId;
  title?: string;
  executionDescription?: string;
  sourceType?: DutyEvidenceSourceType | string;
  fileIds?: DutyFileId[];
  files?: DutyFileVO[];
  fillUserId?: number;
  fillUserName?: string;
  fillTime?: DutyDateTime;
}

export interface DutyRecordSummaryVO {
  recordId?: number;
  assignmentItemId?: DutyId;
  title?: string;
  summary?: string;
  occurredTime?: DutyDateTime;
  sourceType?: DutyEvidenceSourceType | string;
  sourceTypeLabel?: string;
  sourceApplicationCode?: string;
  sourceApplicationName?: string;
  sourceBusinessType?: string;
  sourceBusinessTypeName?: string;
  sourceBusinessId?: string;
}

export interface DutyRecordDetailVO {
  id?: number;
  assignmentItemId?: DutyId;
  clauseNo?: string;
  lawNameLabel?: string;
  taskDescription?: string;
  sourceType?: DutyEvidenceSourceType | string;
  sourceTypeLabel?: string;
  title?: string;
  summary?: string;
  occurredTime?: DutyDateTime;
  executionDescription?: string;
  fileIds?: DutyFileId[];
  files?: DutyFileVO[];
  sourceApplicationCode?: string;
  sourceApplicationName?: string;
  sourceBusinessType?: string;
  sourceBusinessTypeName?: string;
  sourceBusinessId?: string;
}

export interface DutyReportTypeQueryParam {
  industryType?: string;
}

export interface DutyReportTypeVO {
  lawNameCode?: string;
  lawNameLabel?: string;
  reportTypeName?: string;
  clauseCount?: number;
  expectedSeconds?: number;
  description?: string;
  enabled?: boolean;
}

export interface DutyReportGenerateConfirmParam {
  periodType: DutyPeriodType | string;
  periodStartTime: string;
  periodEndTime: string;
  lawNameCode: string;
  responsibleUserId?: DutyId;
}

export interface DutyReportGenerateConfirmVO {
  periodLabel?: string;
  reportTypeName?: string;
  lawNameCode?: string;
  lawNameLabel?: string;
  clauseCount?: number;
  expectedSeconds?: number;
}

export interface DutyReportGenerateParam extends DutyReportGenerateConfirmParam {}

export interface DutyReportResponsibleUserCandidateQueryParam extends Paging {
  keyword?: string;
  periodType?: Extract<DutyPeriodType, "MONTH" | "QUARTER" | "YEAR"> | string;
  periodValue?: string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  lawNameCode?: string;
  deptId?: number;
  roleName?: string;
}

export interface DutyReportResponsibleUserCandidateVO {
  responsibleUserId?: DutyId;
  responsibleUserName?: string;
  deptId?: DutyId;
  deptName?: string;
  roleName?: string;
  assignmentId?: DutyId;
}

export interface DutyReportSignatureConfirmParam {
  confirmed: boolean;
}

export interface DutyReportQueryParam extends Paging {
  periodType?: DutyPeriodType | string;
  lawNameCode?: string;
  generateMethod?: DutyReportGenerateMethod | string;
  status?: DutyReportStatus | string;
  responsibleUserId?: DutyId;
}

export interface DutyReportVO {
  id?: DutyId;
  reportName?: string;
  periodType?: DutyPeriodType | string;
  periodLabel?: string;
  periodStartTime?: DutyDateTime;
  periodEndTime?: DutyDateTime;
  lawNameCode?: string;
  lawNameLabel?: string;
  responsibleUserId?: DutyId;
  responsibleUserName?: string;
  deptName?: string;
  generateMethod?: DutyReportGenerateMethod | string;
  status?: DutyReportStatus | string;
  generatedTime?: DutyDateTime;
  completedCount?: number;
  incompleteCount?: number;
  signatureStatus?: "UNCONFIRMED" | "CONFIRMED" | string;
  signatureUserId?: DutyId;
  signatureUserName?: string;
  signatureTime?: DutyDateTime;
  archiveNo?: string;
  failReason?: string;
}

export interface DutyReportMappingQueryParam {
  mappingStatus?: string;
}

export interface DutyReportMappingVO {
  id?: DutyId;
  reportId?: DutyId;
  clauseNo?: string;
  lawNameCode?: string;
  lawNameLabel?: string;
  taskDescription?: string;
  mappingStatus?: string;
  evidenceCount?: number;
  gapDescription?: string;
}

export interface DutyReportDetailVO {
  report?: DutyReportVO;
  mappings?: DutyReportMappingVO[];
}

export interface DutyReportEvidenceRawVO {
  sourceApplicationCode?: string;
  sourceApplicationName?: string;
  sourceBusinessType?: string;
  sourceBusinessTypeName?: string;
  sourceBusinessId?: string;
}

export interface DutyReportEvidenceVO {
  id?: DutyId;
  reportId?: DutyId;
  mappingId?: DutyId;
  recordId?: DutyId;
  title?: string;
  summary?: string;
  occurredTime?: DutyDateTime;
  sourceType?: DutyEvidenceSourceType | string;
  fileIds?: DutyFileId[];
  files?: DutyFileVO[];
  rawData?: DutyReportEvidenceRawVO;
}

export interface DutyReportEvidenceQueryParam {
  sourceType?: DutyEvidenceSourceType | string;
}

export interface DutyReportMappingDetailVO {
  mapping?: DutyReportMappingVO;
  evidences?: DutyReportEvidenceVO[];
}

export interface DutyReportGapDetailVO {
  mappingId?: DutyId;
  gapDescription?: string;
}

export interface DutyScorePeriodParam {
  periodType?: DutyPeriodType | string;
  periodValue?: string;
}

export interface DutyScoreDashboardQueryParam extends DutyScorePeriodParam {
  deptId?: number;
}

export interface DutyScoreDashboardSummaryVO {
  participantCount?: number;
  avgCompletionRate?: number;
  maxCompletionRate?: number;
  minCompletionRate?: number;
}

export interface DutyScoreDepartmentSummaryVO {
  deptId?: number;
  deptName?: string;
  parentDeptId?: number;
  avgCompletionRate?: number;
  participantCount?: number;
  momChangeRate?: number;
}

export interface DutyScoreRankingQueryParam extends Paging, DutyScoreDashboardQueryParam {
  keyword?: string;
  roleName?: string;
}

export interface DutyScoreRankingItemVO {
  rankNo?: number;
  userId?: DutyId;
  userName?: string;
  deptName?: string;
  roleName?: string;
  completionRate?: number;
  mandatoryCompleted?: boolean;
  mandatoryMissingCount?: number;
  level?: DutyScoreLevel | string;
  momChangeRate?: number;
}

export interface DutyScoreRankingExportParam {
  periodType?: DutyPeriodType | string;
  periodValue?: string;
  deptId?: number;
  keyword?: string;
  roleName?: string;
}

export interface DutyScorePersonVO {
  userId?: DutyId;
  userName?: string;
  avatarUrl?: string;
  roleName?: string;
  deptName?: string;
  industryType?: string;
  industryTypeLabel?: string;
  periodLabel?: string;
}

export interface DutyPersonalScoreSummaryVO {
  completionRate?: number;
  companyRankNo?: number;
  deptRankNo?: number;
  momChangeRate?: number;
  totalItemCount?: number;
  completedItemCount?: number;
  mandatoryMissingCount?: number;
  level?: DutyScoreLevel | string;
}

export interface DutyPersonalScoreItemVO {
  itemId?: number;
  taskDescription?: string;
  lawClauseNo?: string;
  lawNameLabel?: string;
  itemType?: string;
  status?: DutyAssignmentItemStatus | string;
  deadlineTime?: DutyDateTime;
  completedTime?: DutyDateTime;
  overdue?: boolean;
}

export interface DutyScoreRankTrendVO {
  periodLabel?: string;
  completionRate?: number;
  companyRankNo?: number;
  deptRankNo?: number;
  momChangeRate?: number;
  level?: DutyScoreLevel | string;
}

export interface DutyPersonalScoreReportVO {
  person?: DutyScorePersonVO;
  summary?: DutyPersonalScoreSummaryVO;
  assignmentItems?: DutyPersonalScoreItemVO[];
  rankTrends?: DutyScoreRankTrendVO[];
}

export interface DutyAppPersonalScoreReportVO {
  person?: DutyScorePersonVO;
  summary?: DutyPersonalScoreSummaryVO;
  assignmentItems?: DutyPersonalScoreItemVO[];
  rankTrends?: DutyScoreRankTrendVO[];
}

export interface DutyScorePublicityPersonVO {
  rankNo?: number;
  userId?: DutyId;
  userName?: string;
  deptName?: string;
  completionRate?: number;
  completedItemCount?: number;
  totalItemCount?: number;
  mandatoryCompleted?: boolean;
  mandatoryMissingCount?: number;
  level?: DutyScoreLevel | string;
}

export interface DutyScorePublicityVO {
  participantCount?: number;
  redList?: DutyScorePublicityPersonVO[];
  blackList?: DutyScorePublicityPersonVO[];
}

export interface DutyScorePublicityQueryParam extends DutyScorePeriodParam {}

export interface DutyScorePublicityRankingQueryParam extends Paging, DutyScorePeriodParam {}

export interface DutyScorePublicityRankingItemVO extends DutyScorePublicityPersonVO {}

export interface DutyAppScorePublicityVO extends DutyScorePublicityVO {}

export interface DutyAppScoreDashboardVO {
  avgCompletionRate?: number;
  maxCompletionRate?: number;
  minCompletionRate?: number;
  departments?: DutyScoreDepartmentSummaryVO[];
  rankings?: DutyScoreRankingItemVO[];
  rankingTotal?: number;
  rankingPages?: number;
}

export interface DutyScoreLevelRuleVO {
  level?: DutyScoreLevel | string;
  mandatoryRequirement?: string;
  minCompletionRate?: number;
  maxCompletionRate?: number;
  label?: string;
  publicityType?: string;
  editable?: boolean;
}

export interface DutyScoreLevelRuleSaveParam extends DutyScoreLevelRuleVO {}

export interface DutyScoreModelQueryParam {
  periodType?: DutyPeriodType | string;
}

export interface DutyScoreModelVO {
  modelId?: string;
  periodType?: DutyPeriodType | string;
  version?: number;
  effectiveTime?: DutyDateTime;
  levels?: DutyScoreLevelRuleVO[];
}

export interface DutyScoreModelSaveParam {
  periodType: DutyPeriodType | string;
  levels: DutyScoreLevelRuleSaveParam[];
}

export interface DutyScoreNotifyTargetQueryParam {
  level?: DutyScoreLevel | string;
}

export interface DutyScoreNotifyTargetItemVO {
  id?: number;
  targetType?: DutyScoreNotifyTargetType | string;
  targetId?: number;
  targetCode?: string;
  targetName?: string;
  targetSnapshot?: string;
  sortNo?: number;
}

export interface DutyScoreNotifyTargetVO {
  level?: DutyScoreLevel | string;
  targets?: DutyScoreNotifyTargetItemVO[];
  notifyWays?: DutyNotifyWayVO[];
}

export interface DutyScoreNotifyTargetItemParam {
  targetType: DutyScoreNotifyTargetType | string;
  targetId?: number;
  targetCode?: string;
  targetName?: string;
  targetSnapshot?: string;
  sortNo?: number;
}

export interface DutyScoreNotifyTargetSaveParam {
  level: DutyScoreLevel | string;
  targets: DutyScoreNotifyTargetItemParam[];
}

export interface DutyScoreNotifyTargetCandidateQueryParam extends Paging {
  targetType?: DutyScoreNotifyTargetType | string;
  keyword?: string;
}

export interface DutyScoreNotifyTargetCandidateVO {
  targetType?: DutyScoreNotifyTargetType | string;
  targetId?: DutyId;
  targetCode?: string;
  targetName?: string;
  roleName?: string;
  deptName?: string;
  postName?: string;
  positionName?: string;
  userId?: DutyId;
  userName?: string;
}

export interface DutyAppScoreDashboardParam extends Paging, DutyScorePeriodParam {}
export interface DutyAppScorePublicityParam extends DutyScorePeriodParam {}
export interface DutyAppScoreReportParam extends DutyScorePeriodParam {}

export interface DutyGateway {
  listDutyRoleAssignments: (params?: DutyRoleAssignmentQueryParam) => Promise<DutyRoleAssignmentVO[]>;
  pageDutyRoleUserCandidates: (params: DutyRoleUserCandidateQueryParam) => Promise<Pagination<DutyRoleUserCandidateVO>>;
  saveDutyRoleAssignments: (payload: DutyRoleAssignmentSaveParam) => Promise<DutyRoleAssignmentVO[]>;

  pageDutyTemplates: (params: DutyTemplateQueryParam) => Promise<Pagination<DutyTemplateVO>>;
  pageDutyTemplateItems: (params: DutyTemplateQueryParam) => Promise<Pagination<DutyTemplateItemVO>>;
  getDutyTemplateItemStatistics: (params: DutyTemplateQueryParam) => Promise<DutyTemplateItemStatisticsVO>;
  createDutyTemplate: (payload: DutyTemplateSaveParam) => Promise<DutyTemplateDetailVO>;
  createDutyTemplateItem: (payload: DutyTemplateItemCreateParam) => Promise<DutyTemplateItemVO>;
  createDutyTemplateItems: (payload: DutyTemplateItemsCreateParam) => Promise<DutyTemplateItemVO[]>;
  getDutyTemplate: (id: DutyId) => Promise<DutyTemplateDetailVO>;
  updateDutyTemplate: (id: DutyId, payload: DutyTemplateSaveParam) => Promise<DutyTemplateDetailVO>;
  updateDutyTemplateItem: (id: DutyId, payload: DutyTemplateItemUpdateParam) => Promise<DutyTemplateItemVO>;
  deleteDutyTemplateItem: (id: DutyId) => Promise<void>;
  listDutyLegalClauses: (params: DutyLegalClauseQueryParam) => Promise<DutyLegalClauseVO[]>;
  listDutyLawNames: () => Promise<DutyLawNameVO[]>;
  listDutyEvidenceSourceOptions: (params?: DutyEvidenceSourceOptionQueryParam) => Promise<DutyEvidenceSourceOptionVO[]>;
  checkDutyTemplateItemDuplicate: (payload: DutyTemplateItemDuplicateCheckParam) => Promise<DutyTemplateDuplicateCheckVO>;
  createDutyTemplateVersion: (payload: DutyTemplateVersionCreateParam) => Promise<DutyTemplateVersionVO>;
  listDutyTemplateVersions: (id: number) => Promise<DutyTemplateVersionVO[]>;
  rollbackDutyTemplateVersion: (payload: DutyTemplateVersionRollbackParam) => Promise<DutyTemplateVersionVO>;

  getDutyAssignmentOverviewStatistics: (params?: DutyAssignmentOverviewStatParam) => Promise<DutyAssignmentOverviewStatVO>;
  listDutyAssignmentOverviewRoleGroups: (params?: DutyAssignmentOverviewRoleGroupParam) => Promise<DutyAssignmentOverviewRoleGroupVO[]>;
  pageDutyAssignments: (params: DutyAssignmentQueryParam) => Promise<Pagination<DutyAssignmentSummaryVO>>;
  getDutyAssignment: (id: number, params?: DutyAssignmentDetailParam) => Promise<DutyAssignmentDetailVO>;
  getCurrentDutyAssignment: (params?: DutyMyAssignmentCurrentParam) => Promise<DutyAssignmentDetailVO>;
  getDutyDispatchOptions: (params?: DutyDispatchOptionQueryParam) => Promise<DutyDispatchOptionVO>;
  pageDutyDispatches: (params: DutyDispatchQueryParam) => Promise<Pagination<DutyDispatchVO>>;
  createDutyDispatch: (payload: DutyDispatchCreateParam) => Promise<DutyDispatchVO>;
  pageDutySignatures: (dispatchId: number, params: DutySignatureQueryParam) => Promise<Pagination<DutySignatureVO>>;
  getDutySignatureTrackingStatistics: (params?: DutySignatureQueryParam) => Promise<DutySignatureTrackingStatVO>;
  getDutySignPreview: () => Promise<DutySignaturePreviewVO>;
  signDutyAssignment: (payload: DutySignatureCreateParam) => Promise<DutySignatureVO[]>;

  listDutyAssignmentItemRecords: (assignmentItemId: DutyId) => Promise<DutyRecordSummaryVO[]>;
  listCurrentDutyAssignmentItemRecords: (assignmentItemId: DutyId) => Promise<DutyRecordSummaryVO[]>;
  createDutyManualRecord: (payload: DutyRecordManualCreateParam) => Promise<DutyRecordVO>;
  getDutyRecord: (id: number) => Promise<DutyRecordDetailVO>;
  getCurrentDutyRecord: (id: number) => Promise<DutyRecordDetailVO>;

  listDutyReportTypes: (params?: DutyReportTypeQueryParam) => Promise<DutyReportTypeVO[]>;
  getDutyReportGenerateConfirmation: (params: DutyReportGenerateConfirmParam) => Promise<DutyReportGenerateConfirmVO>;
  pageDutyReportResponsibleUserCandidates: (
    params: DutyReportResponsibleUserCandidateQueryParam,
  ) => Promise<Pagination<DutyReportResponsibleUserCandidateVO>>;
  createDutyReport: (payload: DutyReportGenerateParam) => Promise<DutyReportVO>;
  pageDutyReports: (params: DutyReportQueryParam) => Promise<Pagination<DutyReportVO>>;
  getDutyReport: (id: DutyId) => Promise<DutyReportDetailVO>;
  confirmDutyReportSignature: (id: DutyId, payload: DutyReportSignatureConfirmParam) => Promise<DutyReportVO>;
  listDutyReportMappings: (id: DutyId, params?: DutyReportMappingQueryParam) => Promise<DutyReportMappingVO[]>;
  getDutyReportMapping: (id: DutyId, mappingId: DutyId) => Promise<DutyReportMappingDetailVO>;
  listDutyReportMappingEvidences: (id: DutyId, mappingId: DutyId, params?: DutyReportEvidenceQueryParam) => Promise<DutyReportEvidenceVO[]>;
  getDutyReportGapDetail: (id: DutyId, mappingId: DutyId) => Promise<DutyReportGapDetailVO>;
  listDutyReportEvidences: (id: DutyId, params?: DutyReportEvidenceQueryParam) => Promise<DutyReportEvidenceVO[]>;
  pageCurrentDutyReports: (params: DutyReportQueryParam) => Promise<Pagination<DutyReportVO>>;
  getCurrentDutyReport: (id: DutyId) => Promise<DutyReportDetailVO>;
  listCurrentDutyReportMappings: (id: DutyId, params?: DutyReportMappingQueryParam) => Promise<DutyReportMappingVO[]>;
  getCurrentDutyReportMapping: (id: DutyId, mappingId: DutyId) => Promise<DutyReportMappingDetailVO>;
  listCurrentDutyReportMappingEvidences: (
    id: DutyId,
    mappingId: DutyId,
    params?: DutyReportEvidenceQueryParam,
  ) => Promise<DutyReportEvidenceVO[]>;
  getCurrentDutyReportGapDetail: (id: DutyId, mappingId: DutyId) => Promise<DutyReportGapDetailVO>;
  listCurrentDutyReportEvidences: (id: DutyId, params?: DutyReportEvidenceQueryParam) => Promise<DutyReportEvidenceVO[]>;

  getDutyScoreModel: (params?: DutyScoreModelQueryParam) => Promise<DutyScoreModelVO>;
  saveDutyScoreModel: (payload: DutyScoreModelSaveParam) => Promise<DutyScoreModelVO>;
  getDutyScoreDashboardSummary: (params?: DutyScoreDashboardQueryParam) => Promise<DutyScoreDashboardSummaryVO>;
  listDutyScoreDepartmentSummaries: (params?: DutyScoreDashboardQueryParam) => Promise<DutyScoreDepartmentSummaryVO[]>;
  pageDutyScoreRankings: (params: DutyScoreRankingQueryParam) => Promise<Pagination<DutyScoreRankingItemVO>>;
  exportDutyScoreRankings: (payload: DutyScoreRankingExportParam) => Promise<Blob>;
  getDutyPersonalScoreReport: (userId: DutyId, params?: DutyScorePeriodParam) => Promise<DutyPersonalScoreReportVO>;
  getDutyAppPersonalScoreReport: (params?: DutyAppScoreReportParam) => Promise<DutyAppPersonalScoreReportVO>;
  getDutyScorePublicity: (params?: DutyScorePublicityQueryParam) => Promise<DutyScorePublicityVO>;
  pageDutyScorePublicityRankings: (params: DutyScorePublicityRankingQueryParam) => Promise<Pagination<DutyScorePublicityRankingItemVO>>;
  getDutyAppScorePublicity: (params?: DutyAppScorePublicityParam) => Promise<DutyAppScorePublicityVO>;
  listDutyScoreNotifyTargets: (params?: DutyScoreNotifyTargetQueryParam) => Promise<DutyScoreNotifyTargetVO[]>;
  saveDutyScoreNotifyTargets: (payload: DutyScoreNotifyTargetSaveParam) => Promise<DutyScoreNotifyTargetVO[]>;
  pageDutyScoreNotifyTargetCandidates: (
    params: DutyScoreNotifyTargetCandidateQueryParam,
  ) => Promise<Pagination<DutyScoreNotifyTargetCandidateVO>>;
  getDutyAppScoreDashboard: (params?: DutyAppScoreDashboardParam) => Promise<DutyAppScoreDashboardVO>;
}
