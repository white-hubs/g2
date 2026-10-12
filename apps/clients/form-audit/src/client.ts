import type { PlatformContext } from "@g2-composition/contract";
import type {
  AppraisalDraftOption,
  AppraisalRecordDetail,
  AppraisalRecordGroup,
  AppraisalRule,
  AppraisalStatistics,
  Department,
  FlowProcess,
  FormAuditClient,
  FormFlow,
  FormGroup,
  FormGroupCount,
  PageResult,
  WorkOrderStatistics,
} from "@g2-contract/form-audit";

interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}
interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const FLOW = "/api/flow";
const APPRAISAL = "/api/form-appraisals";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, Array.isArray(value) ? value.join(",") : String(value));
    }
  }
  return search.size > 0 ? `${path}?${search}` : path;
}
function idPath(id: string | number): string {
  return encodeURIComponent(String(id));
}
function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 4 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
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
function page<T>(response: unknown): PageResult<T> {
  const value = unwrap<Partial<PageResult<T>>>(response);
  return {
    records: Array.isArray(value?.records) ? value.records : [],
    total: Number(value?.total ?? 0),
    pages: Number(value?.pages ?? 0),
  };
}
function list<T>(response: unknown): T[] {
  const value = unwrap<T[] | { records?: T[] }>(response);
  return Array.isArray(value) ? value : Array.isArray(value?.records) ? value.records : [];
}
function blob(response: unknown): Blob {
  const value = unwrap<unknown>(response);
  if (!(value instanceof Blob)) {
    throw new Error("导出接口未返回文件流");
  }
  return value;
}

