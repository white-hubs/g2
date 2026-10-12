import type { PlatformContext } from "@g2-composition/contract";

/** 委外维修单流程列表行，字段取自旧 `views/repair/repairList/list.vue` 的列定义。 */
export interface OutsourceRecord {
  id?: string | number;
  code?: string;
  instanceName?: string;
  objName?: string;
  submitedTime?: string | number;
  startUserName?: string;
  status?: string;
  activeNodeName?: string;
  /** 旧页处理结果列用 `handleResult`，与故障报修的 `result` 不同。 */
  handleResult?: string;
  activeNodeAssignee?: string;
  processInstanceId?: string;
  currentTaskId?: string;
  [key: string]: unknown;
}

export interface OutsourcePage<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface OutsourceQuery {
  pageNumber?: number;
  pageSize?: number;
  businessType?: string;
  type?: string;
  status?: string;
  submitTime?: string;
}

/** 委外模式。 */
export interface OutsourceMode {
  id?: string | number;
  name: string;
}

/** 委外公司；列表返回 `outsourceModel` / `outsourceScope` 名称数组，提交用 IdList。 */
export interface OutsourceCompany {
  id?: string | number;
  name?: string;
  outsourceModel?: { id?: string | number; name?: string }[];
  outsourceScope?: { id?: string | number; name?: string }[];
  outsourceModelIdList?: string[];
  outsourceScopeIdList?: string[];
  responsiblePerson?: string;
  responsiblePersonPhone?: string;
  [key: string]: unknown;
}

/** 委外设备台账行。 */
export interface OutsourceDevice {
  deviceId?: string;
  deviceCode?: string;
  deviceName?: string;
  deviceCategory?: string;
  deviceBrand?: string;
  areaName?: string;
  [key: string]: unknown;
}

export interface OutsourceDeviceQuery {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  applicationCode?: string;
}

/** 通知方式枚举，旧页字段映射 `{ nodeModelName: label, notModel: value }`。 */
export interface OutsourceNotifyChannel {
  nodeModelName?: string;
  notModel?: string;
  [key: string]: unknown;
}

/** 管理人员配置行：MANAGEMENT / DEPARTMENT / POST / PERSONNAL。 */
export interface OutsourceManagerConfig {
  mgmtType: string;
  mgmtValues: string[];
}

/** 故障自动生成委外的开关与去重设置。 */
export interface OutsourceDeDuplicationConfig {
  switchSetting: boolean;
  duration: number | null;
  deDuplicationPeriod: number | null;
}

export interface OutsourceTrafficConfig {
  id?: string | number | "";
  channelTypes: string[];
  configs: OutsourceManagerConfig[];
  deDuplicationConfig: OutsourceDeDuplicationConfig;
}

export interface SatMsgChannelConfig {
  terminal?: string;
  channelType?: string;
  terminalName?: string;
}

export interface SatMsgConfig {
  id?: string | number;
  satMsgDefineCode?: string;
  effectiveDays?: number;
  name?: string;
  notifyExpression?: string;
  enabled?: boolean;
  msgTmpContent?: string;
  satMsgChannelConfigVOS?: SatMsgChannelConfig[];
  satMsgChannelConfigModifyParams?: SatMsgChannelConfig[];
}

/** 委外维修工单行，字段取自旧 `views/repair/repairOrder/list.vue` 的列定义。 */
export interface OutsourceTicket {
  id?: string | number;
  code?: string;
  deviceObjectName?: string;
  outsourceCompanyName?: string;
  outsourceModelName?: string;
  createTime?: string | number;
  ticketStatus?: string;
  handleResult?: string;
  /** 旧页「评价」按钮的可用性由后端下发（注意旧字段名多了个 ed）。 */
  isCanAssessmented?: boolean;
  /** 工单详情附带的委外维修单信息。 */
  applicationReceiptId?: string;
  repairReceiptName?: string;
  /** 工单详情用 `status` 判断是否可验收，列表用 `ticketStatus`。 */
  status?: string;
  taskId?: string;
  checkProcessEvent?: OutsourceProcessEvent[];
  [key: string]: unknown;
}

export interface OutsourceTicketQuery {
  pageNumber?: number;
  pageSize?: number;
  outsourceCompanyId?: string;
  ticketStatus?: string;
  name?: string;
  /** 旧 g-table `defaultDate: "period"`：`开始 00:00:00,结束 23:59:59`。 */
  period?: string;
}

