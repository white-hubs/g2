import type { PlatformContext } from "@g2-composition/contract";

import { createAttendanceHrClient, type AttendanceHrClient } from "./attendance-hr-client";

export type { AttendanceHrClient, AttendanceHrPage } from "./attendance-hr-client";

export interface StreamEnginePage<T = Record<string, unknown>> {
  records: T[];
  total: number;
  pages?: number;
}

export interface FormFlowRecord {
  id?: string;
  name?: string;
  code?: string;
  application?: string;
  applicationName?: string;
  type?: string;
  status?: string | number | boolean;
  enable?: boolean;
  updateTime?: string;
  [key: string]: unknown;
}

export interface FormFlowBusiness {
  id?: string;
  formDefinitionId?: string;
  formKey?: string;
  formDefinitionVersion?: number;
  flowKey?: string;
  businessType?: string;
  businessTypeName?: string;
  application?: string;
  applicationName?: string;
  formJson?: string;
  formBizFieldMapList?: Array<{ controlId: string; businessField: string }>;
  [key: string]: unknown;
}

export interface ProcessTaskForm {
  processInstanceId?: string;
  taskId?: string;
  formJson?: string;
  formData?: string | Record<string, unknown>;
  data?: string | Record<string, unknown>;
  flowKey?: string;
  formDefinitionId?: string;
  formKey?: string;
  formDefinitionVersion?: number;
  businessType?: string;
  businessTypeName?: string;
  application?: string;
  applicationName?: string;
  status?: string;
  operations?: string[];
  [key: string]: unknown;
}

export interface FormFlowSubmitPayload {
  application: string;
  applicationName: string;
  businessType: string;
  businessKey?: string;
  data: string;
  flowKey: string;
  formDefinitionId: string;
  formDefinitionVersion: number;
  formKey: string;
  type: string;
  variables?: Record<string, unknown>;
  backLogTitle?: string;
  approveUsers?: Record<string, string>;
}

export interface FormFlowPrecheckPayload {
  formId: string | number;
  formData: string;
}

export interface ApprovalTypeItem {
  code: string;
  name: string;
}

export interface BusinessFieldItem {
  id?: string;
  name: string;
  businessField?: string;
  required?: boolean;
  controlId?: string;
  [key: string]: unknown;
}

export interface StreamEngineNamedTreeNode {
  id: string;
  name: string;
  children?: StreamEngineNamedTreeNode[];
}

export interface FormFlowGroup {
  id: string | number;
  name: string;
}

export interface CustomFormFlow extends FormFlowBusiness {
  name?: string;
  shortName?: string;
  formGroupId?: string | number;
  enable?: boolean;
  permissionType?: "ALL" | "USER" | "ROLE" | "DEPARTMENT";
  permissionIds?: Array<string | number>;
  permissionList?: Array<{ id: string | number; name: string }>;
}

export interface StreamEngineDeviceDetail {
  productPropVoList?: Array<{
    propCode: string;
    propName?: string;
    name?: string;
    unitName?: string;
    dataType?: string;
    dataConstraint?: Array<{ value: string | number | boolean; label: string }>;
  }>;
  snapshots?: Array<{ key?: string; value?: string | number | boolean | null }>;
}

export interface StreamEngineVehiclePeriod {
  begin?: string | null;
  end?: string | null;
}

export interface StreamEngineClient extends AttendanceHrClient {
  listProcessDepartments(): Promise<StreamEngineNamedTreeNode[]>;
  pageProcessRoles(params: { pageNumber: number; pageSize: number; name?: string }): Promise<StreamEnginePage<StreamEngineNamedTreeNode>>;
  getDepartmentAssignments(id: string): Promise<{ postList: StreamEngineNamedTreeNode[]; positionList: StreamEngineNamedTreeNode[] }>;
  // 配置端：表单管理
  listFormFlowTypes(params?: Record<string, unknown>): Promise<unknown[]>;
  listFormFlowStatuses(params?: Record<string, unknown>): Promise<unknown[]>;
  listFormFlowApplications(params?: Record<string, unknown>): Promise<unknown[]>;
  pageFormFlows(params: Record<string, unknown>): Promise<StreamEnginePage<FormFlowRecord>>;
  deleteFormFlow(id: string | number): Promise<void>;
  enableFormFlow(params: Record<string, unknown>): Promise<void>;
  saveFormFlow(payload: Record<string, unknown>): Promise<unknown>;
  saveCustomFormFlow(payload: Record<string, unknown>): Promise<unknown>;
  getFormFlow(id: string | number): Promise<FormFlowBusiness>;
  getCustomFormFlow(id: string | number): Promise<CustomFormFlow>;
  listFormFlowGroups(params?: { application?: string }): Promise<FormFlowGroup[]>;
  getFormFlowQrCode(params: Record<string, unknown>): Promise<unknown>;

