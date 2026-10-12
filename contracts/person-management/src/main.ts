export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface PageQuery {
  pageNumber: number;
  pageSize: number;
}

export interface StaffPageQuery extends PageQuery {
  keyword?: string;
  organizationId?: string;
  archiveStatus?: string;
  type?: string;
  status?: string;
  item?: string | null;
  sort?: string | null;
}

export interface StaffRow {
  id: string;
  name?: string;
  jobNumber?: string;
  mobile?: string;
  organizationId?: string;
  organizationName?: string;
  appointmentName?: string;
  postNames?: string;
  type?: string;
  typeName?: string;
  status?: string;
  statusName?: string;
  stateName?: string;
  archiveStatus?: string;
  [key: string]: unknown;
}

export interface StaffEnumOption {
  value: string;
  name: string;
  label?: string;
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  children?: Organization[];
  [key: string]: unknown;
}

export interface AreaTree {
  id: string;
  name: string;
  nextList?: AreaTree[];
  children?: AreaTree[];
  [key: string]: unknown;
}

export interface AssociationPageQuery extends PageQuery {
  keyword?: string;
  type?: string;
  doorArea?: string;
  areaId?: string;
}

export interface DoorType {
  id: string | number;
  doorTypeName: string;
  children?: DoorType[];
  [key: string]: unknown;
}

export interface AssociationDevice {
  id: string;
  name: string;
  doorCode?: string;
  typeName?: string;
  areaName?: string;
  code?: string;
  [key: string]: unknown;
}

export interface Appointment {
  id: string;
  name: string;
  remark?: string;
  enable?: boolean;
  updateTime?: string | number;
  [key: string]: unknown;
}

export interface PersonnelCategory {
  id: string;
  code?: string;
  name: string;
  remark?: string;
}

export interface StaffChangeRow {
  organizationName?: string;
  recruitNum?: number;
  inductionNum?: number;
  regularWorkerNum?: number;
  quitNum?: number;
  currentNum?: number;
  [key: string]: unknown;
}

export interface StaffDistribution {
  name: string;
  num: number;
}

export interface StaffStructure {
  total: number;
  statusDistr: StaffDistribution[];
  inductionDateDistr: StaffDistribution[];
  genderDistr: StaffDistribution[];
  eduDistr: StaffDistribution[];
  deptDistr: StaffDistribution[];
  ageDistr: StaffDistribution[];
}

export interface StaffExchangeQuery {
  timeType: string;
  period: string;
  organizationId?: string;
}

export interface StaffExchangeTrend {
  timeFlag: string;
  inductionNum: number | string;
  regularWorkerNum: number | string;
  quitNum: number | string;
}

export interface StaffExchange {
  inductionNum: number;
  regularWorkerNum: number;
  quitNum: number;
  exchangeTrend: StaffExchangeTrend[];
}

export interface StaffImportError {
  row: number;
  column: number;
  colName: string;
  msg: string;
}

export interface UserPermissionItem {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface UserPermission {
  consumePm: boolean;
  doorDeviceList: UserPermissionItem[];
  parkingInfos: UserPermissionItem[];
}

export interface FlowPageQuery extends PageQuery {
  type: string;
  businessType: string;
  status?: string | null;
  submitTime?: string;
}

export interface ApprovalRecordQuery extends PageQuery {
  applicationCode: string;
  businessType?: string;
  organizationId?: string;
  submitTime?: string;
  username?: string;
  status?: string;
}

export interface ApprovalRecordExportQuery {
  submitTime?: string;
  username?: string;
  status?: string;
  applicationCode?: string;
  businessType?: string;
  exportName?: string;
  startUserId?: string;
  organizationId?: string;
  processInstanceIds?: string;
  processInstanceIdsList?: string[];
}

export interface FlowInstanceRow {
  formNo?: string;
  instanceName?: string;
  startUserName?: string;
  startUserInfo?: { organizationName?: string; [key: string]: unknown };
  submitedTime?: number | string;
  status?: string;
  activeNodeName?: string;
  processInstanceId?: string;
  currentTaskId?: string;
  businessType?: string;
  [key: string]: unknown;
}

export type PersonnelStatisticsType = "recruit" | "induction" | "probation-assess" | "regular-worker" | "leave-office" | "rotation-post";

export interface PeriodPageQuery extends PageQuery {
  period: string;
}

export interface PersonnelStatisticsRow {
  id?: string;
  organizationName?: string;
  staffName?: string;
  [key: string]: unknown;
}

export interface ApprovalType {
  code: string;
  name: string;
}

export interface FormFlow {
  id: string;
  name?: string;
  formDefinitionId?: string;
  formJson?: string;
  formBizFieldMapList?: { controlId: string; businessField: string }[];
  formFieldList?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface FlowBusinessField {
  id: string;
  name: string;
}

export interface SaveFormFlowBusiness {
  formDefinitionId: string;
  businessType?: string;
  businessTypeName?: string;
  formFlowId: string;
  fieldMapList: { controlId: string; businessField: string | null; title?: string }[];
}

export interface DictionaryRecord {
  id: string;
  itemCode?: string;
  name?: string;
  code?: string;
  variable?: string;
  remarks?: string;
  version?: string;
  [key: string]: unknown;
}

export interface DictionaryQuery {
  itemCode: string;
  name?: string;
  code?: string;
  tenant?: string;
}

export interface DataDictionaryPayload {
  itemCode: string;
  name?: string;
  code?: string;
  variable?: string;
  tenant?: string;
}

export interface UpdateDataDictionaryPayload extends DataDictionaryPayload {
  id: string;
  name: string;
  remarks?: string;
  version?: string;
}

export interface PersonnelManagementClient {
  getStaffStructure(): Promise<StaffStructure>;
  getStaffExchange(query: StaffExchangeQuery): Promise<StaffExchange>;
  listOrganizations(): Promise<Organization[]>;
  getStaffChangeStatistics(query: PeriodPageQuery): Promise<PageResult<StaffChangeRow>>;
  exportStaffChangeStatistics(query: { period: string }): Promise<Blob>;

