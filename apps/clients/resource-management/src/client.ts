import type { PlatformContext } from "@g2-composition/contract";
import type { ResourceManagementClient, ResourceGroup, ResourceListPage, ManagedItem, Machine, OperatingRoom, DepartmentDevice, ImportResult, ResourceFile, AreaNode, CategoryNode } from "@g2-contract/resource-management";

interface HttpClient {
  get(url: string, init?: RequestInit): Promise<unknown>;
  post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
  delete(url: string, init?: RequestInit): Promise<unknown>;
}

interface HttpModule {
  createHttpClientForPlatform(ctx: PlatformContext): HttpClient;
}

function query(url: string, params: object): string {
  return url + "?" + Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => encodeURIComponent(key) + "=" + encodeURIComponent(String(value))).join("&");
}

function unwrap<T>(value: unknown): T {
  return value && typeof value === "object" && "data" in value ? (value as { data: T }).data : value as T;
}

const base = "/api/medical-cleanliness";
const tenantHeader = (tenant?: string): RequestInit | undefined => tenant ? { headers: { tenant } } : undefined;
const page = <T>(value: unknown): ResourceListPage<T> => {
  const result = unwrap<ResourceListPage<T>>(value);
  if (!result || !Array.isArray(result.records) || typeof result.total !== "number") throw new Error("分页响应格式错误");
  return result;
};
const blob = (value: unknown): Blob => {
  if (!(value instanceof Blob)) throw new Error("下载响应不是文件");
  return value;
};