  // 渲染端 / 业务映射
  getFormFlowBusiness(params: { businessType: string }): Promise<FormFlowBusiness>;
  getFormFlowBusinessFlow(businessType: string): Promise<string>;
  listFormFlows(params: { enable?: boolean; application?: string }): Promise<FormFlowRecord[]>;
  getProcessTaskForm(id: string): Promise<ProcessTaskForm>;
  submitFormFlowFirst(payload: FormFlowSubmitPayload): Promise<unknown>;
  checkClassesChange(payload: FormFlowPrecheckPayload): Promise<unknown>;
  checkClockRepair(payload: { businessType: string; flowData: FormFlowPrecheckPayload }): Promise<unknown>;
  submitAttendanceApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
  submitHotelApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
  submitVehicleApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
  submitVisitorApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
  submitPersonnelApproval(payload: FormFlowSubmitPayload): Promise<unknown>;
  submitIllegalParking(payload: FormFlowSubmitPayload): Promise<unknown>;
  completeTask(payload: Record<string, unknown>): Promise<unknown>;
  rejectTask(payload: Record<string, unknown>): Promise<unknown>;
  repeatTask(payload: { processInstanceId: string }): Promise<unknown>;
  undoTask(payload: { comment: string | null; processInstanceId: string }): Promise<unknown>;
  withdrawTask(payload: Record<string, unknown>): Promise<unknown>;
  backTask(payload: Record<string, unknown>): Promise<unknown>;
  transferTask(payload: Record<string, unknown>): Promise<unknown>;
  getLastWriteSign(): Promise<unknown>;
  getProcessHistoricalPath(processInstanceId: string): Promise<unknown>;
  getProcessLine(params: { processInstanceId?: string; flowKey?: string }): Promise<unknown>;
  appointApprover(payload: Record<string, unknown>): Promise<unknown>;
  reduceAppointApprover(payload: Record<string, unknown>): Promise<unknown>;
  firstTaskActive(processInstanceId: string): Promise<unknown>;
  pageHistoricalAll(params: Record<string, unknown>): Promise<StreamEnginePage>;
  exportHistorical(params: Record<string, unknown>): Promise<Blob>;
  getPrintNodes(processInstanceId: string): Promise<unknown>;
  submitFeedback(payload: Record<string, unknown>): Promise<unknown>;
  getFeedback(params: { processInstanceId: string; taskNodeKey: string }): Promise<unknown>;
  getFinishedTaskNodes(processInstanceId: string): Promise<unknown>;

  // 流程配置（业务字段映射）
  listApprovalTypes(apiPrefix: string, applicationCode?: string): Promise<ApprovalTypeItem[]>;
  listBusinessFormFields(apiPrefix: string, params?: { type?: string }): Promise<BusinessFieldItem[]>;
  saveFormFlowBusiness(payload: Record<string, unknown>): Promise<unknown>;
  pageHistorical(params: Record<string, unknown>): Promise<StreamEnginePage>;