/** 工单评价提交体，旧页 `repairOrderEval`。 */
export interface OutsourceTicketAssessment {
  outsourceRepairTicketId?: string | number;
  score?: number | string;
  description?: string;
  imageIdList?: string[];
  /** 回显用：后端返回已上传图片。 */
  imageList?: { id?: string; path?: string }[];
  [key: string]: unknown;
}

/** 流程时间线节点，旧页 steps 的数据源。 */
export interface OutsourceProcessEvent {
  id?: string;
  action?: string;
  createBy?: string;
  createTime?: string;
  handleUserName?: string;
  taskId?: string;
  [key: string]: unknown;
}

/** 三段流程事件线：申请 / 处理 / 验收。 */
export interface OutsourceReceiptEventLine {
  checkProcessEvent?: OutsourceProcessEvent[];
  handleProcessEvent?: OutsourceProcessEvent[];
  acceptanceProcessEvent?: OutsourceProcessEvent[];
}

/** 委外确认信息，旧 `repairList/details.vue` 的 `confirmInfo`。 */
export interface OutsourceConfirmInfo {
  confirmUsername?: string;
  confirmResult?: string;
  confirmTime?: string;
  outsourceCompanyName?: string;
  outsourceModelName?: string;
  applicationCheckProcessName?: string;
  acceptanceProcessName?: string;
  taskId?: string;
  [key: string]: unknown;
}

/** 委外维修单（申请单）详情。 */
export interface OutsourceReceipt {
  id?: string | number;
  code?: string;
  name?: string;
  deviceObjectName?: string;
  faultTime?: string;
  submitUserName?: string;
  createTime?: string;
  repairReason?: string;
  files?: { id?: string; path?: string; name?: string }[];
  status?: string;
  ticketId?: string;
  taskId?: string;
  waitConfirmUsers?: { id?: string; name?: string }[];
  confirmInfo?: OutsourceConfirmInfo;
  isCanConfirm?: boolean;
  isCanAcceptance?: boolean;
  isCanAssessment?: boolean;
  isCanCheck?: boolean;
  [key: string]: unknown;
}

/** 维修确认提交体，旧页 `repairListConfirm`。 */
export interface OutsourceReceiptConfirmPayload {
  applicationReceiptId?: string;
  confirmResult?: string;
  outsourceCompanyId?: string;
  outsourceModelId?: string;
  applicationCheckProcessKey?: string;
  acceptanceProcessKey?: string;
  description?: string;
  imageIdList?: string[];
}

/** 流程任务表单项（`formItemVOS`）。 */
export interface ProcessFormItem {
  id?: string;
  name?: string;
  type?: string;
  defaultValue?: string;
  [key: string]: unknown;
}

/** `GET /api/process/form/task/{taskId}` 返回的待处理表单。 */
export interface ProcessTaskForm {
  id?: string;
  formName?: string;
  actions?: string[];
  formItemVOS?: ProcessFormItem[];
  /** 旧页把自定义表单设计 JSON 放在 `definition`（字符串）。 */
  definition?: string;
  [key: string]: unknown;
}

/** `POST /api/process/user-tasks/complete` 提交体。 */
export interface ProcessTaskCompletePayload {
  taskId?: string;
  outcome?: string;
  formValueModifyParam?: {
    processId?: string;
    formId?: string;
    formValues?: { formItemId?: string; val?: unknown }[];
    formData?: unknown[];
  };
}

/** 流程定义下拉项，旧 g-select `field: { name: "label", key: "value" }`。 */
export interface ProcessDefinition {
  id?: string;
  key?: string;
  name?: string;
  [key: string]: unknown;
}

/** 已办结节点的表单回显，旧页 `processForm`。 */
export interface ProcessEventForm {
  formName?: string;
  operation?: string;
  formValues?: { formItemId?: string; formItemName?: string; val?: unknown }[];
  formData?: unknown;
  [key: string]: unknown;
}

