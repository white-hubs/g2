import type { Pagination } from "@g2-contract/base";

import type {
  AcceptAlertParams,
  BatchWriteMetricSamplesParams,
  GrainAlertDetail,
  GrainAlertPageQuery,
  GrainAlertPageResult,
  GrainAlertTracking,
  GrainArchiveDetail,
  GrainArchiveRecord,
  GrainArchiveRecordQuery,
  GrainArchiveTrend,
  GrainArchiveTrendQuery,
  GrainDashboardOverview,
  GrainDashboardQuery,
  GrainMobileAlertQuery,
  GrainMobileSummary,
  GrainQualityRecord,
  GrainQualityRecordPageQuery,
  GrainQualityRecordPayload,
  GrainRuleConfig,
  GrainRuleEngineConstants,
  GrainVarietyOption,
  GrainVarietyPageQuery,
  GrainVarietyPayload,
  GrainVarietyRecord,
  GrainWarehouseOption,
  GrainWarehousePageQuery,
  GrainWarehousePayload,
  GrainWarehouseRecord,
  GrainWarehouseRulePageQuery,
  GrainWarehouseRuleRow,
  JudgeRealAlertParams,
  MarkMistakeAlertParams,
  RejectAlertParams,
  SubmitDisposalParams,
} from "./types";

export interface IntelligentGrainGateway {
  getIntelligentGrainDashboard: (params?: GrainDashboardQuery) => Promise<GrainDashboardOverview>;
  listIntelligentGrainWarehouseOptions: (params?: { keyword?: string; areaId?: string }) => Promise<GrainWarehouseOption[]>;
  pageIntelligentGrainWarehouses: (params: GrainWarehousePageQuery) => Promise<Pagination<GrainWarehouseRecord>>;
  getIntelligentGrainWarehouse: (warehouseId: string | number) => Promise<GrainWarehouseRecord>;
  createIntelligentGrainWarehouse: (payload: GrainWarehousePayload) => Promise<GrainWarehouseRecord>;
  updateIntelligentGrainWarehouse: (warehouseId: string | number, payload: GrainWarehousePayload) => Promise<GrainWarehouseRecord>;
  deleteIntelligentGrainWarehouse: (warehouseId: string | number) => Promise<void>;
  listIntelligentGrainVarietyOptions: (warehouseId: string | number) => Promise<GrainVarietyOption[]>;
  listIntelligentGrainGlobalVarietyOptions: (params?: Pick<GrainVarietyPageQuery, "category">) => Promise<GrainVarietyOption[]>;
  pageIntelligentGrainVarieties: (params: GrainVarietyPageQuery) => Promise<Pagination<GrainVarietyRecord>>;
  getIntelligentGrainVariety: (varietyId: string | number) => Promise<GrainVarietyRecord>;
  createIntelligentGrainVariety: (payload: GrainVarietyPayload) => Promise<GrainVarietyRecord>;
  updateIntelligentGrainVariety: (varietyId: string | number, payload: GrainVarietyPayload) => Promise<GrainVarietyRecord>;
  deleteIntelligentGrainVariety: (varietyId: string | number) => Promise<void>;
  exportIntelligentGrainVarieties: (params: GrainVarietyPageQuery) => Promise<Blob>;
  pageIntelligentGrainQualityRecords: (params: GrainQualityRecordPageQuery) => Promise<Pagination<GrainQualityRecord>>;
  getIntelligentGrainQualityRecord: (recordId: string | number) => Promise<GrainQualityRecord>;
  createIntelligentGrainQualityRecord: (payload: GrainQualityRecordPayload) => Promise<GrainQualityRecord>;
  updateIntelligentGrainQualityRecord: (recordId: string | number, payload: GrainQualityRecordPayload) => Promise<GrainQualityRecord>;
  deleteIntelligentGrainQualityRecord: (recordId: string | number) => Promise<void>;
  exportIntelligentGrainQualityRecords: (params: GrainQualityRecordPageQuery) => Promise<Blob>;
  getIntelligentGrainArchive: (warehouseId: string | number) => Promise<GrainArchiveDetail>;
  getIntelligentGrainArchiveTrend: (warehouseId: string | number, params?: GrainArchiveTrendQuery) => Promise<GrainArchiveTrend>;
  pageIntelligentGrainArchiveRecords: (
    warehouseId: string | number,
    params: GrainArchiveRecordQuery,
  ) => Promise<Pagination<GrainArchiveRecord>>;
  exportIntelligentGrainArchiveRecords: (warehouseId: string | number, params: GrainArchiveRecordQuery) => Promise<Blob>;
  batchWriteIntelligentGrainMetricSamples: (payload: BatchWriteMetricSamplesParams) => Promise<void>;
  getIntelligentGrainGlobalRules: () => Promise<GrainRuleConfig>;
  saveIntelligentGrainGlobalRules: (payload: GrainRuleConfig) => Promise<void>;
  restoreIntelligentGrainFactoryDefaults: () => Promise<GrainRuleConfig>;
  pageIntelligentGrainWarehouseRules: (params: GrainWarehouseRulePageQuery) => Promise<Pagination<GrainWarehouseRuleRow>>;
  getIntelligentGrainWarehouseRules: (warehouseId: string | number) => Promise<GrainRuleConfig>;
  saveIntelligentGrainWarehouseRules: (warehouseId: string | number, payload: GrainRuleConfig) => Promise<void>;
  deleteIntelligentGrainWarehouseRules: (warehouseId: string | number) => Promise<void>;
  getIntelligentGrainRuleEngineConstants: () => Promise<GrainRuleEngineConstants>;
  pageIntelligentGrainAlerts: (params: GrainAlertPageQuery) => Promise<GrainAlertPageResult>;
  getIntelligentGrainAlert: (id: string | number) => Promise<GrainAlertDetail>;
  getIntelligentGrainAlertTracking: (id: string | number) => Promise<GrainAlertTracking>;
  judgeIntelligentGrainAlertReal: (id: string | number, payload: JudgeRealAlertParams) => Promise<void>;
  markIntelligentGrainAlertMistake: (id: string | number, payload: MarkMistakeAlertParams) => Promise<void>;
  saveIntelligentGrainDisposalDraft: (id: string | number, payload: SubmitDisposalParams) => Promise<void>;
  submitIntelligentGrainDisposal: (id: string | number, payload: SubmitDisposalParams) => Promise<void>;
  acceptIntelligentGrainAlert: (id: string | number, payload: AcceptAlertParams) => Promise<void>;
  rejectIntelligentGrainAlert: (id: string | number, payload: RejectAlertParams) => Promise<void>;
  exportIntelligentGrainAlerts: (params: GrainAlertPageQuery) => Promise<Blob>;
  getIntelligentGrainMobileSummary: (params?: { warehouseId?: string | number }) => Promise<GrainMobileSummary>;
  pageMyIntelligentGrainAlerts: (params: GrainMobileAlertQuery) => Promise<Pagination<GrainAlertPageResult["records"][number]>>;
}