  // 隐患控件
  listHiddenDangerTypes(params?: Record<string, unknown>): Promise<unknown[]>;
  listHiddenDangerLevels(): Promise<unknown[]>;
  /** 故障类型：对齐旧 streamengine-pc 的 `/maintain/fault-type/list`。 */
  listFaultTypes(businessType: string): Promise<unknown[]>;
  pageWorkReportTypes(): Promise<StreamEnginePage>;
  listOutsourceCompanies(deviceId?: string): Promise<unknown[]>;
  listOutsourceModes(companyId?: string): Promise<unknown[]>;
  listProjectNames(): Promise<unknown[]>;
  /** 关联人员的车牌号：旧停车服务路径中的 vechicle 拼写需保持原样。 */
  getVehicleNumbers(id: string): Promise<string[]>;
  getVehicleNumberTime(vechicleNo: string): Promise<StreamEngineVehiclePeriod>;
  /** 故障耗材领用选择器的数据源。 */
  pageConsumableStock(params: Record<string, unknown>): Promise<StreamEnginePage>;
  listConsumableCategories(): Promise<StreamEngineNamedTreeNode[]>;
  listAssetClassifications(type: "assetSource" | "assetType" | "reasonForScrapping"): Promise<StreamEngineNamedTreeNode[]>;
  listAssetClassificationTree(type: "assetType"): Promise<StreamEngineNamedTreeNode[]>;
  listAssetWarehouses(): Promise<StreamEngineNamedTreeNode[]>;
  pageAssets(params: Record<string, unknown>): Promise<StreamEnginePage>;
  pageConsumables(params: Record<string, unknown>): Promise<StreamEnginePage>;
  checkAssetCodes(payload: { checkSerialNumberList: Array<{ key?: string | null; value: string }> }): Promise<string[]>;
  listWorkPermitTypes(params?: { typeName?: string }): Promise<unknown[]>;
  listWorkPermitLevels(params?: { typeName?: string }): Promise<unknown[]>;
  pageWorkPermitItems(
    kind: "RISK_CHECK" | "ACCEPTANCE",
    params: { pageNumber: number; pageSize: number; typeName?: string; workPermitLevel?: string },
  ): Promise<StreamEnginePage>;
  recognizeWorkPermitItem(payload: { itemContent: string; fileIds: string[] }): Promise<unknown>;
  pageParkingVehicles(params: { pageNumber: number; pageSize: number; vehicleNo?: string }): Promise<StreamEnginePage>;
  listParkingLots(): Promise<unknown[]>;
  listOfficialSeals(): Promise<StreamEngineNamedTreeNode[]>;
  listFocusWorkTypes(): Promise<StreamEngineNamedTreeNode[]>;
  getFocusWork(id: string): Promise<StreamEngineNamedTreeNode>;
  listFocusWork(): Promise<StreamEngineNamedTreeNode[]>;
  listFocusWorkStatuses(): Promise<StreamEngineNamedTreeNode[]>;
  getFocusWorkRequirement(id: string): Promise<StreamEngineNamedTreeNode>;
  getFocusWorkCompleteTime(id: string): Promise<StreamEngineNamedTreeNode>;
  getNorthDeviceDetail(deviceId: string): Promise<StreamEngineDeviceDetail>;
  pageTargetObjects(kind: string, params: Record<string, unknown>): Promise<StreamEnginePage>;
  listInspectPointTypes(): Promise<unknown[]>;
  listTargetDeviceProducts(): Promise<unknown[]>;
  listTargetDeviceCategories(): Promise<unknown[]>;
  listTargetDeviceTags(): Promise<unknown[]>;
  listTargetStallTypes(): Promise<unknown[]>;
  listTargetRiskSourceTypes(): Promise<unknown[]>;
  pageOutsourceDevices(params: Record<string, unknown>): Promise<StreamEnginePage>;
  pageAlarmRecords(params: Record<string, unknown>): Promise<StreamEnginePage>;
  /** 区域树：允许旧表单配置同源接口路径，默认 `/mdata/area/list`。 */
  listAreas(params?: Record<string, unknown>, api?: string): Promise<unknown[]>;
  /** 人员档案字段：沿用旧渲染端的员工属性与用户详情接口。 */
  getStaffInfo(params: { attr: string; id: string }): Promise<{ id?: string; name?: string }>;
  getStaffDetail(id: string): Promise<{ id?: string; name?: string }>;
  listStaff(params: Record<string, unknown>): Promise<unknown>;
}

export interface HttpClient {
  get(url: string): Promise<unknown>;
  post(url: string, body?: unknown): Promise<unknown>;
  put(url: string, body?: unknown): Promise<unknown>;
  delete(url: string): Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform(ctx: PlatformContext, baseUrl?: string): HttpClient;
}

function withQuery(path: string, query?: object, includeEmpty = false): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && (includeEmpty || value !== "")) {
      search.set(key, String(value));
    }
  }
  return search.size > 0 ? `${path}?${search.toString()}` : path;
}

