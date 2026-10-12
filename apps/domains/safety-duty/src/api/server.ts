import { getSafetyDutyClient } from "../domain-context";
export const createDutyManualRecord: ReturnType<typeof getSafetyDutyClient>["createDutyManualRecord"] = (...args) =>
  getSafetyDutyClient().createDutyManualRecord(...args);
export const createDutyReport: ReturnType<typeof getSafetyDutyClient>["createDutyReport"] = (...args) =>
  getSafetyDutyClient().createDutyReport(...args);
export const createDutyTemplateItem: ReturnType<typeof getSafetyDutyClient>["createDutyTemplateItem"] = (...args) =>
  getSafetyDutyClient().createDutyTemplateItem(...args);
export const createDutyTemplateItems: ReturnType<typeof getSafetyDutyClient>["createDutyTemplateItems"] = (...args) =>
  getSafetyDutyClient().createDutyTemplateItems(...args);
export const deleteDutyTemplateItem: ReturnType<typeof getSafetyDutyClient>["deleteDutyTemplateItem"] = (...args) =>
  getSafetyDutyClient().deleteDutyTemplateItem(...args);
export const exportDutyScoreRankings: ReturnType<typeof getSafetyDutyClient>["exportDutyScoreRankings"] = (...args) =>
  getSafetyDutyClient().exportDutyScoreRankings(...args);
export const getCurrentDutyAssignment: ReturnType<typeof getSafetyDutyClient>["getCurrentDutyAssignment"] = (...args) =>
  getSafetyDutyClient().getCurrentDutyAssignment(...args);
export const getDutyAppPersonalScoreReport: ReturnType<typeof getSafetyDutyClient>["getDutyAppPersonalScoreReport"] = (...args) =>
  getSafetyDutyClient().getDutyAppPersonalScoreReport(...args);
export const getDutyAssignment: ReturnType<typeof getSafetyDutyClient>["getDutyAssignment"] = (...args) =>
  getSafetyDutyClient().getDutyAssignment(...args);
export const getDutyAssignmentOverviewStatistics: ReturnType<typeof getSafetyDutyClient>["getDutyAssignmentOverviewStatistics"] = (
  ...args
) => getSafetyDutyClient().getDutyAssignmentOverviewStatistics(...args);
export const getDutyDispatchOptions: ReturnType<typeof getSafetyDutyClient>["getDutyDispatchOptions"] = (...args) =>
  getSafetyDutyClient().getDutyDispatchOptions(...args);
export const getDutyPersonalScoreReport: ReturnType<typeof getSafetyDutyClient>["getDutyPersonalScoreReport"] = (...args) =>
  getSafetyDutyClient().getDutyPersonalScoreReport(...args);
export const getDutyReport: ReturnType<typeof getSafetyDutyClient>["getDutyReport"] = (...args) =>
  getSafetyDutyClient().getDutyReport(...args);
export const getDutyReportGapDetail: ReturnType<typeof getSafetyDutyClient>["getDutyReportGapDetail"] = (...args) =>
  getSafetyDutyClient().getDutyReportGapDetail(...args);
export const getDutyReportMapping: ReturnType<typeof getSafetyDutyClient>["getDutyReportMapping"] = (...args) =>
  getSafetyDutyClient().getDutyReportMapping(...args);
export const getDutyScoreDashboardSummary: ReturnType<typeof getSafetyDutyClient>["getDutyScoreDashboardSummary"] = (...args) =>
  getSafetyDutyClient().getDutyScoreDashboardSummary(...args);
export const getDutyScoreModel: ReturnType<typeof getSafetyDutyClient>["getDutyScoreModel"] = (...args) =>
  getSafetyDutyClient().getDutyScoreModel(...args);
export const getDutyScorePublicity: ReturnType<typeof getSafetyDutyClient>["getDutyScorePublicity"] = (...args) =>
  getSafetyDutyClient().getDutyScorePublicity(...args);
export const getDutySignPreview: ReturnType<typeof getSafetyDutyClient>["getDutySignPreview"] = (...args) =>
  getSafetyDutyClient().getDutySignPreview(...args);
export const getDutySignatureTrackingStatistics: ReturnType<typeof getSafetyDutyClient>["getDutySignatureTrackingStatistics"] = (...args) =>
  getSafetyDutyClient().getDutySignatureTrackingStatistics(...args);
export const getDutyTemplateItemStatistics: ReturnType<typeof getSafetyDutyClient>["getDutyTemplateItemStatistics"] = (...args) =>
  getSafetyDutyClient().getDutyTemplateItemStatistics(...args);
