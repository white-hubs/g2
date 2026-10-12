import type { Pagination } from "@g2-contract/base";

import type {
  RiskAreaParam,
  RiskAreaVO,
  RiskAssessmentMethodParam,
  RiskAssessmentMethodVO,
  RiskAssessmentParam,
  RiskAssessmentPlanParam,
  RiskAssessmentPlanVO,
  RiskAssessmentRecordVO,
  RiskAssessmentTaskVO,
  RiskAiControlMeasureAnalyzeVO,
  RiskAiControlMeasureGenerateParam,
  RiskAiIdentificationAnalyzeVO,
  RiskAiIdentificationModifyParam,
  RiskAiIdentificationPhotoParam,
  RiskControlMeasureParam,
  RiskControlMeasureVO,
  RiskEnabledParam,
  RiskFourColorUnitVO,
  RiskIdentificationHistoryVO,
  RiskIdentificationUnitVO,
  RiskMeasureExecutionRecordParam,
  RiskMeasureExecutionRecordVO,
  RiskNoticeCardVO,
  RiskObjectMeasureSaveParam,
  RiskObjectVO,
  RiskPageQuery,
  RiskReviewCreateParam,
  RiskReviewReportParam,
  RiskReviewReportVO,
  RiskReviewRecordVO,
  RiskReviewTaskVO,
  RiskUnitIdentificationSubmitParam,
  RiskUnitInventoryVO,
  RiskUnitParam,
  RiskUnitTypeParam,
  RiskUnitTypeVO,
  RiskUnitVO,
  RiskWarningDisposeParam,
  RiskWarningRecordVO,
  RiskWarningRuleParam,
  RiskWarningRuleVO,
  RiskWarningSignParam,
  RiskWarningSignVO,
} from "./types";