function areaApiPath(api?: string, params?: Record<string, unknown>): string {
  const source = api?.trim() || "/mdata/area/list";
  if (!source.startsWith("/") || source.startsWith("//")) throw new Error("区域数据源必须是站内路径");
  const url = new URL(source, "http://g2.local");
  if (url.origin !== "http://g2.local") throw new Error("区域数据源必须是站内路径");
  const path = url.pathname.startsWith("/api/") ? url.pathname : `/api${url.pathname}`;
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return `${path}${url.search}`;
}

function unwrap<T>(response: unknown): T {
  let value = response;
  for (let index = 0; index < 4 && value && typeof value === "object" && !(value instanceof Blob); index++) {
    const record = value as Record<string, unknown>;
    if (record.success === false || (record.code !== undefined && !["0", "200"].includes(String(record.code)))) {
      throw new Error(String(record.message ?? record.msg ?? "请求失败"));
    }
    if (!("data" in record)) {
      break;
    }
    // The task form itself contains `data` (the user's field values). It is not
    // another HTTP envelope; unwrapping it drops the schema and allowed actions.
    if (
      "properties" in record ||
      "processInstanceRunningInfo" in record ||
      "formJson" in record ||
      "taskId" in record ||
      "processInstanceId" in record
    ) {
      break;
    }
    value = record.data;
  }
  return value as T;
}

function asPage<T>(value: unknown): StreamEnginePage<T> {
  const page = unwrap<Partial<StreamEnginePage<T>> & { list?: T[]; content?: T[]; totalCount?: number }>(value);
  const records = Array.isArray(page?.records)
    ? page.records
    : Array.isArray(page?.list)
      ? page.list
      : Array.isArray(page?.content)
        ? page.content
        : Array.isArray(page)
          ? (page as T[])
          : [];
  return { records, total: Number(page?.total ?? page?.totalCount ?? records.length), pages: Number(page?.pages ?? 0) };
}

function asList(value: unknown): unknown[] {
  const result = unwrap<unknown[] | { records?: unknown[]; list?: unknown[] }>(value);
  if (Array.isArray(result)) {
    return result;
  }
  if (Array.isArray(result?.records)) {
    return result.records;
  }
  if (Array.isArray(result?.list)) {
    return result.list;
  }
  return [];
}

