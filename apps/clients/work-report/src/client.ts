import type { PlatformContext } from "@g2-composition/contract";
import type {
  ArrangeRow,
  FlowRow,
  FormFlow,
  OptionItem,
  PageResult,
  StatisticRow,
  TypeRow,
  WorkReportClient,
} from "@g2-contract/work-report";
export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(context: PlatformContext): HttpClient;
}

function url(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) {
      search.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return `/api${path}${search.size > 0 ? `?${search}` : ""}`;
}
function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 4 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
    const item = value as Record<string, unknown>;
    const envelope = "data" in item && ("code" in item || "success" in item || "message" in item || Object.keys(item).length === 1);
    if (!envelope) {
      break;
    }
    if (item.success === false || (item.code !== undefined && !["0", "200"].includes(String(item.code)))) {
      throw new Error(String(item.message ?? item.msg ?? "请求失败"));
    }
    value = item.data;
  }
  return value as T;
}
function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<unknown>(response);
  if (!value || typeof value !== "object") {
    throw new Error("分页接口返回格式错误");
  }
  const item = value as { records?: T[]; data?: { records?: T[] }; total?: number; pages?: number };
  const records = item.records ?? item.data?.records;
  if (!Array.isArray(records)) {
    throw new TypeError("分页接口返回格式错误");
  }
  return { records, total: Number(item.total ?? 0), pages: Number(item.pages ?? 0) };
}
function list<T>(response: unknown): T[] {
  const value = unwrap<unknown>(response);
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value === null || value === undefined) {
    return [];
  }
  throw new Error("列表接口返回格式错误");
}
const idPath = (id: string) => encodeURIComponent(id);

export function createWorkReportClient(http: HttpClient): WorkReportClient {
  return {
    pageTypes: async (kind, query) =>
      page<TypeRow>(await http.get(url(kind === "report" ? "/report/report-type-page" : "/report/work-plan-type/page", query))),
    createType: async (kind, body) => {
      unwrap(await http.post(url(kind === "report" ? "/report/report-type-add" : "/report/work-plan-type"), body));
    },
    updateType: async (kind, id, body) => {
      unwrap(
        await http.put(url(kind === "report" ? "/report/report-type-update" : `/report/work-plan-type/${idPath(id)}`), { ...body, id }),
      );
    },
    setTypeStatus: async (kind, id, status) => {
      // 旧安排类型状态接口存在双斜线，沿用已部署服务的 URL 契约。
      unwrap(
        await http.put(url(`${kind === "report" ? "/report/report-type/" : "/report//work-plan-type/"}${idPath(id)}`, { status }), {
          id,
          status,
        }),
      );
    },
    deleteType: async (kind, id) => {
      unwrap(await http.delete(url(`${kind === "report" ? "/report/report-type/" : "/report/work-plan-type/"}${idPath(id)}`)));
    },
    listArrangeTypes: async () => list<TypeRow>(await http.get(url("/report/work-plan-type/list", { status: true }))),
    listOrganizations: async () => list<OptionItem>(await http.get(url("/ouaa/authenticated/organizations/list"))),
    pageFlows: async (query) => page<FlowRow>(await http.get(url("/flow/process/instance/historical/page", query))),
    pageReports: async (query) => page<FlowRow>(await http.get(url("/report/report-page", query))),
    pageArrangements: async (query) => page<ArrangeRow>(await http.get(url("/report/work-plan/page", query))),
    getArrangement: async (id) => unwrap<ArrangeRow>(await http.get(url(`/report/work-plan/${idPath(id)}`))),
    createArrangement: async (body) => {
      unwrap(await http.post(url("/report/work-plan"), body));
    },
    deleteArrangement: async (id) => {
      unwrap(await http.delete(url(`/report/work-plan/${idPath(id)}`)));
    },
    pageStatistics: async (query) => page<StatisticRow>(await http.get(url("/report/report-statistics-pc", query))),
    exportStatistics: async (query) => {
      const result = unwrap<unknown>(await http.post(url("/report/report-statistics-export-pc"), query));
      if (!(result instanceof Blob)) {
        throw new Error("导出接口未返回文件流");
      }
      return result;
    },
    listFormFlows: async () => list<OptionItem>(await http.get(url("/flow/form-flow/list", { enable: true, application: "WORK_REPORT" }))),
    listReportFields: async () => list<OptionItem>(await http.get(url("/report/report-field"))),
    getBusinessFlow: async () => String(unwrap<unknown>(await http.get(url("/flow/form-flow-business/REPORT/flow"))) ?? ""),
    getFormFlow: async (id) => unwrap<FormFlow>(await http.get(url(`/flow/form-flow/${idPath(id)}`, { id }))),
    saveFlowBusiness: async (body) => {
      unwrap(await http.post(url("/flow/form-flow-business"), body));
    },
  };
}
export async function create(context: PlatformContext): Promise<WorkReportClient> {
  const module = (await context.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createWorkReportClient(module.createHttpClientForPlatform(context));
}
export type { WorkReportClient };