/** 风险分级管控 BFF 契约（1:1 透传开河 /risk-control 后端） */
export interface RiskGradedControlGateway {
  pageUnitTypes: (params?: RiskPageQuery) => Promise<Pagination<RiskUnitTypeVO>>;
  createUnitType: (payload: RiskUnitTypeParam) => Promise<RiskUnitTypeVO>;
  getUnitType: (id: string | number) => Promise<RiskUnitTypeVO>;
  updateUnitType: (id: string | number, payload: RiskUnitTypeParam) => Promise<RiskUnitTypeVO>;
  deleteUnitType: (id: string | number) => Promise<void>;
  pageWarningSigns: (params?: RiskPageQuery) => Promise<Pagination<RiskWarningSignVO>>;
  listWarningSignOptions: (params?: RiskPageQuery) => Promise<Pagination<RiskWarningSignVO>>;
  createWarningSign: (payload: RiskWarningSignParam) => Promise<RiskWarningSignVO>;
  getWarningSign: (id: string | number) => Promise<RiskWarningSignVO>;
  updateWarningSign: (id: string | number, payload: RiskWarningSignParam) => Promise<RiskWarningSignVO>;
  updateWarningSignEnabled: (id: string | number, payload: RiskEnabledParam) => Promise<RiskWarningSignVO>;
  deleteWarningSign: (id: string | number) => Promise<void>;
  pageAssessmentMethods: (params?: RiskPageQuery) => Promise<Pagination<RiskAssessmentMethodVO>>;
  createAssessmentMethod: (payload: RiskAssessmentMethodParam) => Promise<RiskAssessmentMethodVO>;
  getAssessmentMethod: (id: string | number) => Promise<RiskAssessmentMethodVO>;
  updateAssessmentMethod: (id: string | number, payload: RiskAssessmentMethodParam) => Promise<RiskAssessmentMethodVO>;
  patchAssessmentMethod: (id: string | number, payload: RiskEnabledParam) => Promise<RiskAssessmentMethodVO>;
  deleteAssessmentMethod: (id: string | number) => Promise<void>;
  pageRiskObjects: (params?: RiskPageQuery) => Promise<Pagination<RiskObjectVO>>;
  getRiskObject: (objectId: string | number) => Promise<RiskObjectVO>;
  generateRiskObjectByAiPhoto: (payload: RiskAiIdentificationPhotoParam) => Promise<RiskAiIdentificationAnalyzeVO>;
  reviseRiskObjectByAiPhoto: (
    objectId: string | number,
    payload: RiskAiIdentificationModifyParam,
  ) => Promise<RiskAiIdentificationAnalyzeVO>;
  pageAssessmentTasks: (params?: RiskPageQuery) => Promise<Pagination<RiskAssessmentTaskVO>>;
  listObjectAssessments: (objectId: string | number, params?: RiskPageQuery) => Promise<Pagination<RiskAssessmentRecordVO>>;
  createAssessment: (payload: RiskAssessmentParam) => Promise<RiskAssessmentRecordVO>;
  patchAssessment: (id: string | number, payload: RiskAssessmentParam) => Promise<RiskAssessmentRecordVO>;
  pageReviewTasks: (params?: RiskPageQuery) => Promise<Pagination<RiskReviewTaskVO>>;
  getReviewTask: (objectId: string | number) => Promise<RiskReviewTaskVO>;
  createReviews: (payload: RiskReviewCreateParam) => Promise<RiskReviewRecordVO[]>;
  submitUnitIdentification: (unitId: string | number, payload: RiskUnitIdentificationSubmitParam) => Promise<RiskReviewRecordVO[]>;
  pageIdentificationUnits: (params?: RiskPageQuery) => Promise<Pagination<RiskIdentificationUnitVO>>;
  pageIdentifications: (params?: RiskPageQuery) => Promise<Pagination<RiskIdentificationHistoryVO>>;
  getIdentification: (id: string | number) => Promise<RiskIdentificationHistoryVO>;
  pageMeasureExecutions: (params?: RiskPageQuery) => Promise<Pagination<RiskControlMeasureVO>>;
  createMeasureExecutionRecord: (
    measureId: string | number,
    payload: RiskMeasureExecutionRecordParam,
  ) => Promise<RiskMeasureExecutionRecordVO>;
  syncMeasureExecutionBatch: (payload: RiskControlMeasureParam[]) => Promise<RiskControlMeasureVO>;
  pageControlMeasures: (params?: RiskPageQuery) => Promise<Pagination<RiskControlMeasureVO>>;
  listObjectControlMeasures: (objectId: string | number, params?: RiskPageQuery) => Promise<Pagination<RiskControlMeasureVO>>;
  saveObjectControlMeasures: (objectId: string | number, payload: RiskObjectMeasureSaveParam) => Promise<RiskControlMeasureVO[]>;
  getControlMeasure: (measureId: string | number) => Promise<RiskControlMeasureVO>;
  generateControlMeasuresByAi: (
    objectId: string | number,
    payload: RiskAiControlMeasureGenerateParam,
  ) => Promise<RiskAiControlMeasureAnalyzeVO>;
  pageReviewReports: (params?: RiskPageQuery) => Promise<Pagination<RiskReviewReportVO>>;
  getReviewReport: (id: string | number) => Promise<RiskReviewReportVO>;
  generateReviewReport: (payload: RiskReviewReportParam) => Promise<RiskReviewReportVO>;
  recheckReviewReport: (id: string | number, payload?: RiskReviewReportParam) => Promise<RiskReviewReportVO>;
  createReviewReportDraft: (payload: RiskReviewReportParam) => Promise<RiskReviewReportVO>;
  saveReviewReportDraft: (id: string | number, payload: RiskReviewReportParam) => Promise<RiskReviewReportVO>;
  submitNewReviewReport: (payload: RiskReviewReportParam) => Promise<RiskReviewReportVO>;
  submitReviewReport: (id: string | number, payload?: RiskReviewReportParam) => Promise<RiskReviewReportVO>;
  pageAssessmentPlans: (params?: RiskPageQuery) => Promise<Pagination<RiskAssessmentPlanVO>>;
  createAssessmentPlan: (payload: RiskAssessmentPlanParam) => Promise<RiskAssessmentPlanVO>;
  getAssessmentPlan: (id: string | number) => Promise<RiskAssessmentPlanVO>;
  updateAssessmentPlan: (id: string | number, payload: RiskAssessmentPlanParam) => Promise<RiskAssessmentPlanVO>;
  patchAssessmentPlan: (id: string | number, payload: RiskEnabledParam) => Promise<RiskAssessmentPlanVO>;
  deleteAssessmentPlan: (id: string | number) => Promise<void>;
  pageWarningRules: (params?: RiskPageQuery) => Promise<Pagination<RiskWarningRuleVO>>;
  createWarningRule: (payload: RiskWarningRuleParam) => Promise<RiskWarningRuleVO>;
  getWarningRule: (id: string | number) => Promise<RiskWarningRuleVO>;
  updateWarningRule: (id: string | number, payload: RiskWarningRuleParam) => Promise<RiskWarningRuleVO>;
  patchWarningRule: (id: string | number, payload: RiskEnabledParam) => Promise<RiskWarningRuleVO>;
  deleteWarningRule: (id: string | number) => Promise<void>;
  pageWarningRecords: (params?: RiskPageQuery) => Promise<Pagination<RiskWarningRecordVO>>;
  getWarningRecord: (id: string | number) => Promise<RiskWarningRecordVO>;
  patchWarningRecord: (id: string | number, payload: RiskWarningDisposeParam) => Promise<RiskWarningRecordVO>;
  pageUnitInventory: (params?: RiskPageQuery) => Promise<Pagination<RiskUnitInventoryVO>>;
  listUnitInventoryObjects: (unitId: string | number, params?: RiskPageQuery) => Promise<Pagination<RiskObjectVO>>;
  pageNoticeCards: (params?: RiskPageQuery) => Promise<Pagination<RiskNoticeCardVO>>;
  getNoticeCard: (unitId: string | number) => Promise<RiskNoticeCardVO>;
  getFourColorMapStatistics: (params?: RiskPageQuery) => Promise<Record<string, number>>;
  pageFourColorMapUnits: (params?: RiskPageQuery) => Promise<Pagination<RiskFourColorUnitVO>>;
  getFourColorMapUnit: (unitId: string | number) => Promise<RiskFourColorUnitVO>;
  pageAreas: (params?: RiskPageQuery) => Promise<Pagination<RiskAreaVO>>;
  createArea: (payload: RiskAreaParam) => Promise<RiskAreaVO>;
  getArea: (id: string | number) => Promise<RiskAreaVO>;
  updateArea: (id: string | number, payload: RiskAreaParam) => Promise<RiskAreaVO>;
  deleteArea: (id: string | number) => Promise<void>;
  pageUnits: (params?: RiskPageQuery) => Promise<Pagination<RiskUnitVO>>;
  createUnit: (payload: RiskUnitParam) => Promise<RiskUnitVO>;
  getUnit: (id: string | number) => Promise<RiskUnitVO>;
  updateUnit: (id: string | number, payload: RiskUnitParam) => Promise<RiskUnitVO>;
  deleteUnit: (id: string | number) => Promise<void>;
}