export function createStreamEngineClient(http: HttpClient): StreamEngineClient {
  return {
    ...createAttendanceHrClient(http),
    listProcessDepartments: async () =>
      asList(await http.get(withQuery("/api/ouaa/authenticated/organizations/list", { enabled: true }))) as StreamEngineNamedTreeNode[],
    pageProcessRoles: async (params) => asPage(await http.get(withQuery("/api/ouaa/roles", { ...params, enabled: true }))),
    getDepartmentAssignments: async (id) => unwrap(await http.get(`/api/ouaa/organizations/postAndPosition/${encodeURIComponent(id)}`)),
    listFormFlowTypes: async (params) => asList(await http.get(withQuery("/api/flow/form-flow/type/list", params))),
    listFormFlowStatuses: async (params) => asList(await http.get(withQuery("/api/flow/form-flow/status/list", params))),
    listFormFlowApplications: async (params) => asList(await http.get(withQuery("/api/flow/form-flow/application/list", params))),
    pageFormFlows: async (params) => asPage(await http.get(withQuery("/api/flow/form-flow/page", params))),
    deleteFormFlow: async (id) => {
      unwrap(await http.delete(`/api/flow/form-flow/${id}`));
    },
    enableFormFlow: async (params) => {
      unwrap(await http.put(withQuery("/api/flow/form-flow/enable", params)));
    },
    saveFormFlow: async (payload) => unwrap(await http.post("/api/flow/form-flows", payload)),
    saveCustomFormFlow: async (payload) => unwrap(await http.post("/api/flow/custom-form-flow/save-or-update", payload)),
    getFormFlow: async (id) => unwrap(await http.get(`/api/flow/form-flow/${id}`)),
    getCustomFormFlow: async (id) => unwrap(await http.get(`/api/flow/custom-form-flow/${encodeURIComponent(id)}`)),
    listFormFlowGroups: async (params) => asList(await http.get(withQuery("/api/flow/form-flow-group/list", params))) as FormFlowGroup[],
    getFormFlowQrCode: async (params) => unwrap(await http.get(withQuery("/api/flow/form-flow/qr-code", params))),

    getFormFlowBusiness: async (params) => unwrap(await http.get(withQuery("/api/flow/form-flow-business/type", params))),
    getFormFlowBusinessFlow: async (businessType) => {
      const result = unwrap<string | { id?: string }>(await http.get(`/api/flow/form-flow-business/${businessType}/flow`));
      return typeof result === "string" ? result : String(result?.id ?? result ?? "");
    },
    listFormFlows: async (params) => asList(await http.get(withQuery("/api/flow/form-flow/list", params))) as FormFlowRecord[],
    getProcessTaskForm: async (id) => unwrap(await http.get(`/api/flow/process/task/form/id/${id}`)),
    submitFormFlowFirst: async (payload) => unwrap(await http.post("/api/flow/form-flows/first/submit", payload)),
    checkClassesChange: async (payload) => unwrap(await http.post("/api/attendance/att/exchange/check", payload)),
    checkClockRepair: async (payload) => unwrap(await http.post("/api/attendance/att/approve/verification", payload)),
    submitAttendanceApproval: async (payload) => unwrap(await http.post("/api/attendance/att/approval/submit", payload)),
    submitHotelApproval: async (payload) => unwrap(await http.post("/api/third-party/hotel-reservation/approval/submit", payload)),
    submitVehicleApproval: async (payload) => unwrap(await http.post("/api/park-management/vehicle/approval/submit", payload)),
    submitVisitorApproval: async (payload) => unwrap(await http.post("/api/visitor-management/visitor/approval/submit", payload)),
    submitPersonnelApproval: async (payload) => unwrap(await http.post("/api/personnel/personnel/submit", payload)),
    submitIllegalParking: async (payload) => unwrap(await http.post("/api/park-management/illegal/parking/submit", payload)),
    completeTask: async (payload) => unwrap(await http.post("/api/flow/process/task/complete", payload)),
    rejectTask: async (payload) => unwrap(await http.post("/api/flow/process/task/reject", payload)),
    repeatTask: async (payload) => unwrap(await http.post("/api/flow/process/task/repeat", payload)),
    undoTask: async (payload) => unwrap(await http.post("/api/flow/process/task/undo", payload)),
    withdrawTask: async (payload) => unwrap(await http.post("/api/flow/process/task/withdraw", payload)),
    backTask: async (payload) => unwrap(await http.post("/api/flow/process/task/back", payload)),
    transferTask: async (payload) => unwrap(await http.post("/api/flow/process/task/transfer", payload)),
    getLastWriteSign: async () => unwrap(await http.post("/api/flow/process/task/user-last-sign")),
    getProcessHistoricalPath: async (processInstanceId) =>
      unwrap(await http.get(`/api/flow/process/instance/${processInstanceId}/historical/path/line`)),
    getProcessLine: async (params) => unwrap(await http.get(withQuery("/api/flow/process/historical/path/line", params))),
    appointApprover: async (payload) => unwrap(await http.post("/api/flow/process/task/appoint-approver", payload)),
    reduceAppointApprover: async (payload) => unwrap(await http.post("/api/flow/process/task/pre-reduce-sign", payload)),
    firstTaskActive: async (processInstanceId) => unwrap(await http.get(`/api/flow/flow/${processInstanceId}/first/task/active`)),
    pageHistoricalAll: async (params) => asPage(await http.get(withQuery("/api/flow/process/instance/historical/allPage", params))),
    exportHistorical: async (params) => {
      const response = await http.get(withQuery("/api/flow/process/instance/historical/export", params));
      return response as Blob;
    },
    getPrintNodes: async (processInstanceId) => unwrap(await http.get(withQuery("/api/flow/process/print/node", { processInstanceId }))),
    submitFeedback: async (payload) => unwrap(await http.post("/api/flow/task/feedback/log/submit", payload)),
    getFeedback: async (params) => unwrap(await http.get(withQuery("/api/flow/task/feedback/log/get/log", params))),
    getFinishedTaskNodes: async (processInstanceId) =>
      unwrap(await http.get(`/api/flow/process/task/historical/finished/task-node/${processInstanceId}`)),

    listApprovalTypes: async (apiPrefix, applicationCode) =>
      asList(await http.get(withQuery(`${apiPrefix}/approval/biz/type`, { applicationCode }))) as ApprovalTypeItem[],
    listBusinessFormFields: async (apiPrefix, params) =>
      asList(await http.get(withQuery(`${apiPrefix}/approval/biz/form/field`, params))) as BusinessFieldItem[],
    saveFormFlowBusiness: async (payload) => unwrap(await http.post("/api/flow/form-flow-business", payload)),
    pageHistorical: async (params) => asPage(await http.get(withQuery("/api/flow/process/instance/historical/page", params))),

    listHiddenDangerTypes: async (params) => asList(await http.get(withQuery("/api/maintain/hidden-danger-type/list", params))),
    listHiddenDangerLevels: async () => asList(await http.get("/api/maintain/hidden-danger-level/list")),
    listFaultTypes: async (businessType) =>
      asList(await http.get(withQuery("/api/maintain/fault-type/list", { applicationCode: businessType }))),
    pageWorkReportTypes: async () => asPage(await http.get("/api/report/report-type-page?pageSize=1000&pageNumber=1")),
    listOutsourceCompanies: async (deviceId) =>
      asList(await http.get(withQuery("/api/maintain/outsource/company/list", { pageNumber: 1, pageSize: 1000, deviceId }))),
    listOutsourceModes: async (companyId) =>
      asList(await http.get(withQuery("/api/maintain/outsource/model/listByCompany", { pageNumber: 1, pageSize: 1000, companyId }))),
    listProjectNames: async () => asList(await http.get("/api/loose-works/project/apply/nameList")),
    getVehicleNumbers: async (id) =>
      asList(await http.get(withQuery("/api/park-management/vehicle/approval/vechicle/no", { id }))).map(String),
    getVehicleNumberTime: async (vechicleNo) =>
      unwrap(await http.get(withQuery("/api/park-management/vehicle/approval/vechicle/start-end-time", { vechicleNo }))),
    pageConsumableStock: async (params) => asPage(await http.get(withQuery("/api/property/consumable-store-stock/page", params))),
    listConsumableCategories: async () => asList(await http.get("/api/property/consumable-category/tree")) as StreamEngineNamedTreeNode[],
    listAssetClassifications: async (type) =>
      asList(
        await http.get(withQuery("/api/property/classify/getAssemblyClassifyPage", { type, pageSize: 1000, pageNumber: 1 })),
      ) as StreamEngineNamedTreeNode[],
    listAssetClassificationTree: async (type) =>
      asList(await http.get(withQuery("/api/property/classify/getAssemblyClassifyTree", { type }))) as StreamEngineNamedTreeNode[],
    listAssetWarehouses: async () => asList(await http.get("/api/property/storehouse/list")) as StreamEngineNamedTreeNode[],
    pageAssets: async (params) => asPage(await http.get(withQuery("/api/property/property/detailed/getPropertyDetailedPage", params))),
    pageConsumables: async (params) => asPage(await http.get(withQuery("/api/property/consumable/page", params))),
    checkAssetCodes: async (payload) => asList(await http.post("/api/property/property/detailed/checkCodeBath", payload)).map(String),
    listWorkPermitTypes: async (params) => asList(await http.get(withQuery("/api/work-permit/work-permit-types/names", params))),
    listWorkPermitLevels: async (params) => asList(await http.get(withQuery("/api/work-permit/work-permit-types/levels", params))),
    pageWorkPermitItems: async (kind, params) =>
      asPage(
        await http.get(
          withQuery(`/api/work-permit/work-permit-types/${kind === "ACCEPTANCE" ? "acceptance-items" : "risk-check-items"}/page`, params),
        ),
      ),
    recognizeWorkPermitItem: async (payload) => unwrap(await http.post("/gw-bff/work-permit/associated-items/ai-recognition", payload)),
    pageParkingVehicles: async (params) => asPage(await http.get(withQuery("/api/park-management/vehicle/page", params))),
    listParkingLots: async () => asList(await http.get("/api/park-management/parking-infos")),
    listOfficialSeals: async () => asList(await http.get("/api/official/officialSeal/widget/list")) as StreamEngineNamedTreeNode[],
    listFocusWorkTypes: async () => asList(await http.get("/api/official/focusWork/category/weight/list")) as StreamEngineNamedTreeNode[],
    getFocusWork: async (id) => unwrap(await http.get(`/api/official/focusWork/weight/${encodeURIComponent(id)}`)),
    listFocusWork: async () => asList(await http.get("/api/official/focusWork/weight/list")) as StreamEngineNamedTreeNode[],
    listFocusWorkStatuses: async () => asList(await http.get("/api/official/focusWork/weight/status/list")) as StreamEngineNamedTreeNode[],
    getFocusWorkRequirement: async (id) => unwrap(await http.get(`/api/official/focusWork/weight/${encodeURIComponent(id)}/requirement`)),
    getFocusWorkCompleteTime: async (id) => unwrap(await http.get(`/api/official/focusWork/weight/${encodeURIComponent(id)}/completeTime`)),
    getNorthDeviceDetail: async (deviceId) =>
      unwrap(await http.get(withQuery("/api/iot/north/device/detail", { deviceId, withPropertySpec: true, withSnapShot: true }))),
    pageTargetObjects: async (kind, params) => {
      if (kind === "AREA") {
        const rows = await http.get(withQuery("/api/mdata/area/list", params));
        const records = asList(rows).filter(
          (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row),
        );
        return { records, total: records.length };
      }
      if (kind === "SITE_POINT") {
        return asPage(
          await http.get(
            withQuery(
              "/api/maintain/inspect/pointList",
              {
                pageNumber: params.pageNumber ?? 1,
                pageSize: params.pageSize ?? 10,
                pointName: params.pointName ?? params.keyword ?? "",
                typeId: params.typeId,
                receiveDepId: params.receiveDepId,
              },
              true,
            ),
          ),
        );
      }
      if (kind === "PATROL_POINT") {
        return asPage(
          await http.get(
            withQuery(
              "/api/maintain/patrol/location/page",
              {
                pageNumber: params.pageNumber ?? 1,
                pageSize: params.pageSize ?? 10,
                keyword: params.keyword,
                areaId: params.areaId,
              },
              true,
            ),
          ),
        );
      }
      const routes: Record<string, { method: "GET" | "POST"; path: string }> = {
        DEVICE: { method: "POST", path: "/api/device-center/device/instance/page" },
        PROPERTY: { method: "GET", path: "/api/property/property/detailed/getPropertyDetailedPage" },
        STALL: { method: "GET", path: "/api/mdata/stall/page" },
        RISK_SOURCE: { method: "GET", path: "/api/property/risk/source/ledger/page" },
        SMALL_ENGINEERING: { method: "GET", path: "/api/loose-works/project/schedule/list" },
      };
      const route = routes[kind];
      if (!route) return { records: [], total: 0 };
      return asPage(route.method === "POST" ? await http.post(route.path, params) : await http.get(withQuery(route.path, params, true)));
    },
    listInspectPointTypes: async () => asList(await http.get("/api/maintain/inspect/sceneTypeList")),
    listTargetDeviceProducts: async () => asList(await http.get("/api/device-center/things/product/list/all")),
    listTargetDeviceCategories: async () => asList(await http.get("/api/device-center/iot/product/category-tree")),
    listTargetDeviceTags: async () => asList(await http.get("/api/device-center/tag/customer/list?status=1")),
    listTargetStallTypes: async () => asList(await http.get("/api/mdata/stall-category/list?enabled=true")),
    listTargetRiskSourceTypes: async () => asList(await http.get("/api/dictionary/getCascadeDictionaryItem?itemCode=risk-source-type")),
    pageOutsourceDevices: async (params) => asPage(await http.get(withQuery("/api/maintain/outsource/device/list", params))),
    pageAlarmRecords: async (params) => asPage(await http.get(withQuery("/api/alarm/alarm-records/common-page", params))),
    listAreas: async (params, api) => asList(await http.get(areaApiPath(api, params))),
    getStaffInfo: async (params) => unwrap(await http.get(withQuery("/api/personnel/staff/info", params))),
    getStaffDetail: async (id) => unwrap(await http.get(`/api/ouaa/user-under-tenant/${encodeURIComponent(id)}`)),
    listStaff: async (params) => unwrap(await http.get(withQuery("/api/personnel/staff/list", params))),
  };
}

/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<StreamEngineClient> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return createStreamEngineClient(httpModule.createHttpClientForPlatform(ctx));
}
