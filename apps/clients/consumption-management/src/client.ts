import type * as CompositionContract from "@g2-composition/contract";
import type {
  AccountDetail,
  AccountRow,
  AccountStatusOption,
  AmountChangeRow,
  ChangeStatistics,
  ConsumeAccountInfo,
  ConsumeRecordRow,
  ConsumptionManagementClient,
  CopiesChangeRow,
  PageResult,
  TransactionOption,
} from "@g2-contract/consumption-management";

export interface HttpClient {
  get(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: CompositionContract.PlatformContext): HttpClient;
}

const ONE_CARD = "/api/onecard";

function withQuery(path: string, query?: object, retainEmptyFields: readonly string[] = []): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || (value === "" && !retainEmptyFields.includes(key))) {
      continue;
    }
    search.set(key, String(value));
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function isEnvelope(value: Record<string, unknown>): boolean {
  if (!("data" in value)) {
    return false;
  }
  if (typeof value.success === "boolean" || "message" in value || "msg" in value) {
    return true;
  }
  const code = Number(value.code);
  return Number.isFinite(code) && (code === 0 || (code >= 100 && code < 600));
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 3 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
    const record = value as Record<string, unknown>;
    if (!isEnvelope(record)) {
      break;
    }
    if (record.success === false || (record.code !== undefined && !["0", "200"].includes(String(record.code)))) {
      throw new Error(String(record.message ?? record.msg ?? record.errorMessage ?? "请求失败"));
    }
    value = record.data;
  }
  return value as T;
}

function list<T>(response: unknown): T[] {
  const value = unwrap<unknown>(response);
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object" && Array.isArray((value as { records?: unknown }).records)) {
    return (value as { records: T[] }).records;
  }
  if (value === null || value === undefined) {
    return [];
  }
  throw new Error("列表接口返回格式错误");
}

function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<unknown>(response);
  if (!value || typeof value !== "object" || !Array.isArray((value as { records?: unknown }).records)) {
    throw new Error("分页接口返回格式错误");
  }
  const result = value as { records: T[]; total?: number; pages?: number };
  return { records: result.records, total: Number(result.total ?? 0), pages: Number(result.pages ?? 0) };
}

function blob(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("导出接口未返回文件流");
  }
  return value;
}

export function createConsumptionManagementClient(http: HttpClient): ConsumptionManagementClient {
  return {
    pageAccounts: async (query) => page<AccountRow>(await http.get(withQuery(`${ONE_CARD}/accountInfo`, query))),
    getAccountDetail: async (id) => unwrap<AccountDetail>(await http.get(`${ONE_CARD}/account-details/${encodeURIComponent(id)}`)),
    listAccountStatuses: async () => list<AccountStatusOption>(await http.get(`${ONE_CARD}/account-status`)),

    pageAmountChanges: async (query) => page<AmountChangeRow>(await http.get(withQuery(`${ONE_CARD}/amount-change-record`, query))),
    pageCopiesChanges: async (query) => page<CopiesChangeRow>(await http.get(withQuery(`${ONE_CARD}/copies-change-record`, query))),
    listTransactionTypes: async () => list<TransactionOption>(await http.get(`${ONE_CARD}/transaction-type`)),
    getAmountChangeClassification: async (query) =>
      unwrap<ChangeStatistics>(await http.get(withQuery(`${ONE_CARD}/amount-change-classification`, query))),
    getShareStatistics: async (query) => unwrap<ChangeStatistics>(await http.get(withQuery(`${ONE_CARD}/share-statistics`, query))),
    // 旧导出源码把 `/api` 和 `onecard` 直接拼接成 `/apionecard`；这里使用与其他接口一致的真实服务前缀。
    exportAmountChanges: async (query) => blob(await http.get(withQuery(`${ONE_CARD}/amount-record-excel`, query))),
    exportCopiesChanges: async (query) => blob(await http.get(withQuery(`${ONE_CARD}/copies-record-excel`, query))),

    listConsumeRecordTypes: async () => list<TransactionOption>(await http.get(`${ONE_CARD}/consume-record-out/record-type`)),
    // 旧页始终传入空 enterParam；该字段不能被通用查询序列化规则省略。
    pageConsumeRecords: async (query) =>
      page<ConsumeRecordRow>(
        await http.get(withQuery(`${ONE_CARD}/consume-record-out/page`, { ...query, enterParam: "" }, ["enterParam"])),
      ),
    getConsumeAccountInfo: async (id) =>
      unwrap<ConsumeAccountInfo>(await http.get(withQuery(`${ONE_CARD}/account-info/${encodeURIComponent(String(id))}`, { id }))),
  };
}

export async function create(ctx: CompositionContract.PlatformContext): Promise<ConsumptionManagementClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createConsumptionManagementClient(module.createHttpClientForPlatform(ctx));
}

export type { ConsumptionManagementClient };
