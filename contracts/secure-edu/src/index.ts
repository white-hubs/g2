/** 安全教育服务的 BFF 根路径。页面不得直连旧 `/api`。 */
export const SECURE_EDU_BFF_BASE_PATH = "/gw-bff/secure-edu";

/**
 * 原应用实际使用的上游地址白名单。保持显式清单，避免通配代理成为 SSRF 入口。
 * 其中 safety-education 覆盖总部、市场和公共安全教育接口。
 */
export const SECURE_EDU_ALLOWED_UPSTREAM_PREFIXES = [
  "/api/safety-education",
  "/api/dataintegrate/market-config",
  "/api/safety-management/education/market-task-urls",
  "/api/safety-management/education/market-task-url/",
  "/api/safety-management/public/education/market-task-url/detail",
] as const;

export type SecureEduUpstreamPath =
  | `/api/safety-education${string}`
  | "/api/dataintegrate/market-config/list"
  | `/api/safety-management/education/market-task-urls${string}`
  | `/api/safety-management/education/market-task-url/${string}`
  | "/api/safety-management/public/education/market-task-url/detail";

export interface PageResult<T> {
  records: T[];
  total: number;
  pages?: number;
}

export interface SecureEduClient {
  market: SecureEduMarketClient;
  get<T>(path: SecureEduUpstreamPath, query?: Record<string, unknown>): Promise<T>;
  post<T>(path: SecureEduUpstreamPath, body?: unknown): Promise<T>;
  put<T>(path: SecureEduUpstreamPath, body?: unknown): Promise<T>;
  delete<T>(path: SecureEduUpstreamPath, query?: Record<string, unknown>): Promise<T>;
  /** 经 BFF 透传二进制，适用于试题模板和记录导出。 */
  download(path: SecureEduUpstreamPath, body?: unknown, method?: "GET" | "POST"): Promise<Blob>;
  /** 仅用于展示 BFF 下载地址；实际下载必须调用 download 以附带认证。 */
  downloadUrl(path: SecureEduUpstreamPath, query?: Record<string, unknown>): string;
}

export type EduResource =
  | "training-task"
  | "exam-task"
  | "test-paper-manage"
  | "courseware"
  | "question"
  | "theme"
  | "paper-question-rule"
  | "training-count"
  | "exam-count"
  | "training-details"
  | "exam-details";
export interface QuestionOption {
  sort: number;
  optionID: string;
  optionTitle: string;
  isRight: boolean;
  isCheck: boolean;
}
export interface EduMessageRule extends Record<string, unknown> {
  satMsgDefineCode: string;
  notifyExpression: string;
  enabled?: boolean;
  effectiveDays?: number;
  msgTmpContent: string;
  satMsgChannelConfigModifyParams: { channelType: string; terminal: string; terminalName: string }[];
}
export interface SecureEduMarketClient {
  page(resource: EduResource, query: Record<string, unknown>): Promise<PageResult<SecureEduRecord>>;
  detail(resource: EduResource, id: string): Promise<SecureEduRecord>;
  taskPaper(taskId: string, paperId: string, headquarters?: boolean): Promise<SecureEduRecord>;
  save(resource: EduResource, body: Record<string, unknown>, id?: string): Promise<unknown>;
  remove(resource: EduResource, id: string): Promise<unknown>;
  setPublished(resource: "training-task" | "exam-task", id: string, published: boolean): Promise<unknown>;
  themes(): Promise<SecureEduRecord[]>;
  rules(): Promise<SecureEduRecord[]>;
  overview(period: string, yearPeriod: string): Promise<Record<string, unknown>>;
  export(resource: EduResource, query: Record<string, unknown>): Promise<Blob>;
  questionTemplate(): Promise<Blob>;
  importQuestions(file: Blob): Promise<Record<string, unknown>>;
  exportImportErrors(rows: Record<string, unknown>[]): Promise<Blob>;
  messages(): Promise<SecureEduRecord[]>;
  saveMessages(params: EduMessageRule[], create: boolean): Promise<unknown>;
}

export interface SecureEduRecord {
  id: string;
  [key: string]: unknown;
}
