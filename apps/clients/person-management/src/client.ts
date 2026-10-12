import type { PlatformContext } from "@g2-composition/contract";
import type {
  Appointment,
  ApprovalType,
  AreaTree,
  AssociationDevice,
  DictionaryRecord,
  DoorType,
  FlowBusinessField,
  FlowInstanceRow,
  FormFlow,
  Organization,
  PageResult,
  PersonnelCategory,
  PersonnelManagementClient,
  PersonnelStatisticsRow,
  StaffChangeRow,
  StaffEnumOption,
  StaffExchange,
  StaffImportError,
  StaffRow,
  StaffStructure,
  UserPermission,
} from "@g2-contract/person-management";

export interface HttpClient {
  get(url: string, init?: RequestInit): Promise<unknown>;
  post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  delete(url: string, init?: RequestInit): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

const PERSONNEL = "/api/personnel";
const OUAA = "/api/ouaa";
const FLOW = "/api/flow";
const DICTIONARY = "/api/dictionary";

function withQuery(path: string, query?: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  return search.size > 0 ? `${path}?${search}` : path;
}

function tenantInit(tenant?: string): RequestInit | undefined {
  return tenant ? { headers: { tenant } } : undefined;
}

function isEnvelope(record: Record<string, unknown>): boolean {
  if (!("data" in record)) {
    return false;
  }
  if (typeof record.success === "boolean" || "message" in record || "msg" in record) {
    return true;
  }
  const code = Number(record.code);
  // 业务对象也可能有 code（如租户编码）；只有标准响应码才能证明是包络。
  return Number.isFinite(code) && (code === 0 || (code >= 100 && code < 600));
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let depth = 0; depth < 3 && value && typeof value === "object" && !(value instanceof Blob); depth += 1) {
    const record = value as Record<string, unknown>;
    if (!isEnvelope(record)) {
      break;
    }
    const code = record.code;
    if (record.success === false || (code !== undefined && !["0", "200"].includes(String(code)))) {
      throw new Error(String(record.message ?? record.msg ?? record.errorMessage ?? "请求失败"));
    }
    value = record.data;
  }
  return value as T;
}

function list<T>(response: unknown): T[] {
  const value = unwrap<unknown>(response);
  if (value === null || value === undefined) {
    return [];
  }
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (typeof value === "object" && Array.isArray((value as { records?: unknown }).records)) {
    return (value as { records: T[] }).records;
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
    throw new Error("下载接口未返回文件流");
  }
  return value;
}

function formFile(file: Blob): FormData {
  const body = new FormData();
  body.append("file", file);
  return body;
}

