import type { PlatformContext } from "@g2-composition/contract";

/** 维保计划列表/详情记录；字段名保持旧 `/api/maintain` 契约。 */
export interface MaintenancePlanRecord {
  id?: string | number;
  maintenancePlanName?: string;
  responsibilityType?: string;
  responsibilityPersonName?: string;
  maintenanceCycle?: number | string | null;
  timeUnit?: string;
  maintenanceTimePoint?: string | number;
  cronExpression?: string;
  planStartTime?: string | number;
  planEndTime?: string | number;
  taskNum?: number;
  status?: string;
  remark?: string;
  way?: string;
  receiveIds?: string[];
  receiveDeptIds?: string[];
  receivePostIds?: string[];
  ruleDetails?: MaintenanceRuleCondition[];
  maintenaceObjectsList?: MaintenancePlanObject[];
}

/** 计划详情中的维保对象（设备 + 已选维保项）。 */
export interface MaintenancePlanObject {
  id?: string | number;
  keyId?: string | number;
  objectName?: string;
  categoryName?: string;
  categoryCode?: string;
  areaName?: string;
  area?: string;
  objectProjects?: MaintenanceProjectItem[];
  /** 旧页提交时携带的已选维保项主键与数量。 */
  projectIds?: string[];
  itemNum?: number;
}

/** 规则触发条件表达式。 */
export interface MaintenanceRuleConditionExp {
  id?: string;
  propCode?: string;
  propName?: string;
  propUnit?: string;
  op?: string | null;
  oprand?: string;
  delayTime?: number;
  startDelayTime?: number;
  endDelayTime?: number;
  emergencyRuleConditionId?: string;
  emergencyRuleId?: string;
}

/** 规则触发条件。 */
export interface MaintenanceRuleCondition {
  id?: string;
  deviceProdCategoryCodeConcat?: string;
  deviceProdCategoryName?: string;
  deviceProdId?: string;
  deviceProdName?: string;
  conditionType?: string | null;
  deviceEventCode?: string;
  deviceEventName?: string;
  deviceEventType?: string;
  emergencyRuleConditionExps?: MaintenanceRuleConditionExp[];
}

/** 维保任务列表/详情记录。 */
export interface MaintenanceTaskRecord {
  id?: string | number;
  code?: string;
  planId?: string;
  maintenanceTime?: string | number;
  maintenancePlanName?: string;
  objectName?: string;
  categoryName?: string;
  responsibilityType?: string;
  responsibilityPersonName?: string;
  responsibilityPositionName?: string;
  maintenanceTaskStatus?: string;
  maintenanceFinishTime?: string | number;
  maintenanceTaskPerson?: string;
  taskRemark?: string;
  fileVOS?: MaintenanceFile[];
  maintenanceProgetRecordVos?: MaintenanceProgetRecord[];
}

export interface MaintenanceFile {
  id?: string | number;
  name?: string;
  path?: string;
  url?: string;
}

/** 维保结果记录行。 */
export interface MaintenanceProgetRecord {
  id?: string;
  taskId?: string;
  maintrenaceProject?: string;
  record?: string;
  maintenanceDescribe?: string;
}

/** 产品品类维保项配置列表行。 */
export interface MaintenanceProjectRecord {
  id?: string | number;
  categoryCode?: string;
  categoryName?: string;
  maintenanceItemNum?: number;
}

/** 单条维保内容。 */
export interface MaintenanceProjectItem {
  id?: string | number;
  code?: string;
  categoryCode?: string;
  categoryName?: string;
  maintenanceContent?: string;
  deleted?: boolean;
}

/** 维保统计行。 */
export interface MaintenanceStatisticsRecord {
  id?: string | number;
  name?: string;
  categoryName?: string;
  num?: number;
  lastTime?: string | number;
}

/** OUAA 岗位。 */
export interface MaintenanceAppointment {
  id: string;
  name: string;
}

/** 平台消息通道配置（旧 `/api/message/sat-msg-configs`）。 */
export interface SatMsgChannelConfig {
  terminal?: string;
  channelType?: string;
  terminalName?: string;
}