export const listCurrentDutyAssignmentItemRecords: ReturnType<typeof getSafetyDutyClient>["listCurrentDutyAssignmentItemRecords"] = (
  ...args
) => getSafetyDutyClient().listCurrentDutyAssignmentItemRecords(...args);
export const listDutyAssignmentItemRecords: ReturnType<typeof getSafetyDutyClient>["listDutyAssignmentItemRecords"] = (...args) =>
  getSafetyDutyClient().listDutyAssignmentItemRecords(...args);
export const listDutyAssignmentOverviewRoleGroups: ReturnType<typeof getSafetyDutyClient>["listDutyAssignmentOverviewRoleGroups"] = (
  ...args
) => getSafetyDutyClient().listDutyAssignmentOverviewRoleGroups(...args);
export const listDutyEvidenceSourceOptions: ReturnType<typeof getSafetyDutyClient>["listDutyEvidenceSourceOptions"] = (...args) =>
  getSafetyDutyClient().listDutyEvidenceSourceOptions(...args);
export const listDutyLegalClauses: ReturnType<typeof getSafetyDutyClient>["listDutyLegalClauses"] = (...args) =>
  getSafetyDutyClient().listDutyLegalClauses(...args);
export const listDutyRoleAssignments: ReturnType<typeof getSafetyDutyClient>["listDutyRoleAssignments"] = (...args) =>
  getSafetyDutyClient().listDutyRoleAssignments(...args);
export const listDutyScoreDepartmentSummaries: ReturnType<typeof getSafetyDutyClient>["listDutyScoreDepartmentSummaries"] = (...args) =>
  getSafetyDutyClient().listDutyScoreDepartmentSummaries(...args);
export const listDutyScoreNotifyTargets: ReturnType<typeof getSafetyDutyClient>["listDutyScoreNotifyTargets"] = (...args) =>
  getSafetyDutyClient().listDutyScoreNotifyTargets(...args);
export const pageDutyAssignments: ReturnType<typeof getSafetyDutyClient>["pageDutyAssignments"] = (...args) =>
  getSafetyDutyClient().pageDutyAssignments(...args);
export const pageDutyReports: ReturnType<typeof getSafetyDutyClient>["pageDutyReports"] = (...args) =>
  getSafetyDutyClient().pageDutyReports(...args);
export const pageDutyRoleUserCandidates: ReturnType<typeof getSafetyDutyClient>["pageDutyRoleUserCandidates"] = (...args) =>
  getSafetyDutyClient().pageDutyRoleUserCandidates(...args);
export const pageDutyScoreNotifyTargetCandidates: ReturnType<typeof getSafetyDutyClient>["pageDutyScoreNotifyTargetCandidates"] = (
  ...args
) => getSafetyDutyClient().pageDutyScoreNotifyTargetCandidates(...args);
export const pageDutyScorePublicityRankings: ReturnType<typeof getSafetyDutyClient>["pageDutyScorePublicityRankings"] = (...args) =>
  getSafetyDutyClient().pageDutyScorePublicityRankings(...args);
export const pageDutyScoreRankings: ReturnType<typeof getSafetyDutyClient>["pageDutyScoreRankings"] = (...args) =>
  getSafetyDutyClient().pageDutyScoreRankings(...args);
export const pageDutyTemplateItems: ReturnType<typeof getSafetyDutyClient>["pageDutyTemplateItems"] = (...args) =>
  getSafetyDutyClient().pageDutyTemplateItems(...args);
export const saveDutyRoleAssignments: ReturnType<typeof getSafetyDutyClient>["saveDutyRoleAssignments"] = (...args) =>
  getSafetyDutyClient().saveDutyRoleAssignments(...args);
export const saveDutyScoreModel: ReturnType<typeof getSafetyDutyClient>["saveDutyScoreModel"] = (...args) =>
  getSafetyDutyClient().saveDutyScoreModel(...args);
export const saveDutyScoreNotifyTargets: ReturnType<typeof getSafetyDutyClient>["saveDutyScoreNotifyTargets"] = (...args) =>
  getSafetyDutyClient().saveDutyScoreNotifyTargets(...args);
export const signDutyAssignment: ReturnType<typeof getSafetyDutyClient>["signDutyAssignment"] = (...args) =>
  getSafetyDutyClient().signDutyAssignment(...args);
export const updateDutyTemplateItem: ReturnType<typeof getSafetyDutyClient>["updateDutyTemplateItem"] = (...args) =>
  getSafetyDutyClient().updateDutyTemplateItem(...args);