export interface OutsourceRepairClient {
  pagePersonal(query: OutsourceQuery): Promise<OutsourcePage<OutsourceRecord>>;
  listModes(): Promise<OutsourceMode[]>;
  createMode(value: OutsourceMode): Promise<void>;
  updateMode(value: OutsourceMode & { id: string | number }): Promise<void>;
  deleteMode(id: string | number): Promise<void>;
  listCompanies(): Promise<OutsourceCompany[]>;
  getCompany(id: string | number): Promise<OutsourceCompany>;
  createCompany(value: OutsourceCompany): Promise<void>;
  updateCompany(value: OutsourceCompany & { id: string | number }): Promise<void>;
  deleteCompany(id: string | number): Promise<void>;
  pageDevices(query: OutsourceDeviceQuery): Promise<OutsourcePage<OutsourceDevice>>;
  importDevices(deviceInstanceIds: string[]): Promise<void>;
  removeDevice(deviceId: string | number): Promise<void>;
  batchRemoveDevices(deviceInstanceIds: string[]): Promise<void>;
  listNotifyChannels(): Promise<OutsourceNotifyChannel[]>;
  getTrafficConfig(): Promise<OutsourceTrafficConfig | undefined>;
  saveTrafficConfig(value: OutsourceTrafficConfig): Promise<void>;
  listSatMsgConfigs(satMsgDefineCodes: string): Promise<SatMsgConfig[]>;
  createSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
  updateSatMsgConfigs(configs: SatMsgConfig[]): Promise<void>;
  pageTickets(query: OutsourceTicketQuery): Promise<OutsourcePage<OutsourceTicket>>;
  getTicket(id: string | number): Promise<OutsourceTicket>;
  submitTicketAssessment(value: OutsourceTicketAssessment): Promise<void>;
  getTicketAssessment(ticketId: string | number): Promise<OutsourceTicketAssessment | undefined>;
  getReceipt(id: string | number): Promise<OutsourceReceipt>;
  deleteReceipt(id: string | number): Promise<void>;
  confirmReceipt(value: OutsourceReceiptConfirmPayload): Promise<void>;
  getReceiptEventLine(receiptId: string | number): Promise<OutsourceReceiptEventLine>;
  getProcessTaskForm(taskId: string | number): Promise<ProcessTaskForm | undefined>;
  completeProcessTask(value: ProcessTaskCompletePayload): Promise<void>;
  listProcessDefinitions(): Promise<ProcessDefinition[]>;
  getProcessForm(eventId: string | number): Promise<ProcessEventForm | undefined>;
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
const OUTSOURCE = `${MAINTAIN}/outsource`;
const MESSAGE = "/api/message";
const PROCESS = "/api/process";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    // 旧仓 axios 使用 `qs.stringify(params, { indices: false })`，数组重复同名参数。
    if (Array.isArray(value)) {
      for (const item of value) {
        search.append(key, String(item));
      }
      continue;
    }
    search.set(key, String(value));
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let i = 0; i < 4 && value && typeof value === "object" && !(value instanceof Blob); i++) {
    const record = value as Record<string, unknown>;
    if (record.success === false || (record.code !== undefined && !["0", "200"].includes(String(record.code)))) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    if (!("data" in record)) {
      break;
    }
    value = record.data;
  }
  return value as T;
}