export interface SatMsgConfig {
  id?: string | number;
  satMsgDefineCode?: string;
  effectiveDays?: number;
  notifyExpression?: string;
  enabled?: boolean;
  msgTmpContent?: string;
  satMsgChannelConfigVOS?: SatMsgChannelConfig[];
  satMsgChannelConfigModifyParams?: SatMsgChannelConfig[];
}

export interface MaintenancePage<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface MaintenancePlanQuery {
  pageNumber?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export interface MaintenanceTaskQuery {
  pageNumber?: number;
  pageSize?: number;
  categoryCode?: string;
  objectName?: string;
  maintenanceTaskStatus?: string;
  period?: string;
}

export interface MaintenanceStatisticsQuery {
  pageNumber?: number;
  pageSize?: number;
  categoryCode?: string;
  keyword?: string;
  period?: string;
}

/** 保存计划提交体：与旧 `save-maintenance-plan` DTO 对齐。 */
export interface MaintenancePlanSavePayload extends Omit<MaintenancePlanRecord, "status" | "maintenaceObjectsList"> {
  status?: string;
  maintenanceObjectCommands?: MaintenancePlanObject[];
}

/** 维保执行提交体。 */
export interface MaintenanceProgetRecordPayload {
  id: string;
  planId?: string;
  taskRemark?: string;
  fileIds?: string[];
  maintenanceProgetRecordCommands?: MaintenanceProgetRecord[];
}

export interface MaintenanceClient {
  pagePlans(query: MaintenancePlanQuery): Promise<MaintenancePage<MaintenancePlanRecord>>;
  listPlanStatus(): Promise<{ label: string; value: string }[]>;
  getPlan(id: string | number): Promise<MaintenancePlanRecord>;
  savePlan(payload: MaintenancePlanSavePayload): Promise<void>;
  updatePlanStatus(payload: { id: string | number; status: string }): Promise<void>;
  deletePlan(id: string | number): Promise<void>;
  pageTasks(query: MaintenanceTaskQuery): Promise<MaintenancePage<MaintenanceTaskRecord>>;
  getTask(id: string | number): Promise<MaintenanceTaskRecord>;
  saveProgetRecord(payload: MaintenanceProgetRecordPayload): Promise<void>;
  pageMaintenanceProjects(query: {
    pageNumber?: number;
    pageSize?: number;
    categoryCode?: string;
  }): Promise<MaintenancePage<MaintenanceProjectRecord>>;
  listMaintenanceProjectItems(query: { categoryCode?: string }): Promise<MaintenanceProjectItem[]>;
  saveMaintenanceProjectItems(items: MaintenanceProjectItem[]): Promise<void>;
  pageDeviceStatistics(query: MaintenanceStatisticsQuery): Promise<MaintenancePage<MaintenanceStatisticsRecord>>;
  exportDeviceStatistics(query: MaintenanceStatisticsQuery): Promise<Blob>;
  listAppointments(query?: { enabled?: boolean }): Promise<MaintenanceAppointment[]>;
  listSatMsgConfigs(satMsgDefineCodes: string): Promise<SatMsgConfig[]>;
  createSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
  updateSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
}

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const MAINTAIN = "/api/maintain";
const MESSAGE = "/api/message";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

/**
 * 解包接口信封。
 * 任务详情等业务实体本身常有 `code`（任务编号），不能把实体 `code` 当成接口状态码，
 * 否则会在接口已成功时误抛「请求失败」。
 */
function isApiStatusCode(code: unknown): boolean {
  return typeof code === "number" || (typeof code === "string" && /^-?\d+$/u.test(code));
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let i = 0; i < 4 && value && typeof value === "object" && !(value instanceof Blob); i++) {
    const record = value as Record<string, unknown>;
    if (record.success === false) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    // 仅信封（含 data）或数字型状态码才按接口失败处理；业务字符串 code 属于实体字段。
    if ("data" in record) {
      if (record.code !== undefined && !["0", "200"].includes(String(record.code))) {
        throw new Error(String(record.message ?? record.msg ?? "请求失败"));
      }
      value = record.data;
      continue;
    }
    if (isApiStatusCode(record.code) && !["0", "200"].includes(String(record.code))) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    break;
  }
  return value as T;
}

function asPage<T>(response: unknown): MaintenancePage<T> {
  const value = unwrap<Partial<MaintenancePage<T>>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}

