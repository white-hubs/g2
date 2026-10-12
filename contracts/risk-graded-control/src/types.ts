/** 开河 risk-control 模块 API 类型（契约源，对齐后端具体 VO/Param） */

export type RiskLevelCode = "MAJOR" | "LARGE" | "GENERAL" | "LOW";

/** 用户引用对象（由 *UserId 解析，用于列表/详情返显） */
export interface RiskControlUserVO {
  userId?: string;
  userName?: string;
}

/** 部门引用对象（由 departmentId 解析，用于列表/详情返显） */
export interface RiskControlDepartmentVO {
  departmentId?: string;
  departmentName?: string;
}

/** 选项引用对象（区域、单元类型等；展示名称取 name） */
export interface RiskControlOptionVO {
  id?: number | string;
  code?: string;
  name?: string;
}

/** 安全警示标志引用对象（展示名称取 name） */
export interface RiskControlWarningSignRefVO {
  id?: number | string;
  name?: string;
  code?: string;
  signType?: string;
  iconFile?: RiskControlFileVO;
}

/** 文件服务回显对象（iconFile / files） */
export interface RiskControlFileVO {
  id?: number | string;
  name?: string;
  path?: string;
  endpointPath?: string;
  suffix?: string;
  size?: number;
  type?: string;
}