function asPage<T>(response: unknown): OutsourcePage<T> {
  const value = unwrap<Partial<OutsourcePage<T>>>(response);
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

const idPath = (id: string | number): string => encodeURIComponent(String(id));

export function createOutsourceRepairClient(http: HttpClient): OutsourceRepairClient {
  return {
    pagePersonal: async (query) => asPage<OutsourceRecord>(await http.get(withQuery(`${OUTSOURCE}/apply/personal`, query))),
    listModes: async () => asList<OutsourceMode>(await http.get(`${OUTSOURCE}/model/list`)),
    createMode: async (value) => {
      unwrap(await http.post(`${OUTSOURCE}/model`, value));
    },
    // 旧 g-table 编辑与 Apifox 均为 PUT `/model`（body 带 id）。
    updateMode: async (value) => {
      unwrap(await http.put(`${OUTSOURCE}/model`, value));
    },
    deleteMode: async (id) => {
      unwrap(await http.delete(`${OUTSOURCE}/model/${idPath(id)}`));
    },
    listCompanies: async () => asList<OutsourceCompany>(await http.get(`${OUTSOURCE}/company/list`)),
    getCompany: async (id) => unwrap<OutsourceCompany>(await http.get(`${OUTSOURCE}/company/${idPath(id)}`)),
    createCompany: async (value) => {
      unwrap(await http.post(`${OUTSOURCE}/company`, value));
    },
    // 旧 g-table 编辑与 Apifox 契约均为 PUT `/company/change`。
    updateCompany: async (value) => {
      unwrap(await http.put(`${OUTSOURCE}/company/change`, value));
    },
    deleteCompany: async (id) => {
      unwrap(await http.delete(`${OUTSOURCE}/company/${idPath(id)}`));
    },
    pageDevices: async (query) => asPage<OutsourceDevice>(await http.get(withQuery(`${OUTSOURCE}/device/list`, query))),
    // 旧页把设备 ID 放在 query 上 POST，不是请求体。
    importDevices: async (deviceInstanceIds) => {
      unwrap(await http.post(withQuery(`${OUTSOURCE}/device/import`, { deviceInstanceIds })));
    },
    removeDevice: async (deviceId) => {
      unwrap(await http.delete(`${OUTSOURCE}/device/instance/${idPath(deviceId)}`));
    },
    batchRemoveDevices: async (deviceInstanceIds) => {
      unwrap(await http.post(`${OUTSOURCE}/device/batchRemove`, { deviceInstanceIds }));
    },
    listNotifyChannels: async () => asList<OutsourceNotifyChannel>(await http.get(`${OUTSOURCE}/receipt/confirm-user/notify-channels`)),
    getTrafficConfig: async () => unwrap<OutsourceTrafficConfig | undefined>(await http.get(`${OUTSOURCE}/receipt/confirm-user`)),
    saveTrafficConfig: async (value) => {
      unwrap(await http.post(`${OUTSOURCE}/receipt/collocate-confirm-user`, value));
    },
    listSatMsgConfigs: async (satMsgDefineCodes) =>
      asList<SatMsgConfig>(await http.get(`${MESSAGE}/sat-msg-configs?satMsgDefineCodes=${encodeURIComponent(satMsgDefineCodes)}`)),
    // 旧页把整批规则包在 `params` 字段里提交，新增/更新共用同一路径。
    createSatMsgConfigs: async (configs) => {
      unwrap(await http.post(`${MESSAGE}/sat-msg-config`, { params: configs }));
    },
    updateSatMsgConfigs: async (configs) => {
      unwrap(await http.put(`${MESSAGE}/sat-msg-config`, { params: configs }));
    },
    pageTickets: async (query) => asPage<OutsourceTicket>(await http.get(withQuery(`${OUTSOURCE}/repair/ticket/page`, query))),
    getTicket: async (id) => unwrap<OutsourceTicket>(await http.get(`${OUTSOURCE}/repair/ticket/${idPath(id)}`)),
    submitTicketAssessment: async (value) => {
      unwrap(await http.post(`${OUTSOURCE}/repair/ticket/assessment`, value));
    },
    // 旧页以 `ticketId` 作为查询参数读取已提交的评价，无评价时返回空。
    getTicketAssessment: async (ticketId) =>
      unwrap<OutsourceTicketAssessment | undefined>(await http.get(withQuery(`${OUTSOURCE}/repair/ticket/assessment`, { ticketId }))),
    getReceipt: async (id) => unwrap<OutsourceReceipt>(await http.get(`${OUTSOURCE}/repair/application/receipt/${idPath(id)}`)),
    deleteReceipt: async (id) => {
      unwrap(await http.delete(`${OUTSOURCE}/repair/application/receipt/${idPath(id)}`));
    },
    confirmReceipt: async (value) => {
      unwrap(await http.post(`${OUTSOURCE}/repair/application/confirm`, value));
    },
    // 旧页三段流程（申请/处理/验收）共用改造域的事件线接口。
    getReceiptEventLine: async (receiptId) =>
      unwrap<OutsourceReceiptEventLine | undefined>(await http.get(withQuery(`${MAINTAIN}/retrofit/receipt/event-line`, { receiptId }))) ??
      {},
    getProcessTaskForm: async (taskId) => unwrap<ProcessTaskForm | undefined>(await http.get(`${PROCESS}/form/task/${idPath(taskId)}`)),
    completeProcessTask: async (value) => {
      unwrap(await http.post(`${PROCESS}/user-tasks/complete`, value));
    },
    listProcessDefinitions: async () => asList<ProcessDefinition>(await http.get(`${PROCESS}/process-definition/list`)),
    // 旧 `processForm` 走事件维度的表单值接口（`/form-value/event/{eventId}`），不是任务维度。
    getProcessForm: async (eventId) =>
      unwrap<ProcessEventForm | undefined>(await http.get(`${PROCESS}/form-value/event/${idPath(eventId)}`)),
  };
}

export async function create(ctx: PlatformContext): Promise<OutsourceRepairClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createOutsourceRepairClient(module.createHttpClientForPlatform(ctx));
}
