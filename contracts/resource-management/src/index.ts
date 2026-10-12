export interface ResourceFile {
  id: string;
  name: string;
  path: string;
}

export interface ResourceItem {
  id: string;
  deviceName: string;
  deptName: string;
  name: string;
  size: string;
  number: string;
  manufacturer: string;
  model: string;
  machinesCode: string;
  arguments: string;
  fileIds: string;
  fileList: ResourceFile[];
}

export interface ResourceGroup {
  id: string;
  itemList: ResourceItem[];
}

export interface ResourcePageQuery {
  pageNumber: number;
  pageSize: number;
  tenant: string;
  deptId: string;
}

export interface ResourceManagementClient {
  pageItems(query: ResourcePageQuery): Promise<{ records: ResourceGroup[]; total: number }>;
  exportItems(query: ResourcePageQuery & { tenantName: string }): Promise<Blob>;
  listTenants(): Promise<{ code: string; name: string }[]>;
  listDepartments(tenant: string, enabled?: boolean): Promise<{ id: string; name: string }[]>;
  listDepartmentDevices(tenant: string): Promise<DepartmentDevice[]>;
  pageManagedItems(query: { tenant: string; deviceId: string; pageNumber: number; pageSize: number }): Promise<ResourceListPage<ManagedItem>>;
  saveManagedItem(item: ManagedItem & { tenant: string; deviceId: string; deviceCode: string; deviceName: string }): Promise<void>;
  deleteManagedItem(id: string): Promise<void>;
  downloadItemTemplate(): Promise<Blob>;
  importItems(tenant: string, file: FormData): Promise<ImportResult>;
  pageMachines(query: { tenant: string; code: string; pageNumber: number; pageSize: number }): Promise<ResourceListPage<Machine>>;
  getMachine(id: string, tenant: string): Promise<Machine>;
  saveMachine(machine: Machine & { tenant: string }): Promise<void>;
  deleteMachine(id: string): Promise<void>;
  downloadMachineTemplate(): Promise<Blob>;
  importMachines(tenant: string, file: FormData): Promise<ImportResult>;
  pageMachineRooms(query: { tenant: string; id: string; pageNumber: number; pageSize: number }): Promise<ResourceListPage<OperatingRoom>>;
  saveMachineRooms(tenant: string, id: string, roomIds: string): Promise<void>;
  deleteMachineRooms(tenant: string, id: string, roomIds: string): Promise<void>;
  pageAvailableRooms(query: { tenant: string; pageNumber: number; pageSize: number; keyword?: string; productId?: string; categoryCode?: string; anyMatchedAreaId?: string; anyMatchedDepartmentId?: string; tagCodes?: string[] }): Promise<ResourceListPage<OperatingRoom>>;
  listProducts(tenant: string): Promise<{ id: string; prodName: string }[]>;
  listCustomerTags(tenant: string): Promise<{ tagCode: string; tagName: string }[]>;
  uploadFile(file: FormData, useTemporary?: boolean): Promise<ResourceFile>;
  pageDeviceInstances(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  pageDeviceLogs(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  pageAlarms(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  getAlarm(id: string, tenant?: string): Promise<Record<string, unknown>>;
  pageMedicalDevices(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  pageMedicalAlarms(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  pageSecurityDevices(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  pageMonitoredDevices(query: Record<string, unknown>, tenant?: string): Promise<ResourceListPage<Record<string, unknown>>>;
  listAreas(tenant: string): Promise<AreaNode[]>;
  listProductCategories(tenant: string): Promise<CategoryNode[]>;
  listAlarmProcess(id: string, tenant: string): Promise<Record<string, unknown>[]>;
  listAlarmLinkActions(id: string, tenant: string): Promise<Record<string, unknown>[]>;
  listAlarmLinkRecords(id: string, tenant: string): Promise<Record<string, unknown>[]>;
  listAlarmMedia(businessKey: string): Promise<Record<string, unknown>[]>;
  executeAlarmAction(id: string, tenant: string): Promise<void>;
  getNorthDeviceDetail(deviceId: string, tenant?: string): Promise<Record<string, unknown>>;
}

export interface ResourceListPage<T> { records: T[]; total: number }
export interface DepartmentDevice { id: string; code: string; name: string; deviceBool?: boolean; children?: DepartmentDevice[] }
export interface ManagedItem { id: string; name: string; size: string; number: string; manufacturer: string; model: string; deviceName?: string; deviceCode?: string; machinesCode?: string }
export interface Machine { id: string; tenant: string; code: string; arguments: string; fileIds: string; fileList: ResourceFile[]; roomIds: string; roomNumber: number; createTime?: number }
export interface OperatingRoom { id: string; name: string; code: string; deptName?: string; deviceName?: string }
export interface ImportResult { success: number; fail: number; errorMsgList: { key: string; value: string }[] }
export interface AreaNode { id: string; name: string; children?: AreaNode[] }
export interface CategoryNode { categoryCode: string; categoryName: string; children?: CategoryNode[] }