export interface RiskPageQuery {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  format?: string;
  status?: string;
  enabled?: boolean;
  unitId?: number | string;
  objectId?: number | string;
  reviewResult?: string;
  assessmentType?: string;
  executor?: string;
  riskLevel?: string;
  controlStatus?: string;
  departmentId?: string;
  areaId?: number | string;
  unitTypeId?: number | string;
  responsibleUserId?: string;
  severity?: string;
  warningStatus?: string;
  cycleType?: string;
  warningType?: string;
  signType?: string;
  /** @deprecated 单元列表筛选请使用 unitTypeId */
  type?: string;
  locationDesc?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export interface RiskAssessmentOptionVO {
  id?: number | string;
  code?: string;
  name?: string;
  score?: number;
}

export interface RiskAssessmentDimensionVO {
  id?: number | string;
  code?: string;
  name?: string;
  options?: RiskAssessmentOptionVO[];
}

export interface RiskAssessmentLevelRuleVO {
  riskLevel?: RiskLevelCode | string;
  color?: string;
  scoreRange?: string;
  minScore?: number;
  maxScore?: number;
  controlRequirement?: string;
}

export interface RiskUnitTypeVO {
  id?: number | string;
  code?: string;
  name?: string;
}
export interface RiskUnitTypeParam {
  code?: string;
  name?: string;
}

export interface RiskWarningSignVO {
  id?: number | string;
  code?: string;
  name?: string;
  type?: string;
  signType?: string;
  applicableScenario?: string;
  iconFileId?: string | number;
  iconFile?: RiskControlFileVO;
  enabled?: boolean;
}
export interface RiskWarningSignParam {
  code?: string;
  name?: string;
  signType?: string;
  applicableScenario?: string;
  iconFileId?: string | number;
  enabled?: boolean;
}

export interface RiskAreaVO {
  id?: number | string;
  code?: string;
  name?: string;
  departmentId?: string;
  department?: RiskControlDepartmentVO;
  ownerUserId?: string;
  ownerUser?: RiskControlUserVO;
  rangeDesc?: string;
  description?: string;
  gisGeometry?: string;
  inherentRiskLevel?: RiskLevelCode | string;
  controlRiskLevel?: RiskLevelCode | string;
  riskLevel?: RiskLevelCode | string;
  unitCount?: number;
  objectCount?: number;
}
export interface RiskAreaParam {
  code?: string;
  name?: string;
  departmentId?: string;
  ownerUserId?: string;
  rangeDesc?: string;
  description?: string;
  gisGeometry?: string;
}

export interface RiskUnitVO {
  id?: number | string;
  unitId?: number | string;
  code?: string;
  name?: string;
  unitName?: string;
  areaId?: number | string;
  area?: RiskControlOptionVO;
  unitTypeId?: number | string;
  unitType?: RiskControlOptionVO;
  type?: string;
  departmentId?: string;
  department?: RiskControlDepartmentVO;
  responsibleUserId?: string;
  responsibleUser?: RiskControlUserVO;
  identifierUserIds?: string[];
  identifierUsers?: RiskControlUserVO[];
  locationDesc?: string;
  description?: string;
  gisPoint?: string;
  gisGeometry?: string;
  longitude?: number | string;
  latitude?: number | string;
  warningSignId?: number | string;
  warningSign?: RiskControlWarningSignRefVO;
  signId?: number | string;
  identifyCycleDays?: number;
  identifyStatus?: string;
  status?: string;
  controlStatus?: string;
  currentIdentifyRoundNo?: string;
  lastIdentifySubmitTime?: string;
  lastIdentifyReviewTime?: string;
  nextIdentifyTime?: string;
  objectCount?: number;
  rejectedCount?: number;
  inherentRiskLevel?: RiskLevelCode | string;
  controlRiskLevel?: RiskLevelCode | string;
  riskLevel?: RiskLevelCode | string;
  /** 详情接口在辨识、评估与措施配置页面内联返回的风险对象。 */
  objects?: RiskObjectVO[];
}
export interface RiskUnitParam {
  code?: string;
  name?: string;
  unitTypeId?: number | string;
  areaId?: number | string;
  warningSignId?: number | string;
  description?: string;
  locationDesc?: string;
  identifyCycleDays?: number;
  identifierUserIds?: string[];
  responsibleUserId?: string;
  gisPoint?: string;
  longitude?: number | string;
  latitude?: number | string;
}

export interface RiskObjectVO {
  id?: number | string;
  objectId?: number | string;
  objectCode?: string;
  objectName?: string;
  code?: string;
  name?: string;
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  assetId?: number | string;
  responsibleUserId?: string;
  responsibleUser?: RiskControlUserVO;
  status?: string;
  inherentRiskLevel?: RiskLevelCode | string;
  controlRiskLevel?: RiskLevelCode | string;
  riskLevel?: RiskLevelCode | string;
  hazardDesc?: string;
  accidentTypes?: string;
  accidentCause?: string;
  triggerFactor?: string;
  emergencyMeasure?: string;
  identifyRoundNo?: string;
  measures?: RiskControlMeasureVO[];
}

export interface RiskAssessmentMethodVO {
  id?: number | string;
  code?: string;
  name?: string;
  formula?: string;
  enabled?: boolean;
  description?: string;
  dimensions?: RiskAssessmentDimensionVO[];
  levelRules?: RiskAssessmentLevelRuleVO[];
}
export interface RiskAssessmentMethodParam {
  code?: string;
  name?: string;
  formula?: string;
  enabled?: boolean;
  description?: string;
  dimensions?: RiskAssessmentDimensionVO[];
  levelRules?: RiskAssessmentLevelRuleVO[];
}

export interface RiskAssessmentTaskVO extends RiskUnitVO {
  completedCount?: number;
}
export interface RiskAssessmentRecordVO {
  id?: number | string;
  objectId?: number | string;
  methodId?: number | string;
  assessmentType?: string;
  totalScore?: number;
  riskLevel?: RiskLevelCode | string;
  methodSnapshotJson?: string;
  scoreDetailJson?: string;
  dimensionScores?: Record<string, number>;
  submitted?: boolean;
}
export interface RiskAssessmentParam {
  objectId?: number | string;
  methodId?: number | string;
  assessmentType?: string;
  dimensionScores?: Record<string, number>;
  submitted?: boolean;
}

export interface RiskReviewTaskVO extends RiskObjectVO {
  identifierUserId?: string;
  identifierUser?: RiskControlUserVO;
  submitTime?: string;
  userId?: string;
  reviewMode?: string;
  reviewBatchNo?: string;
  reviewResult?: string;
  rejectReason?: string;
  reviewComment?: string;
  reviewerUserId?: string;
  reviewerUser?: RiskControlUserVO;
  reviewTime?: string;
}
export interface RiskReviewRecordVO {
  id?: number | string;
  objectId?: number | string;
  identifyRoundNo?: string;
  reviewMode?: string;
  reviewBatchNo?: string;
  reviewResult?: string;
  rejectReason?: string;
  reviewComment?: string;
  reviewerUserId?: string;
  reviewerUser?: RiskControlUserVO;
  reviewTime?: string;
}
export interface RiskReviewCreateParam {
  objectId?: number | string;
  objectIds?: Array<number | string>;
  reviewResult?: string;
  rejectReason?: string;
  reviewComment?: string;
  userId?: string;
}

export interface RiskIdentificationUnitVO extends RiskUnitVO {
  submitTime?: string;
}
export interface RiskIdentificationHistoryVO extends RiskReviewTaskVO {
  operationType?: string;
  snapshotJson?: string;
  lastIdentifySubmitTime?: string;
  deleted?: boolean;
}

/** 辨识提交风险对象（RiskIdentificationObjectParam） */
export interface RiskIdentificationObjectParam {
  objectId?: number | string;
  code?: string;
  name?: string;
  assetId?: number | string;
  responsibleUserId?: string;
  hazardDesc?: string;
  accidentTypes?: string;
  accidentCause?: string;
  triggerFactor?: string;
  emergencyMeasure?: string;
  deleted?: boolean;
  userId?: string;
}

export interface RiskUnitIdentificationSubmitParam {
  objects?: RiskIdentificationObjectParam[];
  [key: string]: unknown;
}

export interface RiskControlMeasureVO {
  id?: number | string;
  measureId?: number | string;
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  objectId?: number | string;
  objectName?: string;
  name?: string;
  inherentRiskLevel?: RiskLevelCode | string;
  controlRiskLevel?: RiskLevelCode | string;
  riskLevel?: RiskLevelCode | string;
  controlType?: string;
  controlLevel?: string;
  content?: string;
  executorUserId?: string;
  executorUser?: RiskControlUserVO;
  deadline?: string;
  executionStatus?: string;
  executionResult?: string;
  executionDesc?: string;
  executionTime?: string;
  gpsLocation?: string;
  files?: RiskControlFileVO[];
  fileIds?: string[];
}
export interface RiskControlMeasureParam {
  id?: number | string;
  controlType?: string;
  controlLevel?: string;
  content?: string;
  executorUserId?: string;
  deadline?: string;
  fileIds?: string[];
}
export interface RiskMeasureExecutionRecordVO extends RiskControlMeasureVO {}
export interface RiskMeasureExecutionRecordParam {
  executionResult?: string;
  executionDesc?: string;
  executorUserId?: string;
  gpsLocation?: string;
  fileIds?: string[];
}
export interface RiskObjectMeasureSaveParam {
  measures?: RiskControlMeasureParam[];
  submitted?: boolean;
  [key: string]: unknown;
}

export interface RiskAiIdentificationObjectDraftVO {
  objectId?: number | string;
  name?: string;
  assetId?: number | string;
  assetName?: string;
  responsibleUserId?: string;
  responsibleUser?: RiskControlUserVO;
  hazardDesc?: string;
  accidentTypes?: string[] | string;
  accidentCause?: string;
  triggerFactor?: string;
  emergencyMeasure?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface RiskAiIdentificationPhotoParam {
  unitId?: number | string;
  fileId?: number | string;
  fileIds?: Array<number | string>;
  description?: string;
  context?: RiskIdentificationObjectParam;
  [key: string]: unknown;
}

export interface RiskAiIdentificationModifyParam {
  fileId?: number | string;
  fileIds?: Array<number | string>;
  description?: string;
  context?: RiskIdentificationObjectParam;
  [key: string]: unknown;
}

export interface RiskAiIdentificationAnalyzeVO {
  analysisRecordId?: number | string;
  object?: RiskIdentificationObjectParam;
  rawOutput?: unknown;
  [key: string]: unknown;
}

export interface RiskAiControlMeasureDraftVO {
  id?: number | string;
  controlType?: string;
  controlLevel?: string;
  content?: string;
  executorUserId?: string;
  executorUser?: RiskControlUserVO;
  deadline?: string;
  [key: string]: unknown;
}

export interface RiskAiControlMeasureGenerateParam {
  fileId?: number | string;
  fileIds?: Array<number | string>;
  requirement?: string;
  count?: number;
  existingMeasures?: RiskControlMeasureParam[];
  [key: string]: unknown;
}

export interface RiskAiControlMeasureAnalyzeVO {
  analysisRecordId?: number | string;
  measures?: RiskControlMeasureParam[];
  rawOutput?: unknown;
  [key: string]: unknown;
}

export interface RiskReviewReportEvidenceVO {
  id?: number | string;
  evidenceType?: string;
  evidenceId?: number | string;
  evidenceName?: string;
  sourceModule?: string;
  linkUrl?: string;
  details?: Array<Record<string, unknown>>;
  /** @deprecated 旧证据展示字段，请优先使用 evidenceName */
  label?: string;
  /** @deprecated 旧来源类型字段，请优先使用 sourceModule/evidenceType */
  sourceType?: string;
  /** @deprecated 旧来源 ID 字段，请优先使用 evidenceId */
  sourceId?: number | string;
  /** @deprecated 旧来源编号字段，请优先使用 evidenceId/evidenceName */
  sourceNo?: string;
  /** @deprecated 旧链接字段，请优先使用 linkUrl */
  url?: string;
  [key: string]: unknown;
}

export interface RiskReviewReportComplianceItemVO {
  id?: number | string;
  standard?: string;
  checkpoint?: string;
  conclusion?: string;
  aiGenerated?: boolean;
  manualRequired?: boolean;
  reviewComment?: string;
  evidences?: RiskReviewReportEvidenceVO[];
  /** @deprecated 旧标准字段，请优先使用 standard */
  standardId?: number | string;
  /** @deprecated 旧标准展示字段，请优先使用 standard */
  standardName?: string;
  /** @deprecated 旧条款字段，请优先使用 standard */
  clause?: string;
  /** @deprecated 旧人工复核人字段，报告复核结论请优先使用 reviewComment/manualRequired */
  manualReviewerId?: string;
  manualReviewer?: RiskControlUserVO;
  /** @deprecated 旧证据数组字段，请优先使用 evidences */
  evidence?: RiskReviewReportEvidenceVO[];
  /** @deprecated 旧证据文本字段，请优先使用 evidences */
  evidenceText?: string;
  issueDesc?: string;
  [key: string]: unknown;
}

export interface RiskReviewReportSummaryVO {
  unitTotal?: number;
  objectTotal?: number;
  majorRiskUnitCount?: number;
  largeRiskUnitCount?: number;
  generalRiskUnitCount?: number;
  lowRiskUnitCount?: number;
  measureCoveredObjectCount?: number;
  measureCoverageRate?: number;
  assessmentCompletedObjectCount?: number;
  assessmentCompletionRate?: number;
  assessmentPlanExecutionCount?: number;
  /** @deprecated 旧统计字段，请优先使用 unitTotal */
  unitCount?: number;
  /** @deprecated 旧统计字段，请优先使用 majorRiskUnitCount */
  majorCount?: number;
  /** @deprecated 旧统计字段，请优先使用 largeRiskUnitCount */
  largeCount?: number;
  /** @deprecated 旧统计字段，请优先使用 generalRiskUnitCount */
  generalCount?: number;
  /** @deprecated 旧统计字段，请优先使用 lowRiskUnitCount */
  lowCount?: number;
  /** @deprecated 隐患闭环统计已移至 hiddenDanger.closureRate */
  hiddenDangerClosureRate?: number;
  /** @deprecated 隐患超期统计已移至 hiddenDanger.overdueCount */
  overdueHiddenDangerCount?: number;
  [key: string]: unknown;
}

export interface RiskReviewReportHiddenDangerVO {
  totalCount?: number;
  activeCount?: number;
  closedCount?: number;
  overdueCount?: number;
  closureRate?: number;
  evidences?: RiskReviewReportEvidenceVO[];
  [key: string]: unknown;
}

export interface RiskReviewReportVO {
  id?: number | string;
  reportNo?: string;
  reportName?: string;
  name?: string;
  periodType?: string;
  periodName?: string;
  startDate?: string | number;
  endDate?: string | number;
  startTime?: string | number;
  endTime?: string | number;
  scopeType?: string;
  areaId?: number | string;
  areaName?: string;
  status?: string;
  generatedTime?: string | number;
  submittedTime?: string | number;
  submitterUserId?: string;
  submitterUser?: RiskControlUserVO;
  summary?: RiskReviewReportSummaryVO;
  complianceItems?: RiskReviewReportComplianceItemVO[];
  hiddenDanger?: RiskReviewReportHiddenDangerVO;
  suggestions?: string;
  contentJson?: string;
  degraded?: boolean;
  aiAnalysisRecordId?: number | string;
  [key: string]: unknown;
}

export interface RiskReviewReportParam {
  reportName?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
  scopeType?: string;
  areaId?: number | string;
  summary?: RiskReviewReportSummaryVO;
  complianceItems?: RiskReviewReportComplianceItemVO[];
  hiddenDanger?: RiskReviewReportHiddenDangerVO;
  suggestions?: string;
  contentJson?: string;
  degraded?: boolean;
  aiAnalysisRecordId?: number | string;
  [key: string]: unknown;
}

export interface RiskAssessmentPlanVO {
  id?: number | string;
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  objectName?: string;
  planName?: string;
  name?: string;
  cycleType?: string;
  nextExecuteTime?: string;
  lastExecuteTime?: string;
  status?: string;
  enabled?: boolean;
  notifyUserIds?: string[];
  notifyUsers?: RiskControlUserVO[];
}
export interface RiskAssessmentPlanParam {
  unitId?: number | string;
  planName?: string;
  cycleType?: string;
  nextExecuteTime?: string;
  notifyUserIds?: string[];
  enabled?: boolean;
}

export interface RiskWarningRuleVO {
  id?: number | string;
  ruleId?: number | string;
  name?: string;
  planName?: string;
  warningType?: string;
  conditionJson?: string;
  severity?: string;
  notifyChannels?: string;
  notifyUserIds?: string[];
  notifyUsers?: RiskControlUserVO[];
  disposeDeadlineDays?: number;
  enabled?: boolean;
}
export interface RiskWarningRuleParam {
  name?: string;
  warningType?: string;
  conditionJson?: string;
  notifyChannels?: string;
  notifyUserIds?: string[];
  disposeDeadlineDays?: number;
  enabled?: boolean;
}

export interface RiskWarningRecordVO {
  id?: number | string;
  ruleId?: number | string;
  unitId?: number | string;
  unitName?: string;
  unit?: RiskControlOptionVO;
  objectId?: number | string;
  objectCode?: string;
  objectName?: string;
  name?: string;
  warningType?: string;
  severity?: string;
  warningStatus?: string;
  triggerTime?: string;
  disposeTime?: string;
  disposeDesc?: string;
  disposeResult?: string;
  description?: string;
  content?: string;
  hazardDesc?: string;
}
export interface RiskWarningDisposeParam {
  disposeDesc?: string;
  disposeResult?: string;
  [key: string]: unknown;
}

export interface RiskUnitInventoryVO extends RiskUnitVO {
  measureCount?: number;
  completedMeasureCount?: number;
  hiddenDangerCount?: number;
  warningSigns?: RiskWarningSignVO[];
  objects?: RiskObjectVO[];
  measures?: RiskControlMeasureVO[];
}
export interface RiskFourColorUnitVO extends RiskUnitVO {
  departmentId?: string;
  department?: RiskControlDepartmentVO;
  responsibleUserId?: string;
  responsibleUser?: RiskControlUserVO;
}
export interface RiskNoticeCardVO extends RiskUnitInventoryVO {
  warningSign?: RiskWarningSignVO | RiskControlWarningSignRefVO;
  department?: RiskControlDepartmentVO;
  hazardDesc?: string;
  accidentTypes?: string;
  emergencyMeasure?: string;
}

export interface RiskEnabledParam {
  enabled?: boolean;
  [key: string]: unknown;
}
