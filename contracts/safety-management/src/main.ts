export type SafetyApplicationCode = "SAFETY_MANAGE_HEAD" | "SAFETY_MANAGE_MARKET";

export interface PageResult<T = Record<string, unknown>> {
  records: T[];
  total: number;
  pageNumber?: number;
  pageSize?: number;
}

export interface SafetyManagementClient {
  listHeadMonthlyReports(params: Record<string, unknown>): Promise<PageResult>;
  listAllMarketReportsByHeadReport(reportId: string): Promise<unknown[]>;
  listReportedMarketReportsByHeadReport(reportId: string): Promise<unknown[]>;
  listUnreportedMarketReportsByHeadReport(reportId: string): Promise<unknown[]>;
  listSecurityReports(params: Record<string, unknown>): Promise<PageResult>;
  listMarketMonthlyReports(params: Record<string, unknown>): Promise<PageResult>;
  getMarketMonthlyReport(id: string, market: boolean): Promise<unknown>;
  saveMarketMonthlyReport(id: string, reportData: unknown, market: boolean): Promise<unknown>;
  escalateMarketMonthlyReport(id: string): Promise<unknown>;
  listMonthlyLinks(params: Record<string, unknown>): Promise<PageResult>;
  updateMonthlyLink(id: string, enabled: boolean): Promise<unknown>;
  listMarketConfigs(params: Record<string, unknown>): Promise<PageResult>;
  createMarketConfig(payload: Record<string, unknown>): Promise<unknown>;
  updateMarketConfig(payload: Record<string, unknown>): Promise<unknown>;
  deleteMarketConfig(id: string): Promise<unknown>;
  listAlarmTypes(params?: Record<string, unknown>): Promise<PageResult>;
  listAlarmTypeOptions(params?: Record<string, unknown>): Promise<unknown[]>;
  listAlarmLevels(params?: Record<string, unknown>): Promise<unknown[]>;
  listAlarmConfig(alarmTypeCode: string): Promise<unknown[]>;
  updateAlarmConfig(alarmTypeCode: string, levelCode: string, timeout?: boolean): Promise<unknown>;
  deleteAlarmConfig(alarmTypeCode: string, levelCode: string): Promise<unknown>;
  listMarkets(params?: Record<string, unknown>): Promise<unknown[]>;
  listDepartments(params?: Record<string, unknown>): Promise<unknown[]>;
  listEventTypes(params?: Record<string, unknown>): Promise<unknown[]>;
  listHeadAlarmRecords(params: Record<string, unknown>): Promise<PageResult>;
  listMarketAlarmRecords(params: Record<string, unknown>): Promise<PageResult>;
  listSafetyReport(params: Record<string, unknown>): Promise<PageResult>;
  exportSafetyReport(params: Record<string, unknown>): Promise<unknown>;
  getAlarmDetail(id: string): Promise<unknown>;
  getAlarmOperatorRecords(id: string): Promise<unknown>;
  getAlarmLinkageActions(eventId: string): Promise<unknown>;
  getAlarmLinkageExecuteRecords(eventId: string): Promise<unknown>;
  getAlarmVideoEventFiles(eventId: string): Promise<unknown>;
  executeAlarmLinkage(payload: Record<string, unknown>): Promise<unknown>;
  exportAlarmRecords(params: Record<string, unknown>): Promise<unknown>;
  listMetricReports(params: Record<string, unknown>): Promise<PageResult>;
  getMetricReport(id: string): Promise<unknown>;
  listMetricLibraries(params: Record<string, unknown>): Promise<PageResult>;
  listAllMetricLibraries(): Promise<unknown[]>;
  createMetricLibrary(payload: Record<string, unknown>): Promise<unknown>;
  updateMetricLibrary(payload: Record<string, unknown>): Promise<unknown>;
  deleteMetricLibrary(id: string): Promise<unknown>;
  listRuleLibraries(): Promise<unknown[]>;
  saveRuleLibrary(payload: Record<string, unknown>): Promise<unknown>;
  updateRuleLibrary(payload: Record<string, unknown>): Promise<unknown>;
  deleteRuleLibrary(id: string): Promise<unknown>;
  listAlarmReport(params: Record<string, unknown>): Promise<PageResult>;
  listDepartmentReport(params: Record<string, unknown>): Promise<PageResult>;
  listUserReport(params: Record<string, unknown>): Promise<PageResult>;
  exportAlarmReport(kind: "alarm" | "department" | "user", params: Record<string, unknown>): Promise<unknown>;
  getNoticeConfig(businessType: string): Promise<unknown>;
  getNoticeChannels(sceneCode: string): Promise<unknown[]>;
  saveNoticeConfig(payload: Record<string, unknown>): Promise<unknown>;
  getAnalysisSummary(params: Record<string, unknown>): Promise<unknown>;
  getMarketClientAuthorization(): Promise<Record<string, unknown>>;
  generateMarketClientAuthorization(): Promise<Record<string, unknown>>;
  grantMarketClientScope(clientCode: string, scopeCode: string): Promise<unknown>;
  revokeMarketClientScope(clientCode: string, scopeCode: string): Promise<unknown>;
}