  pageAppointments(query: PageQuery & { enable?: boolean | null; keyword?: string }): Promise<PageResult<Appointment>>;
  saveAppointment(body: Record<string, unknown>): Promise<unknown>;

  pageStaff(query: StaffPageQuery): Promise<PageResult<StaffRow>>;
  getStaff(id: string, encryptionPhone?: boolean): Promise<StaffRow>;
  saveStaff(body: Record<string, unknown>): Promise<unknown>;
  getStaffEnums(type: string): Promise<StaffEnumOption[]>;
  listDepartments(query?: Record<string, unknown>): Promise<Organization[]>;
  treeDepartments(query?: Record<string, unknown>): Promise<Organization[]>;
  listAppointments(): Promise<Appointment[]>;
  listPositions(): Promise<Appointment[]>;
  getAreaTree(): Promise<AreaTree[]>;
  getDoorTypeList(): Promise<DoorType[]>;
  pageDoorDevices(query: AssociationPageQuery): Promise<PageResult<AssociationDevice>>;
  pageParkingLots(query: AssociationPageQuery): Promise<PageResult<AssociationDevice>>;
  exportStaffTemplate(): Promise<Blob>;
  exportStaff(query: Record<string, unknown>): Promise<Blob>;
  importStaff(file: Blob): Promise<StaffImportError[]>;

  pagePersonnelCategories(query: PageQuery & { name?: string }): Promise<PageResult<PersonnelCategory>>;
  listPersonnelCategories(): Promise<PersonnelCategory[]>;
  savePersonnelCategory(body: { id?: string; name: string; remark: string }): Promise<unknown>;
  deletePersonnelCategory(id: string): Promise<unknown>;

  getUserPermissionMobile(mobile: string): Promise<UserPermission>;
  updateUserPermissionMobile(body: UserPermission & { mobile: string }): Promise<unknown>;

  getFlowProcessPage(query: FlowPageQuery): Promise<PageResult<FlowInstanceRow>>;
  pageApprovalRecords(query: ApprovalRecordQuery): Promise<PageResult<FlowInstanceRow>>;
  exportApprovalRecords(query: ApprovalRecordExportQuery): Promise<Blob>;
  getPersonnelStatistics(type: PersonnelStatisticsType, query: PeriodPageQuery): Promise<PageResult<PersonnelStatisticsRow>>;
  getPersonnelStatisticsDetail(
    type: PersonnelStatisticsType,
    id: string,
    query: PeriodPageQuery,
  ): Promise<PageResult<PersonnelStatisticsRow>>;
  exportPersonnelStatistics(type: PersonnelStatisticsType, query: { period: string }): Promise<Blob>;

  listApprovalTypes(): Promise<ApprovalType[]>;
  getFormFlowBusinessFlow(code: string): Promise<string | null>;
  listFormFlows(query: { enable: boolean; application: string }): Promise<FormFlow[]>;
  getFormFlow(id: string): Promise<FormFlow>;
  listFlowFormFields(type: string): Promise<FlowBusinessField[]>;
  saveFormFlowBusiness(body: SaveFormFlowBusiness): Promise<unknown>;

  getDictionaryItemByCode(query: { code: string }): Promise<DictionaryRecord | null>;
  createDictionaryItem(body: { code: string; remarks?: string }): Promise<unknown>;
  getDictionaryByItem(query: DictionaryQuery): Promise<DictionaryRecord[]>;
  createDataDictionary(body: DataDictionaryPayload): Promise<unknown>;
  updateDataDictionary(body: UpdateDataDictionaryPayload): Promise<unknown>;
}