function asList<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}

function asBlob(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("导出接口未返回文件");
  }
  return value;
}

/** 旧 `getStatus` 可能返回字符串数组或 {code,name} 字典行，统一成 Select 的 label/value。 */
export function normalizePlanStatusOptions(rows: unknown[]): { label: string; value: string }[] {
  return rows.flatMap((row) => {
    if (typeof row === "string") {
      return [{ label: row, value: row }];
    }
    if (!row || typeof row !== "object") {
      return [];
    }
    const item = row as Record<string, unknown>;
    const value = String(item.value ?? item.code ?? item.key ?? "");
    if (!value) {
      return [];
    }
    return [{ label: String(item.label ?? item.name ?? item.desc ?? value), value }];
  });
}

const idPath = (id: string | number): string => encodeURIComponent(String(id));

export function createMaintenanceClient(http: HttpClient): MaintenanceClient {
  return {
    pagePlans: async (query) => asPage<MaintenancePlanRecord>(await http.get(withQuery(`${MAINTAIN}/select-maintenance-plan`, query))),
    listPlanStatus: async () => normalizePlanStatusOptions(asList<unknown>(await http.get(`${MAINTAIN}/getStatus`))),
    getPlan: async (id) => unwrap(await http.get(`${MAINTAIN}/select-maintenance-planDetail/${idPath(id)}`)),
    savePlan: async (payload) => {
      unwrap(await http.post(`${MAINTAIN}/save-maintenance-plan`, payload));
    },
    // 旧页以查询参数（而非请求体）提交启停用，保持一致避免后端 400。
    updatePlanStatus: async (payload) => {
      unwrap(await http.put(withQuery(`${MAINTAIN}/update-maintenance-plan`, payload)));
    },
    deletePlan: async (id) => {
      unwrap(await http.delete(`${MAINTAIN}/delete-plan/${idPath(id)}`));
    },
    pageTasks: async (query) => asPage<MaintenanceTaskRecord>(await http.get(withQuery(`${MAINTAIN}/select-tasks`, query))),
    getTask: async (id) => unwrap(await http.get(`${MAINTAIN}/select-tasks-detail/${idPath(id)}`)),
    saveProgetRecord: async (payload) => {
      unwrap(await http.post(`${MAINTAIN}/save-proget-record`, payload));
    },
    pageMaintenanceProjects: async (query) =>
      asPage<MaintenanceProjectRecord>(await http.get(withQuery(`${MAINTAIN}/select-maintenance-project`, query))),
    listMaintenanceProjectItems: async (query) =>
      asList<MaintenanceProjectItem>(await http.get(withQuery(`${MAINTAIN}/select-maintenance-projectDetail`, query))),
    saveMaintenanceProjectItems: async (items) => {
      unwrap(await http.post(`${MAINTAIN}/save-maintenance-project`, items));
    },
    pageDeviceStatistics: async (query) =>
      asPage<MaintenanceStatisticsRecord>(await http.get(withQuery(`${MAINTAIN}/maintenance/device/statistics/page`, query))),
    exportDeviceStatistics: async (query) => asBlob(await http.get(withQuery(`${MAINTAIN}/maintenance/device/statistics/export`, query))),
    listAppointments: async (query) => asList<MaintenanceAppointment>(await http.get(withQuery("/api/ouaa/appointment/list", query))),
    listSatMsgConfigs: async (satMsgDefineCodes) =>
      asList<SatMsgConfig>(await http.get(`${MESSAGE}/sat-msg-configs?satMsgDefineCodes=${encodeURIComponent(satMsgDefineCodes)}`)),
    // 旧页把整批规则包在 `params` 字段里提交，新增/更新共用同一路径。
    createSatMsgConfigs: async (configs) => {
      unwrap(await http.post(`${MESSAGE}/sat-msg-config`, { params: configs }));
    },
    updateSatMsgConfigs: async (configs) => {
      unwrap(await http.put(`${MESSAGE}/sat-msg-config`, { params: configs }));
    },
  };
}

export async function create(ctx: PlatformContext): Promise<MaintenanceClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createMaintenanceClient(module.createHttpClientForPlatform(ctx));
}