export function createPersonManagementClient(http: HttpClient): PersonnelManagementClient {
  return {
    getStaffStructure: async () => unwrap<StaffStructure>(await http.get(`${PERSONNEL}/staff/stru/statistics`)),
    getStaffExchange: async (query) => unwrap<StaffExchange>(await http.get(withQuery(`${PERSONNEL}/staff/exchange/statistics`, query))),
    listOrganizations: async () => list<Organization>(await http.get(`${OUAA}/authenticated/organizations/list`)),
    getStaffChangeStatistics: async (query) => page<StaffChangeRow>(await http.get(withQuery(`${PERSONNEL}/staff/change/stat`, query))),
    exportStaffChangeStatistics: async (query) => blob(await http.post(`${PERSONNEL}/staff/change/stat/export`, query)),

    pageAppointments: async (query) => page<Appointment>(await http.get(withQuery(`${PERSONNEL}/appointment/page`, query))),
    saveAppointment: async (body) => unwrap(await http.post(`${PERSONNEL}/appointment`, body)),

    pageStaff: async (query) => page<StaffRow>(await http.get(withQuery(`${PERSONNEL}/staff/page`, query))),
    getStaff: async (id, encryptionPhone = true) =>
      unwrap<StaffRow>(
        await http.get(withQuery(`${PERSONNEL}/staff/${encodeURIComponent(id)}`, { id }), {
          headers: { encryption: String(encryptionPhone) },
        }),
      ),
    saveStaff: async (body) => unwrap(await http.post(`${PERSONNEL}/staff`, body)),
    getStaffEnums: async (type) => list<StaffEnumOption>(await http.get(withQuery(`${PERSONNEL}/staff/enum/list`, { type }))),
    listDepartments: async (query) =>
      list<Organization>(await http.get(withQuery(`${OUAA}/authenticated/organizations/list`, { ...query, enabled: true }))),
    treeDepartments: async (query) => list<Organization>(await http.get(withQuery(`${OUAA}/organizations`, { ...query, enabled: true }))),
    listAppointments: async () =>
      list<Appointment>(await http.get(withQuery(`${OUAA}/appointment/page`, { enable: true, pageNumber: 1, pageSize: 1000 }))),
    listPositions: async () =>
      list<Appointment>(await http.get(withQuery(`${OUAA}/positions`, { enable: true, pageNumber: 1, pageSize: 1000 }))),
    getAreaTree: async () => list<AreaTree>(await http.get("/api/mdata/area/list")),
    getDoorTypeList: async () => list<DoorType>(await http.get("/api/door/getDoorType")),
    pageDoorDevices: async (query) => page<AssociationDevice>(await http.get(withQuery("/api/door/getDoorDevicePage", query))),
    pageParkingLots: async (query) => page<AssociationDevice>(await http.get(withQuery("/api/park-management/parking-infos-page", query))),
    exportStaffTemplate: async () => blob(await http.post(`${PERSONNEL}/staff/template/export`)),
    exportStaff: async (query) => blob(await http.post(`${PERSONNEL}/staff/export`, query)),
    importStaff: async (file) => list<StaffImportError>(await http.post(`${PERSONNEL}/staff/template/import`, formFile(file))),

    pagePersonnelCategories: async (query) => page<PersonnelCategory>(await http.get(withQuery(`${PERSONNEL}/staff-type/page`, query))),
    listPersonnelCategories: async () => list<PersonnelCategory>(await http.get(`${PERSONNEL}/staff-type/list`)),
    savePersonnelCategory: async (body) => unwrap(await http.post(`${PERSONNEL}/staff-type/save-or-update`, body)),
    deletePersonnelCategory: async (id) => unwrap(await http.delete(withQuery(`${PERSONNEL}/staff-type/delete`, { id }))),

    getUserPermissionMobile: async (mobile) =>
      unwrap<UserPermission>(await http.get(withQuery("/api/third-party/user/permission/mobile", { mobile }))),
    updateUserPermissionMobile: async (body) => unwrap(await http.post("/api/third-party/user/permission/modify", body)),

    getFlowProcessPage: async (query) =>
      page<FlowInstanceRow>(await http.get(withQuery(`${FLOW}/process/instance/historical/page`, query))),
    pageApprovalRecords: async (query) =>
      page<FlowInstanceRow>(await http.get(withQuery(`${FLOW}/process/instance/historical/allPage`, query))),
    exportApprovalRecords: async (query) => blob(await http.get(withQuery(`${FLOW}/process/instance/historical/export`, query))),
    getPersonnelStatistics: async (type, query) =>
      page<PersonnelStatisticsRow>(await http.get(withQuery(`${PERSONNEL}/statistics/${type}`, query))),
    getPersonnelStatisticsDetail: async (type, id, query) =>
      page<PersonnelStatisticsRow>(await http.get(withQuery(`${PERSONNEL}/statistics/${type}/detail/${encodeURIComponent(id)}`, query))),
    exportPersonnelStatistics: async (type, query) => blob(await http.post(`${PERSONNEL}/statistics/${type}/export`, query)),

    listApprovalTypes: async () => list<ApprovalType>(await http.get(`${PERSONNEL}/approval/biz/type`)),
    getFormFlowBusinessFlow: async (code) =>
      unwrap<string | null>(await http.get(`${FLOW}/form-flow-business/${encodeURIComponent(code)}/flow`)),
    listFormFlows: async (query) => list<FormFlow>(await http.get(withQuery(`${FLOW}/form-flow/list`, query))),
    getFormFlow: async (id) => unwrap<FormFlow>(await http.get(withQuery(`${FLOW}/form-flow/${encodeURIComponent(id)}`, { id }))),
    listFlowFormFields: async (type) =>
      list<FlowBusinessField>(await http.get(withQuery(`${PERSONNEL}/approval/biz/form/field`, { type }))),
    saveFormFlowBusiness: async (body) => unwrap(await http.post(`${FLOW}/form-flow-business`, body)),

    getDictionaryItemByCode: async ({ code }) => {
      const value = unwrap<DictionaryRecord | DictionaryRecord[] | null>(
        await http.get(`${DICTIONARY}/getDictionaryItemByCode/${encodeURIComponent(code)}`),
      );
      return Array.isArray(value) ? (value[0] ?? null) : value;
    },
    createDictionaryItem: async (body) => unwrap(await http.post(`${DICTIONARY}/addDictionaryItem`, body)),
    getDictionaryByItem: async (query) =>
      list<DictionaryRecord>(await http.get(withQuery(`${DICTIONARY}/getDataDictionaryByItem`, query), tenantInit(query.tenant))),
    createDataDictionary: async (body) => unwrap(await http.post(`${DICTIONARY}/addDataDictionary`, body, tenantInit(body.tenant))),
    updateDataDictionary: async (body) => unwrap(await http.put(`${DICTIONARY}/updateDataDictionary`, body, tenantInit(body.tenant))),
  };
}

export async function create(ctx: PlatformContext): Promise<PersonnelManagementClient> {
  const module = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createPersonManagementClient(module.createHttpClientForPlatform(ctx));
}

export type { PersonnelManagementClient };
