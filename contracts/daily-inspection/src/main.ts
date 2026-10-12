/** 日常巡检直连 maintain 网关前缀（无 BFF）。 */
export const DAILY_INSPECTION_API_BASE = "/api/maintain" as const;

export type DailyInspectionApiBase = typeof DAILY_INSPECTION_API_BASE;
export type DailyInspectionMethod = "GET" | "POST" | "PUT" | "DELETE";
export type InspectionRecord = Record<string, unknown> & { id?: string; name?: string };
export type InspectionPage = { records: InspectionRecord[]; total: number; pages: number };
export type InspectionConfigKind = "type" | "cron" | "result" | "item" | "standard";

/** 巡检 AI / 内部代理仅允许访问 maintain 内巡检相关资源。 */
export const DAILY_INSPECTION_ALLOWED_UPSTREAM_PREFIXES = [
  "/inspect-",
  "/inspect/",
  "/statistic-analysis/",
  "/inspection-analysis/",
] as const;

export interface DailyInspectionProxyGateway {
  performInspection(payload: { id: string; objId: string }): Promise<InspectionRecord>;
}

export interface DailyInspectionClient {
  request<T = unknown>(method: DailyInspectionMethod, path: string, payload?: Record<string, unknown> | unknown[]): Promise<T>;
  listPlans(params?: Record<string, unknown>): Promise<InspectionPage>;
  getPlan(params: Record<string, unknown>): Promise<InspectionRecord>;
  createPlan(data: InspectionRecord): Promise<unknown>;
  updatePlan(data: InspectionRecord): Promise<unknown>;
  deletePlan(id: string, businessType?: string): Promise<unknown>;
  setPlanEnabled(id: string, enabled: boolean, businessType?: string): Promise<unknown>;
  checkPlanNameRepeat(params: { planName: string; businessType?: string }): Promise<boolean>;
  listTasks(params?: Record<string, unknown>): Promise<InspectionPage>;
  getTask(params: Record<string, unknown>): Promise<InspectionRecord>;
  createTask(data: InspectionRecord): Promise<unknown>;
  stopTask(id: string, businessType?: string): Promise<unknown>;
  deleteTasks(ids: string[]): Promise<unknown>;
  exportTasks(params?: Record<string, unknown>): Promise<Blob>;
  getTaskRate(params: Record<string, unknown>): Promise<InspectionPage>;
  getTaskProgress(params: Record<string, unknown>): Promise<InspectionRecord>;
  getTaskObjCount(params: { taskId: string }): Promise<InspectionRecord>;
  cancelRepairTasks(ids: string[]): Promise<unknown>;
  listRecords(params?: Record<string, unknown>): Promise<InspectionPage>;
  getRecord(id: string, businessType?: string): Promise<InspectionRecord>;
  listArchives(params?: Record<string, unknown>): Promise<InspectionPage>;
  getArchive(params: Record<string, unknown>): Promise<InspectionRecord>;
  listArchiveRecords(params: Record<string, unknown>): Promise<InspectionPage>;
  listPlanStatistics(params?: Record<string, unknown>): Promise<InspectionPage>;
  listAbnormalRates(params?: Record<string, unknown>): Promise<InspectionPage>;
  listTypes(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  listPeriods(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  listResultOptions(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  listConfig(kind: InspectionConfigKind, params?: Record<string, unknown>): Promise<InspectionPage>;
  getConfig(kind: InspectionConfigKind, id: string, businessType?: string): Promise<InspectionRecord>;
  createConfig(kind: InspectionConfigKind, data: InspectionRecord): Promise<unknown>;
  updateConfig(kind: InspectionConfigKind, id: string, data: InspectionRecord): Promise<unknown>;
  deleteConfig(kind: InspectionConfigKind, id: string, businessType?: string): Promise<unknown>;
  deleteCronBatch(ids: string[]): Promise<unknown>;
  setDefaultStandard(id: string, params?: Record<string, unknown>): Promise<unknown>;
  relatedInspectStandard(params: Record<string, unknown>): Promise<unknown>;
  listStandards(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  getStandardsByTarget(targetCategory: string, targetType: string, businessType?: string): Promise<InspectionRecord[]>;
  listStandardPage(params?: Record<string, unknown>): Promise<InspectionPage>;
  listItemPage(params?: Record<string, unknown>): Promise<InspectionPage>;
  listObjectPage(
    kind: "device" | "stall" | "scene-point" | "property-detailed" | "risk-source" | "project-schedule" | "area" | "patrol-point",
    params?: Record<string, unknown>,
  ): Promise<InspectionPage>;
  listAreaTree(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  /** 巡检标准左侧对象树 / 关联 tabs 目录源 */
  getIotProductCategoryTree(): Promise<InspectionRecord[]>;
  stallTypeList(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  getAssemblyClassifyPage(params?: Record<string, unknown>): Promise<InspectionPage>;
  inspectPointTypeList(): Promise<InspectionRecord[]>;
  getRiskSourceType(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  getProjectTypeList(params?: Record<string, unknown>): Promise<InspectionRecord[]>;
  generateStandards(input: { targetName: string; supplement?: string }): Promise<unknown>;
  batchCreateStandards(standards: InspectionRecord[]): Promise<unknown>;
  /** 巡检分析：GET /inspection-analysis/{name}，返回已 unwrap 的 data。 */
  listInspectionAnalysis(name: string, params?: Record<string, unknown>): Promise<unknown>;
}
