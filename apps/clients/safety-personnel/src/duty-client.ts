import type { DutyGateway } from "@g2-contract/safety-personnel";
interface DutyHttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
const DUTY = "/gw-bff/safety-personnel";
function withQuery(url: string, params?: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)));
    else query.set(key, String(value));
  }
  return query.size ? `${url}?${query}` : url;
}
/** Typed transport boundary; paths and query payloads match the safety-duty gateway. */
export function createDutyClient(http: DutyHttpClient) {
  return {
    listDutyRoleAssignments: async (
      ...[params]: Parameters<DutyGateway["listDutyRoleAssignments"]>
    ): ReturnType<DutyGateway["listDutyRoleAssignments"]> =>
      http.get(withQuery(`${DUTY}/duty-role-assignments`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyRoleAssignments"]
      >,
    pageDutyRoleUserCandidates: async (
      ...[params]: Parameters<DutyGateway["pageDutyRoleUserCandidates"]>
    ): ReturnType<DutyGateway["pageDutyRoleUserCandidates"]> =>
      http.get(withQuery(`${DUTY}/duty-role-assignment-user-candidates`, { ...params })) as ReturnType<
        DutyGateway["pageDutyRoleUserCandidates"]
      >,
    saveDutyRoleAssignments: async (
      ...[payload]: Parameters<DutyGateway["saveDutyRoleAssignments"]>
    ): ReturnType<DutyGateway["saveDutyRoleAssignments"]> =>
      http.put(`${DUTY}/duty-role-assignments`, { ...payload }) as ReturnType<DutyGateway["saveDutyRoleAssignments"]>,
    pageDutyTemplates: async (...[params]: Parameters<DutyGateway["pageDutyTemplates"]>): ReturnType<DutyGateway["pageDutyTemplates"]> =>
      http.get(withQuery(`${DUTY}/duty-templates`, { ...params })) as ReturnType<DutyGateway["pageDutyTemplates"]>,
    pageDutyTemplateItems: async (
      ...[params]: Parameters<DutyGateway["pageDutyTemplateItems"]>
    ): ReturnType<DutyGateway["pageDutyTemplateItems"]> =>
      http.get(withQuery(`${DUTY}/duty-template-items`, { ...params })) as ReturnType<DutyGateway["pageDutyTemplateItems"]>,
    getDutyTemplateItemStatistics: async (
      ...[params]: Parameters<DutyGateway["getDutyTemplateItemStatistics"]>
    ): ReturnType<DutyGateway["getDutyTemplateItemStatistics"]> =>
      http.get(withQuery(`${DUTY}/duty-template-item-statistics`, { ...params })) as ReturnType<
        DutyGateway["getDutyTemplateItemStatistics"]
      >,
    createDutyTemplate: async (
      ...[payload]: Parameters<DutyGateway["createDutyTemplate"]>
    ): ReturnType<DutyGateway["createDutyTemplate"]> =>
      http.post(`${DUTY}/duty-templates`, { ...payload }) as ReturnType<DutyGateway["createDutyTemplate"]>,
    createDutyTemplateItem: async (
      ...[payload]: Parameters<DutyGateway["createDutyTemplateItem"]>
    ): ReturnType<DutyGateway["createDutyTemplateItem"]> =>
      http.post(`${DUTY}/duty-template-items`, { ...payload }) as ReturnType<DutyGateway["createDutyTemplateItem"]>,
    createDutyTemplateItems: async (
      ...[payload]: Parameters<DutyGateway["createDutyTemplateItems"]>
    ): ReturnType<DutyGateway["createDutyTemplateItems"]> =>
      http.post(`${DUTY}/duty-template-items/batch`, { ...payload }) as ReturnType<DutyGateway["createDutyTemplateItems"]>,
    getDutyTemplate: async (...[id]: Parameters<DutyGateway["getDutyTemplate"]>): ReturnType<DutyGateway["getDutyTemplate"]> =>
      http.get(`${DUTY}/duty-templates/${id}`) as ReturnType<DutyGateway["getDutyTemplate"]>,
    updateDutyTemplate: async (
      ...[id, payload]: Parameters<DutyGateway["updateDutyTemplate"]>
    ): ReturnType<DutyGateway["updateDutyTemplate"]> =>
      http.put(`${DUTY}/duty-templates/${id}`, { ...payload }) as ReturnType<DutyGateway["updateDutyTemplate"]>,
    updateDutyTemplateItem: async (
      ...[id, payload]: Parameters<DutyGateway["updateDutyTemplateItem"]>
    ): ReturnType<DutyGateway["updateDutyTemplateItem"]> =>
      http.put(`${DUTY}/duty-template-items/${id}`, { ...payload }) as ReturnType<DutyGateway["updateDutyTemplateItem"]>,
    deleteDutyTemplateItem: async (
      ...[id]: Parameters<DutyGateway["deleteDutyTemplateItem"]>
    ): ReturnType<DutyGateway["deleteDutyTemplateItem"]> =>
      http.delete(`${DUTY}/duty-template-items/${id}`) as ReturnType<DutyGateway["deleteDutyTemplateItem"]>,
    listDutyLegalClauses: async (
      ...[params]: Parameters<DutyGateway["listDutyLegalClauses"]>
    ): ReturnType<DutyGateway["listDutyLegalClauses"]> =>
      http.get(withQuery(`${DUTY}/duty-legal-clauses`, { ...params })) as ReturnType<DutyGateway["listDutyLegalClauses"]>,
    listDutyLawNames: async (): ReturnType<DutyGateway["listDutyLawNames"]> =>
      http.get(`${DUTY}/duty-law-names`) as ReturnType<DutyGateway["listDutyLawNames"]>,
    listDutyEvidenceSourceOptions: async (
      ...[params]: Parameters<DutyGateway["listDutyEvidenceSourceOptions"]>
    ): ReturnType<DutyGateway["listDutyEvidenceSourceOptions"]> =>
      http.get(withQuery(`${DUTY}/duty-evidence-source-options`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyEvidenceSourceOptions"]
      >,
    checkDutyTemplateItemDuplicate: async (
      ...[payload]: Parameters<DutyGateway["checkDutyTemplateItemDuplicate"]>
    ): ReturnType<DutyGateway["checkDutyTemplateItemDuplicate"]> =>
      http.post(`${DUTY}/duty-template-item-duplicate-checks`, { ...payload }) as ReturnType<DutyGateway["checkDutyTemplateItemDuplicate"]>,
    createDutyTemplateVersion: async (
      ...[payload]: Parameters<DutyGateway["createDutyTemplateVersion"]>
    ): ReturnType<DutyGateway["createDutyTemplateVersion"]> =>
      http.post(`${DUTY}/duty-template-versions`, { ...payload }) as ReturnType<DutyGateway["createDutyTemplateVersion"]>,
    listDutyTemplateVersions: async (
      ...[id]: Parameters<DutyGateway["listDutyTemplateVersions"]>
    ): ReturnType<DutyGateway["listDutyTemplateVersions"]> =>
      http.get(`${DUTY}/duty-templates/${id}/versions`) as ReturnType<DutyGateway["listDutyTemplateVersions"]>,
    rollbackDutyTemplateVersion: async (
      ...[payload]: Parameters<DutyGateway["rollbackDutyTemplateVersion"]>
    ): ReturnType<DutyGateway["rollbackDutyTemplateVersion"]> =>
      http.post(`${DUTY}/duty-template-version-rollbacks`, { ...payload }) as ReturnType<DutyGateway["rollbackDutyTemplateVersion"]>,
    getDutyAssignmentOverviewStatistics: async (
      ...[params]: Parameters<DutyGateway["getDutyAssignmentOverviewStatistics"]>
    ): ReturnType<DutyGateway["getDutyAssignmentOverviewStatistics"]> =>
      http.get(withQuery(`${DUTY}/duty-assignments/overview-statistics`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyAssignmentOverviewStatistics"]
      >,
    listDutyAssignmentOverviewRoleGroups: async (
      ...[params]: Parameters<DutyGateway["listDutyAssignmentOverviewRoleGroups"]>
    ): ReturnType<DutyGateway["listDutyAssignmentOverviewRoleGroups"]> =>
      http.get(withQuery(`${DUTY}/duty-assignments/overview-role-groups`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyAssignmentOverviewRoleGroups"]
      >,
    pageDutyAssignments: async (
      ...[params]: Parameters<DutyGateway["pageDutyAssignments"]>
    ): ReturnType<DutyGateway["pageDutyAssignments"]> =>
      http.get(withQuery(`${DUTY}/duty-assignments`, { ...params })) as ReturnType<DutyGateway["pageDutyAssignments"]>,
    getDutyAssignment: async (
      ...[id, params]: Parameters<DutyGateway["getDutyAssignment"]>
    ): ReturnType<DutyGateway["getDutyAssignment"]> =>
      http.get(withQuery(`${DUTY}/duty-assignments/${id}`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyAssignment"]
      >,
    getCurrentDutyAssignment: async (
      ...[params]: Parameters<DutyGateway["getCurrentDutyAssignment"]>
    ): ReturnType<DutyGateway["getCurrentDutyAssignment"]> =>
      http.get(withQuery(`${DUTY}/duty-my-assignments/current`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getCurrentDutyAssignment"]
      >,
    getDutySignatureTrackingStatistics: async (
      ...[params]: Parameters<DutyGateway["getDutySignatureTrackingStatistics"]>
    ): ReturnType<DutyGateway["getDutySignatureTrackingStatistics"]> =>
      http.get(withQuery(`${DUTY}/duty-signatures/tracking-statistics`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutySignatureTrackingStatistics"]
      >,
    getDutyDispatchOptions: async (
      ...[params]: Parameters<DutyGateway["getDutyDispatchOptions"]>
    ): ReturnType<DutyGateway["getDutyDispatchOptions"]> =>
      http.get(withQuery(`${DUTY}/duty-dispatch-options`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyDispatchOptions"]
      >,
    createDutyDispatch: async (
      ...[payload]: Parameters<DutyGateway["createDutyDispatch"]>
    ): ReturnType<DutyGateway["createDutyDispatch"]> =>
      http.post(`${DUTY}/duty-dispatches`, { ...payload }) as ReturnType<DutyGateway["createDutyDispatch"]>,
    pageDutyDispatches: async (...[params]: Parameters<DutyGateway["pageDutyDispatches"]>): ReturnType<DutyGateway["pageDutyDispatches"]> =>
      http.get(withQuery(`${DUTY}/duty-dispatches`, { ...params })) as ReturnType<DutyGateway["pageDutyDispatches"]>,
    pageDutySignatures: async (
      ...[dispatchId, params]: Parameters<DutyGateway["pageDutySignatures"]>
    ): ReturnType<DutyGateway["pageDutySignatures"]> =>
      http.get(withQuery(`${DUTY}/duty-dispatches/${dispatchId}/signatures`, { ...params })) as ReturnType<
        DutyGateway["pageDutySignatures"]
      >,
    getDutySignPreview: async (): ReturnType<DutyGateway["getDutySignPreview"]> =>
      http.get(`${DUTY}/duty-my-assignments/sign-preview`) as ReturnType<DutyGateway["getDutySignPreview"]>,
    signDutyAssignment: async (
      ...[payload]: Parameters<DutyGateway["signDutyAssignment"]>
    ): ReturnType<DutyGateway["signDutyAssignment"]> =>
      http.post(`${DUTY}/duty-signatures`, { ...payload }) as ReturnType<DutyGateway["signDutyAssignment"]>,
    listDutyAssignmentItemRecords: async (
      ...[assignmentItemId]: Parameters<DutyGateway["listDutyAssignmentItemRecords"]>
    ): ReturnType<DutyGateway["listDutyAssignmentItemRecords"]> =>
      http.get(`${DUTY}/duty-assignment-items/${assignmentItemId}/records`) as ReturnType<DutyGateway["listDutyAssignmentItemRecords"]>,
    listCurrentDutyAssignmentItemRecords: async (
      ...[assignmentItemId]: Parameters<DutyGateway["listCurrentDutyAssignmentItemRecords"]>
    ): ReturnType<DutyGateway["listCurrentDutyAssignmentItemRecords"]> =>
      http.get(`${DUTY}/app/duty-assignment-items/${assignmentItemId}/records`) as ReturnType<
        DutyGateway["listCurrentDutyAssignmentItemRecords"]
      >,
    createDutyManualRecord: async (
      ...[payload]: Parameters<DutyGateway["createDutyManualRecord"]>
    ): ReturnType<DutyGateway["createDutyManualRecord"]> =>
      http.post(`${DUTY}/duty-records`, { ...payload }) as ReturnType<DutyGateway["createDutyManualRecord"]>,
    getDutyRecord: async (...[id]: Parameters<DutyGateway["getDutyRecord"]>): ReturnType<DutyGateway["getDutyRecord"]> =>
      http.get(`${DUTY}/duty-records/${id}`) as ReturnType<DutyGateway["getDutyRecord"]>,
    getCurrentDutyRecord: async (
      ...[id]: Parameters<DutyGateway["getCurrentDutyRecord"]>
    ): ReturnType<DutyGateway["getCurrentDutyRecord"]> =>
      http.get(`${DUTY}/app/duty-records/${id}`) as ReturnType<DutyGateway["getCurrentDutyRecord"]>,
    listDutyReportTypes: async (
      ...[params]: Parameters<DutyGateway["listDutyReportTypes"]>
    ): ReturnType<DutyGateway["listDutyReportTypes"]> =>
      http.get(withQuery(`${DUTY}/duty-report-types`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyReportTypes"]
      >,
    getDutyReportGenerateConfirmation: async (
      ...[params]: Parameters<DutyGateway["getDutyReportGenerateConfirmation"]>
    ): ReturnType<DutyGateway["getDutyReportGenerateConfirmation"]> =>
      http.get(withQuery(`${DUTY}/duty-reports/generate-confirmation`, { ...params })) as ReturnType<
        DutyGateway["getDutyReportGenerateConfirmation"]
      >,
    pageDutyReportResponsibleUserCandidates: async (
      ...[params]: Parameters<DutyGateway["pageDutyReportResponsibleUserCandidates"]>
    ): ReturnType<DutyGateway["pageDutyReportResponsibleUserCandidates"]> =>
      http.get(withQuery(`${DUTY}/duty-reports/responsible-user-candidates`, { ...params })) as ReturnType<
        DutyGateway["pageDutyReportResponsibleUserCandidates"]
      >,
    createDutyReport: async (...[payload]: Parameters<DutyGateway["createDutyReport"]>): ReturnType<DutyGateway["createDutyReport"]> =>
      http.post(`${DUTY}/duty-reports`, { ...payload }) as ReturnType<DutyGateway["createDutyReport"]>,
    pageDutyReports: async (...[params]: Parameters<DutyGateway["pageDutyReports"]>): ReturnType<DutyGateway["pageDutyReports"]> =>
      http.get(withQuery(`${DUTY}/duty-reports`, { ...params })) as ReturnType<DutyGateway["pageDutyReports"]>,
    getDutyReport: async (...[id]: Parameters<DutyGateway["getDutyReport"]>): ReturnType<DutyGateway["getDutyReport"]> =>
      http.get(`${DUTY}/duty-reports/${id}`) as ReturnType<DutyGateway["getDutyReport"]>,
    confirmDutyReportSignature: async (
      ...[id, payload]: Parameters<DutyGateway["confirmDutyReportSignature"]>
    ): ReturnType<DutyGateway["confirmDutyReportSignature"]> =>
      http.post(`${DUTY}/duty-reports/${id}/signature-confirmations`, { ...payload }) as ReturnType<
        DutyGateway["confirmDutyReportSignature"]
      >,
    listDutyReportMappings: async (
      ...[id, params]: Parameters<DutyGateway["listDutyReportMappings"]>
    ): ReturnType<DutyGateway["listDutyReportMappings"]> =>
      http.get(withQuery(`${DUTY}/duty-reports/${id}/mappings`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyReportMappings"]
      >,
    getDutyReportMapping: async (
      ...[id, mappingId]: Parameters<DutyGateway["getDutyReportMapping"]>
    ): ReturnType<DutyGateway["getDutyReportMapping"]> =>
      http.get(`${DUTY}/duty-reports/${id}/mappings/${mappingId}`) as ReturnType<DutyGateway["getDutyReportMapping"]>,
    listDutyReportMappingEvidences: async (
      ...[id, mappingId, params]: Parameters<DutyGateway["listDutyReportMappingEvidences"]>
    ): ReturnType<DutyGateway["listDutyReportMappingEvidences"]> =>
      http.get(withQuery(`${DUTY}/duty-reports/${id}/mappings/${mappingId}/evidences`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyReportMappingEvidences"]
      >,
    getDutyReportGapDetail: async (
      ...[id, mappingId]: Parameters<DutyGateway["getDutyReportGapDetail"]>
    ): ReturnType<DutyGateway["getDutyReportGapDetail"]> =>
      http.get(`${DUTY}/duty-reports/${id}/mappings/${mappingId}/gap-detail`) as ReturnType<DutyGateway["getDutyReportGapDetail"]>,
    listDutyReportEvidences: async (
      ...[id, params]: Parameters<DutyGateway["listDutyReportEvidences"]>
    ): ReturnType<DutyGateway["listDutyReportEvidences"]> =>
      http.get(withQuery(`${DUTY}/duty-reports/${id}/evidences`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyReportEvidences"]
      >,
    pageCurrentDutyReports: async (
      ...[params]: Parameters<DutyGateway["pageCurrentDutyReports"]>
    ): ReturnType<DutyGateway["pageCurrentDutyReports"]> =>
      http.get(withQuery(`${DUTY}/app/duty-reports`, { ...params })) as ReturnType<DutyGateway["pageCurrentDutyReports"]>,
    getCurrentDutyReport: async (
      ...[id]: Parameters<DutyGateway["getCurrentDutyReport"]>
    ): ReturnType<DutyGateway["getCurrentDutyReport"]> =>
      http.get(`${DUTY}/app/duty-reports/${id}`) as ReturnType<DutyGateway["getCurrentDutyReport"]>,
    getCurrentDutyReportMapping: async (
      ...[id, mappingId]: Parameters<DutyGateway["getCurrentDutyReportMapping"]>
    ): ReturnType<DutyGateway["getCurrentDutyReportMapping"]> =>
      http.get(`${DUTY}/app/duty-reports/${id}/mappings/${mappingId}`) as ReturnType<DutyGateway["getCurrentDutyReportMapping"]>,
    getCurrentDutyReportGapDetail: async (
      ...[id, mappingId]: Parameters<DutyGateway["getCurrentDutyReportGapDetail"]>
    ): ReturnType<DutyGateway["getCurrentDutyReportGapDetail"]> =>
      http.get(`${DUTY}/app/duty-reports/${id}/mappings/${mappingId}/gap-detail`) as ReturnType<
        DutyGateway["getCurrentDutyReportGapDetail"]
      >,
    getDutyScoreModel: async (...[params]: Parameters<DutyGateway["getDutyScoreModel"]>): ReturnType<DutyGateway["getDutyScoreModel"]> =>
      http.get(withQuery(`${DUTY}/duty-score-models/current`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyScoreModel"]
      >,
    saveDutyScoreModel: async (
      ...[payload]: Parameters<DutyGateway["saveDutyScoreModel"]>
    ): ReturnType<DutyGateway["saveDutyScoreModel"]> =>
      http.put(`${DUTY}/duty-score-models/current`, { ...payload }) as ReturnType<DutyGateway["saveDutyScoreModel"]>,
    getDutyScoreDashboardSummary: async (
      ...[params]: Parameters<DutyGateway["getDutyScoreDashboardSummary"]>
    ): ReturnType<DutyGateway["getDutyScoreDashboardSummary"]> =>
      http.get(withQuery(`${DUTY}/duty-score-dashboard/summary`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyScoreDashboardSummary"]
      >,
    listDutyScoreDepartmentSummaries: async (
      ...[params]: Parameters<DutyGateway["listDutyScoreDepartmentSummaries"]>
    ): ReturnType<DutyGateway["listDutyScoreDepartmentSummaries"]> =>
      http.get(withQuery(`${DUTY}/duty-score-department-summaries`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyScoreDepartmentSummaries"]
      >,
    pageDutyScoreRankings: async (
      ...[params]: Parameters<DutyGateway["pageDutyScoreRankings"]>
    ): ReturnType<DutyGateway["pageDutyScoreRankings"]> =>
      http.get(withQuery(`${DUTY}/duty-score-rankings`, { ...params })) as ReturnType<DutyGateway["pageDutyScoreRankings"]>,
    exportDutyScoreRankings: async (
      ...[payload]: Parameters<DutyGateway["exportDutyScoreRankings"]>
    ): ReturnType<DutyGateway["exportDutyScoreRankings"]> =>
      http.post(`${DUTY}/duty-score-ranking-exports`, { ...payload }) as ReturnType<DutyGateway["exportDutyScoreRankings"]>,
    getDutyPersonalScoreReport: async (
      ...[userId, params]: Parameters<DutyGateway["getDutyPersonalScoreReport"]>
    ): ReturnType<DutyGateway["getDutyPersonalScoreReport"]> =>
      http.get(withQuery(`${DUTY}/duty-score-reports/${userId}`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyPersonalScoreReport"]
      >,
    getDutyAppPersonalScoreReport: async (
      ...[params]: Parameters<DutyGateway["getDutyAppPersonalScoreReport"]>
    ): ReturnType<DutyGateway["getDutyAppPersonalScoreReport"]> =>
      http.get(withQuery(`${DUTY}/app/duty-score-reports/current`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyAppPersonalScoreReport"]
      >,
    getDutyScorePublicity: async (
      ...[params]: Parameters<DutyGateway["getDutyScorePublicity"]>
    ): ReturnType<DutyGateway["getDutyScorePublicity"]> =>
      http.get(withQuery(`${DUTY}/duty-score-publicities`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyScorePublicity"]
      >,
    pageDutyScorePublicityRankings: async (
      ...[params]: Parameters<DutyGateway["pageDutyScorePublicityRankings"]>
    ): ReturnType<DutyGateway["pageDutyScorePublicityRankings"]> =>
      http.get(withQuery(`${DUTY}/duty-score-publicity-rankings`, { ...params })) as ReturnType<
        DutyGateway["pageDutyScorePublicityRankings"]
      >,
    getDutyAppScorePublicity: async (
      ...[params]: Parameters<DutyGateway["getDutyAppScorePublicity"]>
    ): ReturnType<DutyGateway["getDutyAppScorePublicity"]> =>
      http.get(withQuery(`${DUTY}/app/duty-score-publicities`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyAppScorePublicity"]
      >,
    listDutyScoreNotifyTargets: async (
      ...[params]: Parameters<DutyGateway["listDutyScoreNotifyTargets"]>
    ): ReturnType<DutyGateway["listDutyScoreNotifyTargets"]> =>
      http.get(withQuery(`${DUTY}/duty-score-notify-targets`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["listDutyScoreNotifyTargets"]
      >,
    saveDutyScoreNotifyTargets: async (
      ...[payload]: Parameters<DutyGateway["saveDutyScoreNotifyTargets"]>
    ): ReturnType<DutyGateway["saveDutyScoreNotifyTargets"]> =>
      http.put(`${DUTY}/duty-score-notify-targets`, { ...payload }) as ReturnType<DutyGateway["saveDutyScoreNotifyTargets"]>,
    pageDutyScoreNotifyTargetCandidates: async (
      ...[params]: Parameters<DutyGateway["pageDutyScoreNotifyTargetCandidates"]>
    ): ReturnType<DutyGateway["pageDutyScoreNotifyTargetCandidates"]> =>
      http.get(withQuery(`${DUTY}/duty-score-notify-target-candidates`, { ...params })) as ReturnType<
        DutyGateway["pageDutyScoreNotifyTargetCandidates"]
      >,
    getDutyAppScoreDashboard: async (
      ...[params]: Parameters<DutyGateway["getDutyAppScoreDashboard"]>
    ): ReturnType<DutyGateway["getDutyAppScoreDashboard"]> =>
      http.get(withQuery(`${DUTY}/app/duty-score-dashboard`, params ? { ...params } : undefined)) as ReturnType<
        DutyGateway["getDutyAppScoreDashboard"]
      >,
  };
}
export type DutyClient = ReturnType<typeof createDutyClient>;
