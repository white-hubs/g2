/**
 * 领域页面只经 DomainContext 取得风险管控 Client，避免保留旧仓全局 service 单例。
 */
import type { RiskGradedControlClient } from "@g2-client/risk-graded-control/client";

import { getRiskGradedControlClient } from "../domain-context";

const proxy = new Proxy({} as RiskGradedControlClient, {
  get(_target, property) {
    const client = getRiskGradedControlClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[property];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const riskGradedControlService = proxy;

export const getDispatchMapConfig = (...args: Parameters<RiskGradedControlClient["getDispatchMapConfig"]>) =>
  proxy.getDispatchMapConfig(...args);
export const getMapServiceConfig = (...args: Parameters<RiskGradedControlClient["getMapServiceConfig"]>) =>
  proxy.getMapServiceConfig(...args);

export const getPropertyDetailedPage = (...args: Parameters<RiskGradedControlClient["getPropertyDetailedPage"]>) =>
  proxy.getPropertyDetailedPage(...args);
export const getPropertyDetail = (...args: Parameters<RiskGradedControlClient["getPropertyDetail"]>) => proxy.getPropertyDetail(...args);
export const getMessageConfig = (...args: Parameters<RiskGradedControlClient["getMessageConfig"]>) => proxy.getMessageConfig(...args);
export const addMessageConfig = (...args: Parameters<RiskGradedControlClient["addMessageConfig"]>) => proxy.addMessageConfig(...args);
export const sceneNotificationMethod = (...args: Parameters<RiskGradedControlClient["sceneNotificationMethod"]>) =>
  proxy.sceneNotificationMethod(...args);

export const pageUnitTypes = (...args: Parameters<RiskGradedControlClient["pageUnitTypes"]>) => proxy.pageUnitTypes(...args);
export const createUnitType = (...args: Parameters<RiskGradedControlClient["createUnitType"]>) => proxy.createUnitType(...args);
export const getUnitType = (...args: Parameters<RiskGradedControlClient["getUnitType"]>) => proxy.getUnitType(...args);
export const updateUnitType = (...args: Parameters<RiskGradedControlClient["updateUnitType"]>) => proxy.updateUnitType(...args);
export const deleteUnitType = (...args: Parameters<RiskGradedControlClient["deleteUnitType"]>) => proxy.deleteUnitType(...args);
export const pageWarningSigns = (...args: Parameters<RiskGradedControlClient["pageWarningSigns"]>) => proxy.pageWarningSigns(...args);
export const listWarningSignOptions = (...args: Parameters<RiskGradedControlClient["listWarningSignOptions"]>) =>
  proxy.listWarningSignOptions(...args);
export const createWarningSign = (...args: Parameters<RiskGradedControlClient["createWarningSign"]>) => proxy.createWarningSign(...args);
export const getWarningSign = (...args: Parameters<RiskGradedControlClient["getWarningSign"]>) => proxy.getWarningSign(...args);
export const updateWarningSign = (...args: Parameters<RiskGradedControlClient["updateWarningSign"]>) => proxy.updateWarningSign(...args);
export const updateWarningSignEnabled = (...args: Parameters<RiskGradedControlClient["updateWarningSignEnabled"]>) =>
  proxy.updateWarningSignEnabled(...args);
export const deleteWarningSign = (...args: Parameters<RiskGradedControlClient["deleteWarningSign"]>) => proxy.deleteWarningSign(...args);
export const pageAssessmentMethods = (...args: Parameters<RiskGradedControlClient["pageAssessmentMethods"]>) =>
  proxy.pageAssessmentMethods(...args);
export const createAssessmentMethod = (...args: Parameters<RiskGradedControlClient["createAssessmentMethod"]>) =>
  proxy.createAssessmentMethod(...args);
export const getAssessmentMethod = (...args: Parameters<RiskGradedControlClient["getAssessmentMethod"]>) =>
  proxy.getAssessmentMethod(...args);
export const updateAssessmentMethod = (...args: Parameters<RiskGradedControlClient["updateAssessmentMethod"]>) =>
  proxy.updateAssessmentMethod(...args);
export const patchAssessmentMethod = (...args: Parameters<RiskGradedControlClient["patchAssessmentMethod"]>) =>
  proxy.patchAssessmentMethod(...args);
export const deleteAssessmentMethod = (...args: Parameters<RiskGradedControlClient["deleteAssessmentMethod"]>) =>
  proxy.deleteAssessmentMethod(...args);
export const pageRiskObjects = (...args: Parameters<RiskGradedControlClient["pageRiskObjects"]>) => proxy.pageRiskObjects(...args);
export const getRiskObject = (...args: Parameters<RiskGradedControlClient["getRiskObject"]>) => proxy.getRiskObject(...args);
export const generateRiskObjectByAiPhoto = (...args: Parameters<RiskGradedControlClient["generateRiskObjectByAiPhoto"]>) =>
  proxy.generateRiskObjectByAiPhoto(...args);
export const reviseRiskObjectByAiPhoto = (...args: Parameters<RiskGradedControlClient["reviseRiskObjectByAiPhoto"]>) =>
  proxy.reviseRiskObjectByAiPhoto(...args);
export const pageAssessmentTasks = (...args: Parameters<RiskGradedControlClient["pageAssessmentTasks"]>) =>
  proxy.pageAssessmentTasks(...args);
export const listObjectAssessments = (...args: Parameters<RiskGradedControlClient["listObjectAssessments"]>) =>
  proxy.listObjectAssessments(...args);
export const createAssessment = (...args: Parameters<RiskGradedControlClient["createAssessment"]>) => proxy.createAssessment(...args);
export const patchAssessment = (...args: Parameters<RiskGradedControlClient["patchAssessment"]>) => proxy.patchAssessment(...args);
export const pageReviewTasks = (...args: Parameters<RiskGradedControlClient["pageReviewTasks"]>) => proxy.pageReviewTasks(...args);
export const getReviewTask = (...args: Parameters<RiskGradedControlClient["getReviewTask"]>) => proxy.getReviewTask(...args);
export const createReviews = (...args: Parameters<RiskGradedControlClient["createReviews"]>) => proxy.createReviews(...args);
export const submitUnitIdentification = (...args: Parameters<RiskGradedControlClient["submitUnitIdentification"]>) =>
  proxy.submitUnitIdentification(...args);
export const pageIdentificationUnits = (...args: Parameters<RiskGradedControlClient["pageIdentificationUnits"]>) =>
  proxy.pageIdentificationUnits(...args);
export const pageIdentifications = (...args: Parameters<RiskGradedControlClient["pageIdentifications"]>) =>
  proxy.pageIdentifications(...args);
export const getIdentification = (...args: Parameters<RiskGradedControlClient["getIdentification"]>) => proxy.getIdentification(...args);
export const pageMeasureExecutions = (...args: Parameters<RiskGradedControlClient["pageMeasureExecutions"]>) =>
  proxy.pageMeasureExecutions(...args);
export const exportMeasureExecutions = (...args: Parameters<RiskGradedControlClient["exportMeasureExecutions"]>) =>
  proxy.exportMeasureExecutions(...args);
export const createMeasureExecutionRecord = (...args: Parameters<RiskGradedControlClient["createMeasureExecutionRecord"]>) =>
  proxy.createMeasureExecutionRecord(...args);
export const syncMeasureExecutionBatch = (...args: Parameters<RiskGradedControlClient["syncMeasureExecutionBatch"]>) =>
  proxy.syncMeasureExecutionBatch(...args);
export const pageControlMeasures = (...args: Parameters<RiskGradedControlClient["pageControlMeasures"]>) =>
  proxy.pageControlMeasures(...args);
export const exportControlMeasures = (...args: Parameters<RiskGradedControlClient["exportControlMeasures"]>) =>
  proxy.exportControlMeasures(...args);
export const listObjectControlMeasures = (...args: Parameters<RiskGradedControlClient["listObjectControlMeasures"]>) =>
  proxy.listObjectControlMeasures(...args);
export const saveObjectControlMeasures = (...args: Parameters<RiskGradedControlClient["saveObjectControlMeasures"]>) =>
  proxy.saveObjectControlMeasures(...args);
export const getControlMeasure = (...args: Parameters<RiskGradedControlClient["getControlMeasure"]>) => proxy.getControlMeasure(...args);
export const generateControlMeasuresByAi = (...args: Parameters<RiskGradedControlClient["generateControlMeasuresByAi"]>) =>
  proxy.generateControlMeasuresByAi(...args);
export const pageReviewReports = (...args: Parameters<RiskGradedControlClient["pageReviewReports"]>) => proxy.pageReviewReports(...args);
export const getReviewReport = (...args: Parameters<RiskGradedControlClient["getReviewReport"]>) => proxy.getReviewReport(...args);
export const generateReviewReport = (...args: Parameters<RiskGradedControlClient["generateReviewReport"]>) =>
  proxy.generateReviewReport(...args);
export const recheckReviewReport = (...args: Parameters<RiskGradedControlClient["recheckReviewReport"]>) =>
  proxy.recheckReviewReport(...args);
export const createReviewReportDraft = (...args: Parameters<RiskGradedControlClient["createReviewReportDraft"]>) =>
  proxy.createReviewReportDraft(...args);
export const saveReviewReportDraft = (...args: Parameters<RiskGradedControlClient["saveReviewReportDraft"]>) =>
  proxy.saveReviewReportDraft(...args);
export const submitNewReviewReport = (...args: Parameters<RiskGradedControlClient["submitNewReviewReport"]>) =>
  proxy.submitNewReviewReport(...args);
export const submitReviewReport = (...args: Parameters<RiskGradedControlClient["submitReviewReport"]>) => proxy.submitReviewReport(...args);
export const pageAssessmentPlans = (...args: Parameters<RiskGradedControlClient["pageAssessmentPlans"]>) =>
  proxy.pageAssessmentPlans(...args);
export const createAssessmentPlan = (...args: Parameters<RiskGradedControlClient["createAssessmentPlan"]>) =>
  proxy.createAssessmentPlan(...args);
export const getAssessmentPlan = (...args: Parameters<RiskGradedControlClient["getAssessmentPlan"]>) => proxy.getAssessmentPlan(...args);
export const updateAssessmentPlan = (...args: Parameters<RiskGradedControlClient["updateAssessmentPlan"]>) =>
  proxy.updateAssessmentPlan(...args);
export const patchAssessmentPlan = (...args: Parameters<RiskGradedControlClient["patchAssessmentPlan"]>) =>
  proxy.patchAssessmentPlan(...args);
export const deleteAssessmentPlan = (...args: Parameters<RiskGradedControlClient["deleteAssessmentPlan"]>) =>
  proxy.deleteAssessmentPlan(...args);
export const pageWarningRules = (...args: Parameters<RiskGradedControlClient["pageWarningRules"]>) => proxy.pageWarningRules(...args);
export const createWarningRule = (...args: Parameters<RiskGradedControlClient["createWarningRule"]>) => proxy.createWarningRule(...args);
export const getWarningRule = (...args: Parameters<RiskGradedControlClient["getWarningRule"]>) => proxy.getWarningRule(...args);
export const updateWarningRule = (...args: Parameters<RiskGradedControlClient["updateWarningRule"]>) => proxy.updateWarningRule(...args);
export const patchWarningRule = (...args: Parameters<RiskGradedControlClient["patchWarningRule"]>) => proxy.patchWarningRule(...args);
export const deleteWarningRule = (...args: Parameters<RiskGradedControlClient["deleteWarningRule"]>) => proxy.deleteWarningRule(...args);
export const pageWarningRecords = (...args: Parameters<RiskGradedControlClient["pageWarningRecords"]>) => proxy.pageWarningRecords(...args);
export const exportWarningRecords = (...args: Parameters<RiskGradedControlClient["exportWarningRecords"]>) =>
  proxy.exportWarningRecords(...args);
export const getWarningRecord = (...args: Parameters<RiskGradedControlClient["getWarningRecord"]>) => proxy.getWarningRecord(...args);
export const patchWarningRecord = (...args: Parameters<RiskGradedControlClient["patchWarningRecord"]>) => proxy.patchWarningRecord(...args);
export const pageUnitInventory = (...args: Parameters<RiskGradedControlClient["pageUnitInventory"]>) => proxy.pageUnitInventory(...args);
export const exportUnitInventory = (...args: Parameters<RiskGradedControlClient["exportUnitInventory"]>) =>
  proxy.exportUnitInventory(...args);
export const listUnitInventoryObjects = (...args: Parameters<RiskGradedControlClient["listUnitInventoryObjects"]>) =>
  proxy.listUnitInventoryObjects(...args);
export const pageNoticeCards = (...args: Parameters<RiskGradedControlClient["pageNoticeCards"]>) => proxy.pageNoticeCards(...args);
export const exportNoticeCards = (...args: Parameters<RiskGradedControlClient["exportNoticeCards"]>) => proxy.exportNoticeCards(...args);
export const getNoticeCard = (...args: Parameters<RiskGradedControlClient["getNoticeCard"]>) => proxy.getNoticeCard(...args);
export const getFourColorMapStatistics = (...args: Parameters<RiskGradedControlClient["getFourColorMapStatistics"]>) =>
  proxy.getFourColorMapStatistics(...args);
export const pageFourColorMapUnits = (...args: Parameters<RiskGradedControlClient["pageFourColorMapUnits"]>) =>
  proxy.pageFourColorMapUnits(...args);
export const getFourColorMapUnit = (...args: Parameters<RiskGradedControlClient["getFourColorMapUnit"]>) =>
  proxy.getFourColorMapUnit(...args);
export const pageAreas = (...args: Parameters<RiskGradedControlClient["pageAreas"]>) => proxy.pageAreas(...args);
export const createArea = (...args: Parameters<RiskGradedControlClient["createArea"]>) => proxy.createArea(...args);
export const getArea = (...args: Parameters<RiskGradedControlClient["getArea"]>) => proxy.getArea(...args);
export const updateArea = (...args: Parameters<RiskGradedControlClient["updateArea"]>) => proxy.updateArea(...args);
export const deleteArea = (...args: Parameters<RiskGradedControlClient["deleteArea"]>) => proxy.deleteArea(...args);
export const pageUnits = (...args: Parameters<RiskGradedControlClient["pageUnits"]>) => proxy.pageUnits(...args);
export const exportUnits = (...args: Parameters<RiskGradedControlClient["exportUnits"]>) => proxy.exportUnits(...args);
export const createUnit = (...args: Parameters<RiskGradedControlClient["createUnit"]>) => proxy.createUnit(...args);
export const getUnit = (...args: Parameters<RiskGradedControlClient["getUnit"]>) => proxy.getUnit(...args);
export const updateUnit = (...args: Parameters<RiskGradedControlClient["updateUnit"]>) => proxy.updateUnit(...args);
export const deleteUnit = (...args: Parameters<RiskGradedControlClient["deleteUnit"]>) => proxy.deleteUnit(...args);
