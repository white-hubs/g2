import type { PlatformContext } from "@g2-composition/contract";

/** 更新改造单流程列表行，字段取自旧 `renovationList/list.vue`。 */
export interface RenovationRecord {
  id?: string | number;
  code?: string;
  instanceName?: string;
  objName?: string;
  submitedTime?: string | number;
  startUserName?: string;
  status?: string;
  activeNodeName?: string;
  handleResultName?: string;
  processInstanceId?: string;
  currentTaskId?: string;
  [key: string]: unknown;
}

export interface RenovationPage<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface RenovationQuery {
  pageNumber?: number;
  pageSize?: number;
  businessType?: string;
  type?: string;
  status?: string;
  submitTime?: string;
}

/** 更新改造工单行，字段取自旧 `renovationOrder/list.vue`。 */
export interface RenovationTicket {
  id?: string | number;
  code?: string;
  retrofitObjectName?: string;
  expectSolveDate?: string | number;
  createTime?: string | number;
  status?: string;
  retrofitTicketStatus?: string;
  handleResultStatusName?: string;
  isCanHandle?: boolean;
  isCanAssessmented?: boolean;
  assessment?: RenovationTicketAssessment;
  processEventList?: RenovationProcessEvent[];
  [key: string]: unknown;
}

export interface RenovationTicketQuery {
  pageNumber?: number;
  pageSize?: number;
  /** 旧页 `retrofitTicketStatus`：WAITING_HANDLE / COMPLETED；「所有」不传。 */
  retrofitTicketStatus?: string;
  /** 旧 g-table `defaultDate: "period"`。 */
  period?: string;
  keyword?: string;
}

export interface RenovationTicketAssessment {
  retrofitTicketId?: string | number;
  score?: number | string;
  description?: string;
  imageIdList?: string[];
  imageList?: { id?: string; path?: string }[];
  preAttribute?: RenovationAttributeStatus[];
  afterAttribute?: RenovationAttributeStatus[];
  [key: string]: unknown;
}

export interface RenovationAttributeStatus {
  id?: string;
  name?: string;
  value?: string;
  isNormal?: boolean;
}

export interface RenovationProcessEvent {
  id?: string;
  action?: string;
  createBy?: string;
  createTime?: string;
  [key: string]: unknown;
}

/** 通知方式枚举，旧页 `{ nodeModelName: label, notModel: value }`。 */
export interface RenovationNotifyChannel {
  nodeModelName?: string;
  notModel?: string;
  [key: string]: unknown;
}

export interface RenovationManagerConfig {
  mgmtType: string;
  mgmtValues: string[];
}

export interface RenovationTrafficConfig {
  id?: string | number | "";
  channelTypes: string[];
  configs: RenovationManagerConfig[];
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

/** 更新改造申请单详情（旧 `retrofit/receipt`）。 */
export interface RenovationReceipt {
  id?: string | number;
  code?: string;
  name?: string;
  [key: string]: unknown;
}

export interface RenovationClient {
  /** 更新改造 2.0 流程列表：`/api/maintain/retrofit-order/page`。 */
  pageOrders(query: RenovationQuery): Promise<RenovationPage<RenovationRecord>>;
  pageTickets(query: RenovationTicketQuery): Promise<RenovationPage<RenovationTicket>>;
  getTicket(id: string | number): Promise<RenovationTicket>;
  deleteTicket(id: string | number): Promise<void>;
  submitTicketAssessment(value: RenovationTicketAssessment): Promise<void>;
  getReceipt(id: string | number): Promise<RenovationReceipt>;
  listNotifyChannels(): Promise<RenovationNotifyChannel[]>;
  getTrafficConfig(): Promise<RenovationTrafficConfig | undefined>;
  saveTrafficConfig(value: RenovationTrafficConfig): Promise<void>;
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
const RETROFIT = `${MAINTAIN}/retrofit`;
const MESSAGE = "/api/message";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
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

function asPage<T>(response: unknown): RenovationPage<T> {
  const value = unwrap<Partial<RenovationPage<T>>>(response);
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

export function createRenovationClient(http: HttpClient): RenovationClient {
  return {
    // 旧 `renovationOrderPage`：更新改造 2.0 流程分页。
    pageOrders: async (query) => asPage<RenovationRecord>(await http.get(withQuery(`${MAINTAIN}/retrofit-order/page`, query))),
    pageTickets: async (query) => asPage<RenovationTicket>(await http.get(withQuery(`${RETROFIT}/ticket/page`, query))),
    getTicket: async (id) => unwrap<RenovationTicket>(await http.get(`${RETROFIT}/ticket/${idPath(id)}`)),
    deleteTicket: async (id) => {
      unwrap(await http.delete(`${RETROFIT}/ticket/${idPath(id)}`));
    },
    submitTicketAssessment: async (value) => {
      unwrap(await http.post(`${RETROFIT}/ticket/assessment`, value));
    },
    getReceipt: async (id) => unwrap<RenovationReceipt>(await http.get(`${RETROFIT}/receipt/${idPath(id)}`)),
    listNotifyChannels: async () => asList<RenovationNotifyChannel>(await http.get(`${RETROFIT}/ticket/confirm-user/notify-channels`)),
    getTrafficConfig: async () => unwrap<RenovationTrafficConfig | undefined>(await http.get(`${RETROFIT}/ticket/confirm-user`)),
    saveTrafficConfig: async (value) => {
      unwrap(await http.post(`${RETROFIT}/ticket/collocate-confirm-user`, value));
    },
    listSatMsgConfigs: async (satMsgDefineCodes) =>
      asList<SatMsgConfig>(await http.get(`${MESSAGE}/sat-msg-configs?satMsgDefineCodes=${encodeURIComponent(satMsgDefineCodes)}`)),
    createSatMsgConfigs: async (configs) => {
      unwrap(await http.post(`${MESSAGE}/sat-msg-config`, { params: configs }));
    },
    updateSatMsgConfigs: async (configs) => {
      unwrap(await http.put(`${MESSAGE}/sat-msg-config`, { params: configs }));
    },
  };
}

export async function create(ctx: PlatformContext): Promise<RenovationClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createRenovationClient(module.createHttpClientForPlatform(ctx));
}