export function createFormAuditClient(http: HttpClient): FormAuditClient {
  return {
    pageBusinessForms: async (query) => page<FormFlow>(await http.get(withQuery(`${FLOW}/form-flow/type/page`, query))),
    pageInspectPlanDrafts: async (query) =>
      page<AppraisalDraftOption>(
        await http.get(
          withQuery("/api/maintain/inspect-plan/pageV2", {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            keywords: query.keyword,
          }),
        ),
      ),
    pageMaintenancePlanDrafts: async (query) =>
      page<AppraisalDraftOption>(
        await http.get(
          withQuery("/api/maintain/select-maintenance-plan", {
            pageNumber: query.pageNumber,
            pageSize: query.pageSize,
            maintenancePlanName: query.keyword,
          }),
        ),
      ),
    pageFormFlows: async (query) => page<FormFlow>(await http.get(withQuery(`${FLOW}/custom-form-flow/page`, query))),
    getFormFlow: async (id) => unwrap(await http.get(`${FLOW}/form-flow/${idPath(id)}`)),
    updateFormFlowEnabled: async (id, enabled) =>
      unwrap(await http.put(withQuery(`${FLOW}/custom-form-flow/enable`, { id, enable: enabled }))),
    deleteFormFlow: async (id) => {
      unwrap(await http.delete(`${FLOW}/custom-form-flow/${idPath(id)}`));
    },
    listFormGroupCounts: async (query) => list<FormGroupCount>(await http.get(withQuery(`${FLOW}/custom-form-flow/group/count`, query))),
    listPermissionFormGroups: async (query) =>
      list<FormGroupCount>(await http.get(withQuery(`${FLOW}/custom-form-flow/group/permission/count`, query))),
    listConfigFormGroupTree: async (query) =>
      list<FormGroupCount>(await http.get(withQuery(`${FLOW}/custom-form-flow/group/tree/permission/count`, query))),
    listFormGroups: async (query) => list<FormGroup>(await http.get(withQuery(`${FLOW}/form-flow-group/list`, query))),
    treeFormGroups: async (keyword = "") => list<FormGroup>(await http.get(withQuery(`${FLOW}/form-flow-group/tree`, { keyword }))),
    saveFormGroup: async (payload) => unwrap(await http.post(`${FLOW}/form-flow-group/save-or-update`, payload)),
    deleteFormGroup: async (id) => {
      unwrap(await http.delete(`${FLOW}/form-flow-group/${idPath(id)}`));
    },
    listBusinessTypes: async (query) => list(await http.get(withQuery(`${FLOW}/form-business/type/list`, query))),
    pageFlowProcesses: async (query) => page<FlowProcess>(await http.get(withQuery(`${FLOW}/process/instance/historical/page`, query))),
    pageAllAppraisalProcesses: async (query) =>
      page<FlowProcess>(await http.get(withQuery(`${APPRAISAL}/appraisal/process/allPage`, query))),
    deleteWorkOrders: async (ids) => unwrap(await http.post(`${FLOW}/form/instance/form-flows/delete`, ids)),
    exportFlowProcesses: async (query, appraisal) =>
      blob(
        await http.get(
          withQuery(appraisal ? `${APPRAISAL}/appraisal/process/allPage/export` : `${FLOW}/process/instance/historical/export`, query),
        ),
      ),
    pageWorkOrderStatistics: async (query) =>
      page<WorkOrderStatistics>(await http.get(withQuery(`${FLOW}/statistics/group/businessType`, query))),
    exportWorkOrderStatistics: async (query) => blob(await http.get(withQuery(`${FLOW}/statistics/group/businessType/export`, query))),
    pagePersonnelStatistics: async (query) =>
      page<WorkOrderStatistics>(await http.get(withQuery(`${FLOW}/getWordOrderStatisticsByUser`, query))),
    exportPersonnelStatistics: async (query) => blob(await http.get(withQuery(`${FLOW}/exportWordOrderStatisticsByUser`, query))),
    listDepartments: async () =>
      list<Department>(
        await http.get(
          withQuery("/api/ouaa/authenticated/organizations/list", {
            pageNumber: 1,
            pageSize: 1000,
            name: "",
            enabled: true,
          }),
        ),
      ),
    pageAppraisalRules: async (query) => page<AppraisalRule>(await http.get(withQuery(`${APPRAISAL}/form-appraisal-rule/page`, query))),
    getAppraisalRule: async (id) => unwrap(await http.get(`${APPRAISAL}/form-appraisal-rule/${idPath(id)}`)),
    createAppraisalRule: async (payload) => unwrap(await http.post(`${APPRAISAL}/form-appraisal-rule`, payload)),
    updateAppraisalRule: async (id, payload) => unwrap(await http.put(`${APPRAISAL}/form-appraisal-rule/${idPath(id)}`, payload)),
    updateAppraisalRuleEnabled: async (id, enabled) =>
      unwrap(await http.post(withQuery(`${APPRAISAL}/form-appraisal-rule/${idPath(id)}/enabled`, { enable: enabled }))),
    deleteAppraisalRule: async (id) => {
      unwrap(await http.delete(`${APPRAISAL}/form-appraisal-rule/${idPath(id)}`));
    },
    getAppraisalStatistics: async (query) =>
      unwrap<AppraisalStatistics>(await http.get(withQuery(`${APPRAISAL}/form-appraisal-record/statistics`, query))),
    generateAppraisalPreview: async () => unwrap(await http.post(`${APPRAISAL}/form-appraisal-record/preview/generate`)),
    pageAppraisalRecords: async (query) =>
      page<AppraisalRecordGroup>(await http.get(withQuery(`${APPRAISAL}/form-appraisal-record/page`, query))),
    exportAppraisalRecords: async (query) => blob(await http.get(withQuery(`${APPRAISAL}/form-appraisal-record/export`, query))),
    getAppraisalRecord: async (id) =>
      unwrap<AppraisalRecordDetail | null>(await http.get(`${APPRAISAL}/form-appraisal-record/${idPath(id)}`)),
  };
}

export async function create(ctx: PlatformContext): Promise<FormAuditClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createFormAuditClient(module.createHttpClientForPlatform(ctx));
}
export type { FormAuditClient };
