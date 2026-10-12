export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface FlowRow {
  processInstanceId: string;
  currentTaskId?: string;
  formNo?: string;
  instanceName?: string;
  startUserName?: string;
  startUserInfo?: { organizationName?: string };
  submitedTime?: number | string;
  status?: string;
  activeNodeName?: string;
  businessType?: string;
  [key: string]: unknown;
}

export interface OfficialRow {
  id: string;
  [key: string]: unknown;
}

export interface OptionItem {
  id?: string;
  code?: string;
  name: string;
  children?: OptionItem[];
  [key: string]: unknown;
}

export interface FlowQuery {
  pageNumber: number;
  pageSize: number;
  type: string;
  businessType: string;
  status?: string | null;
  submitTime?: string;
  organizationId?: string;
  username?: string;
}

export interface AllFlowQuery {
  pageNumber: number;
  pageSize: number;
  businessType?: string;
  submitTime?: string;
  organizationId?: string;
  username?: string;
  status?: string;
  applicationCode: "OFFICIAL_MANAGEMENT";
}

export interface StatisticQuery {
  pageNumber: number;
  pageSize: number;
  period: string;
}

export type StatisticKind = "system" | "seal" | "issue" | "documentReceived" | "keywork" | "focusWork" | "focusWorkChange";

export interface FocusWorkQuery {
  pageNumber: number;
  pageSize: number;
  period: string;
  status?: string | null;
  deptId?: string | null;
  firstUserId?: string | null;
  keyword?: string | null;
}

export interface FlowBusinessConfig {
  formDefinitionId: string;
  businessType?: string;
  businessTypeName?: string;
  formFlowId: string;
  fieldMapList: Record<string, unknown>[];
}

export interface GovernmentManagementClient {
  pageFlows(query: FlowQuery): Promise<PageResult<FlowRow>>;
  pageAllFlows(query: AllFlowQuery): Promise<PageResult<FlowRow>>;
  exportAllFlows(query: Omit<AllFlowQuery, "pageNumber" | "pageSize">): Promise<Blob>;
  pageFocusFlows(query: {
    businessType: string;
    type: string;
    submitTime: string;
    status?: string | null;
    pageNumber: number;
    pageSize: number;
  }): Promise<PageResult<OfficialRow>>;
  listOrganizations(): Promise<OptionItem[]>;
  listFirstUsers(): Promise<OptionItem[]>;

  pageStatistics(kind: StatisticKind, query: StatisticQuery): Promise<PageResult<OfficialRow>>;
  getStatisticDetail(kind: "system" | "seal" | "issue", id: string, query: StatisticQuery): Promise<PageResult<OfficialRow>>;
  exportStatistics(kind: StatisticKind, period: string): Promise<Blob>;

  pageSeals(query: { pageNumber: number; pageSize: number; sealName?: string }): Promise<PageResult<OfficialRow>>;
  addSeal(body: { sealName: string; sealDesc: string }): Promise<void>;
  updateSeal(id: string, body: { sealName: string; sealDesc: string }): Promise<void>;
  deleteSeal(id: string): Promise<void>;
  pageCategories(query: { pageNumber: number; pageSize: number; name?: string }): Promise<PageResult<OfficialRow>>;
  addCategory(body: { name: string; remark: string }): Promise<void>;
  updateCategory(id: string, body: { name: string; remark: string }): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  pageFocusWork(query: FocusWorkQuery): Promise<PageResult<OfficialRow>>;
  getFocusWorkDetail(id: string): Promise<OfficialRow>;
  getFocusWorkReplies(id: string): Promise<OfficialRow[]>;
  getFocusWorkFailure(id: string): Promise<OfficialRow>;
  replyFocusWork(body: { focusWorkId: string; fileIds: string; failReason: string }): Promise<void>;
  exportFocusWork(query: FocusWorkQuery): Promise<Blob>;

  listApprovalTypes(): Promise<OptionItem[]>;
  getBusinessFlow(code: string): Promise<string>;
  listFormFlows(query: { enable: boolean; application: string }): Promise<OptionItem[]>;
  getFormFlow(id: string): Promise<OfficialRow>;
  listFormFields(type: string): Promise<OptionItem[]>;
  saveFlowBusiness(body: FlowBusinessConfig): Promise<void>;
}