export function createResourceManagementClient(http: HttpClient): ResourceManagementClient {
  return {
    pageItems: async (params) => {
      const value = unwrap<{ records: ResourceGroup[]; total: number }>(
        await http.get(query("/api/medical-cleanliness/resources/item/detailPage", params), { headers: { tenant: params.tenant } }),
      );
      if (!value || !Array.isArray(value.records) || typeof value.total !== "number") throw new Error("物品分页响应格式错误");
      return value;
    },
    exportItems: async (params) => {
      const value = await http.get(
        query("/api/medical-cleanliness/resources/item/downloadItemDetail", {
          tenant: params.tenant, tenantName: params.tenantName, deptId: params.deptId,
        }),
        { headers: { tenant: params.tenant } },
      );
      if (!(value instanceof Blob)) throw new Error("物品导出响应不是文件");
      return value;
    },
    listTenants: async () => {
      const value = unwrap<{ records: { code: string; name: string }[] }>(
        await http.get("/api/ouaa/tenant/page?pageSize=1000&pageNumber=1&enabled=true"),
      );
      return value.records.toReversed();
    },
    listDepartments: async (tenant, enabled) => unwrap<{ id: string; name: string }[]>(
      await http.get(query("/api/ouaa/authenticated/organizations/list", { enabled, tenant }), { headers: { tenant } }),
    ),
    listDepartmentDevices: async (tenant) => unwrap<DepartmentDevice[]>(await http.get(`${base}/medical/list/getDeptAndDeviceTree`, tenantHeader(tenant))),
    pageManagedItems: async (params) => page<ManagedItem>(await http.get(query(`${base}/resources/item/page`, params), tenantHeader(params.tenant))),
    saveManagedItem: async (item) => { await (item.id ? http.put(`${base}/resources/item/edit`, item, tenantHeader(item.tenant)) : http.post(`${base}/resources/item/add`, item, tenantHeader(item.tenant))); },
    deleteManagedItem: async (id) => { await http.delete(query(`${base}/resources/item/remove`, { id })); },
    downloadItemTemplate: async () => blob(await http.get(`${base}/resources/item/template`)),
    importItems: async (tenant, file) => unwrap<ImportResult>(await http.post(`${base}/resources/item/import`, file, tenantHeader(tenant))),
    pageMachines: async (params) => page<Machine>(await http.get(query(`${base}/resources/machines/page`, params), tenantHeader(params.tenant))),
    getMachine: async (id, tenant) => unwrap<Machine>(await http.get(query(`${base}/resources/machines/detail`, { id, tenant }), tenantHeader(tenant))),
    saveMachine: async (machine) => {
      const payload = { id: machine.id || undefined, tenant: machine.tenant, code: machine.code, arguments: machine.arguments, fileIds: machine.fileIds, roomIds: machine.roomIds || undefined };
      await (machine.id ? http.put(`${base}/resources/machines/edit`, payload, tenantHeader(machine.tenant)) : http.post(`${base}/resources/machines/add`, payload, tenantHeader(machine.tenant)));
    },
    deleteMachine: async (id) => { await http.delete(query(`${base}/resources/machines/remove`, { id })); },
    downloadMachineTemplate: async () => blob(await http.get(`${base}/resources/machines/template`)),
    importMachines: async (tenant, file) => unwrap<ImportResult>(await http.post(`${base}/resources/machines/import`, file, tenantHeader(tenant))),
    pageMachineRooms: async (params) => page<OperatingRoom>(await http.get(query(`${base}/resources/machines/room/page`, params), tenantHeader(params.tenant))),
    saveMachineRooms: async (tenant, id, roomIds) => { await http.put(`${base}/resources/machines/room/edit`, { tenant, id, roomIds }, tenantHeader(tenant)); },
    deleteMachineRooms: async (tenant, id, roomIds) => { await http.delete(query(`${base}/resources/machines/room/remove`, { tenant, id, roomIds }), tenantHeader(tenant)); },
    pageAvailableRooms: async (params) => page<OperatingRoom>(await http.post("/api/device-center/device/instance/page", {
      pageNumber: params.pageNumber, pageSize: params.pageSize, keyword: params.keyword,
      productId: params.productId, categoryCode: params.categoryCode,
      anyMatchedAreaId: params.anyMatchedAreaId, anyMatchedDepartmentId: params.anyMatchedDepartmentId,
      tagCodes: params.tagCodes, filterTagCodes: [], applicationCode: "RESOURCE_MANAGE",
    }, tenantHeader(params.tenant))),
    listProducts: async (tenant) => unwrap<{ id: string; prodName: string }[]>(await http.get("/api/device-center/things/product/list/all", tenantHeader(tenant))),
    listCustomerTags: async (tenant) => unwrap<{ tagCode: string; tagName: string }[]>(await http.get(query("/api/device-center/tag/customer/list", { status: 1, tenant }), tenantHeader(tenant))),
    uploadFile: async (file, useTemporary) => unwrap<ResourceFile>(await http.post(useTemporary ? "/api/file/upload/temporary" : "/api/file/file", file)),
    pageDeviceInstances: async (params, tenant) => page<Record<string, unknown>>(await http.post("/api/device-center/device/instance/page", params, tenantHeader(tenant))),
    pageDeviceLogs: async (params, tenant) => page<Record<string, unknown>>(await http.get(query("/api/device-center/device/instance/attribute/change/logByTenant/page", params), tenantHeader(tenant))),
    pageAlarms: async (params, tenant) => page<Record<string, unknown>>(await http.get(query("/api/alarm/alarm-records/queryPageByTenant", params), tenantHeader(tenant))),
    getAlarm: async (id, tenant) => unwrap<Record<string, unknown>>(await http.get(query(`/api/alarm/alarm-record/${encodeURIComponent(id)}`, { id, tenant }), tenantHeader(tenant))),
    pageMedicalDevices: async (params, tenant) => page<Record<string, unknown>>(await http.get(query(`${base}/getMedicalDevicePage`, params), tenantHeader(tenant))),
    pageMedicalAlarms: async (params, tenant) => page<Record<string, unknown>>(await http.get(query(`${base}/getMedicalAlarmPage`, params), tenantHeader(tenant))),
    pageSecurityDevices: async (params, tenant) => page<Record<string, unknown>>(await http.get(query("/api/securitymanagement/getSecurityDevicePage/RESOURCE_MANAGE", params), tenantHeader(tenant))),
    pageMonitoredDevices: async (params, tenant) => page<Record<string, unknown>>(await http.get(query("/api/securitymanagement/getDeviceMonitoringByTenantPage/OPERATING_ROOM", params), tenantHeader(tenant))),
    listAreas: async (tenant) => unwrap<AreaNode[]>(await http.get("/api/mdata/area/list", tenantHeader(tenant))),
    listProductCategories: async (tenant) => unwrap<CategoryNode[]>(await http.get(query("/api/device-center/iot/product/category-tree", { tenant }), tenantHeader(tenant))),
    listAlarmProcess: async (id, tenant) => unwrap<Record<string, unknown>[]>(await http.get(query(`/api/alarm/alarm-record/operatorLogs/${encodeURIComponent(id)}`, { eventId: id, tenant }), tenantHeader(tenant))),
    listAlarmLinkActions: async (id, tenant) => unwrap<Record<string, unknown>[]>(await http.get(query(`/api/linkage/event-iot-device-pros/${encodeURIComponent(id)}`, { eventId: id, tenant }), tenantHeader(tenant))),
    listAlarmLinkRecords: async (id, tenant) => unwrap<Record<string, unknown>[]>(await http.get(query(`/api/linkage/event-iot-device-pro-records/${encodeURIComponent(id)}`, { eventId: id, tenant }), tenantHeader(tenant))),
    listAlarmMedia: async (businessKey) => unwrap<Record<string, unknown>[]>(await http.get(`/api/linkage/event-video-file-paths/${encodeURIComponent(businessKey)}`)),
    executeAlarmAction: async (id, tenant) => { await http.get(query("/api/linkage/event-iot-device-pro/ctrl", { eventIotDeviceId: id, tenant }), tenantHeader(tenant)); },
    getNorthDeviceDetail: async (deviceId, tenant) => unwrap<Record<string, unknown>>(await http.get(query("/api/iot/north/device/detail", { deviceId, withPropertySpec: true, withSnapShot: true }), tenantHeader(tenant))),
  };
}

export async function create(ctx: PlatformContext): Promise<ResourceManagementClient> {
  const module = await ctx.loadPlatform("httpPlatform", "client") as HttpModule;
  return createResourceManagementClient(module.createHttpClientForPlatform(ctx));
}

export type { ResourceManagementClient };
