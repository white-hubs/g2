export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface PageQuery {
  pageNumber: number;
  pageSize: number;
  [key: string]: unknown;
}

export interface ParkFile {
  id: string;
  name?: string | null;
  path?: string | null;
  size?: number | null;
  suffix?: string | null;
  type?: string | null;
}

export interface SelectRecord {
  id?: string;
  code?: string;
  name?: string;
  label?: string;
  value?: string;
  deleted?: boolean;
  parentId?: string | null;
  children?: SelectRecord[] | null;
}

export interface TypeRecord {
  id: string;
  name: string;
  tag?: string;
}

export interface EnterpriseRecord {
  id: string;
  name: string;
  corporation?: string;
  type?: string;
  typeName?: string;
  industryTypeId?: string;
  industryTypeName?: string;
  scale?: string;
  scaleName?: string;
  contacts?: string;
  contactsPhone?: string;
  fileVOS?: ParkFile[];
  [key: string]: unknown;
}

export interface RoomRecord {
  id: string;
  name: string;
  roomTypeId?: string;
  roomTypeName?: string;
  areaId?: string;
  areaName?: string;
  areaSequence?: string;
  floorage?: number | string;
  floorageBilling?: number | string;
  status?: string;
  statusName?: string;
  fileVOS?: ParkFile[];
  [key: string]: unknown;
}

export interface AppealRecord {
  id: string;
  name: string;
  time?: string;
  appealTypeId?: string;
  appealTypeName?: string;
  enterpriseId?: string;
  enterpriseName?: string;
  username?: string;
  description?: string;
  measure?: string;
  fileVOS?: ParkFile[];
  [key: string]: unknown;
}

export interface InterviewRecord {
  id: string;
  enterpriseId?: string;
  enterpriseName?: string;
  time?: string;
  person?: string;
  receptionPerson?: string;
  interviewTypeId?: string;
  interviewTypeName?: string;
  recordContent?: string;
  appealIds?: string;
  appealListVOS?: { id: string; name: string }[];
  fileVOS?: ParkFile[];
  [key: string]: unknown;
}

export interface RentalRoom {
  roomId: string;
  roomName: string;
}

export interface RentalRecord {
  id: string;
  enterpriseId?: string;
  enterpriseName?: string;
  roomNames?: string;
  rentRooms?: RentalRoom[];
  signTime?: string;
  beginTime?: string;
  endTime?: string;
  fileVOS?: ParkFile[];
  [key: string]: unknown;
}

export interface MonitorRecord {
  id: string;
  monitorName: string;
  monitorUrl: string;
  categoryCode?: string;
  description?: string;
}

export interface TenantOverview {
  floorArea?: number;
  areaCovered?: number;
  remark?: string;
  files?: ParkFile[];
}

export interface RoomStatistics {
  leaseTotal: number;
  leaseNum: number;
}

export interface RoomRateRecord {
  areaName: string;
  num: number;
}

export type ParkPayload = Record<string, unknown>;
export type OperationRecord = Record<string, unknown> & { id?: string };

export interface FactoryManagementClient {
  getTenantOverview(tenantCode: string): Promise<TenantOverview>;
  getRoomStatistics(): Promise<RoomStatistics>;
  listRoomRates(): Promise<RoomRateRecord[]>;

  listTypes(tag: string, query?: Record<string, unknown>): Promise<SelectRecord[]>;
  pageTypes(tag: string, query: PageQuery): Promise<PageResult<TypeRecord>>;
  createType(tag: string, body: { name: string }): Promise<unknown>;
  updateType(id: string, body: { name: string }): Promise<unknown>;
  deleteType(id: string): Promise<unknown>;

  listEnterpriseTypes(): Promise<SelectRecord[]>;
  listEnterpriseScales(): Promise<SelectRecord[]>;
  listEnterprises(query?: Record<string, unknown>): Promise<SelectRecord[]>;
  pageEnterprises(query: PageQuery): Promise<PageResult<EnterpriseRecord>>;
  pageEnterpriseDirectory(query: PageQuery): Promise<PageResult<EnterpriseRecord>>;
  getEnterprise(id: string): Promise<EnterpriseRecord>;
  createEnterprise(body: ParkPayload): Promise<unknown>;
  updateEnterprise(id: string, body: ParkPayload): Promise<unknown>;
  deleteEnterprise(id: string): Promise<unknown>;
  deleteEnterprises(ids: string[]): Promise<unknown>;

  pageAppeals(query: PageQuery): Promise<PageResult<AppealRecord>>;
  listAppeals(query?: Record<string, unknown>): Promise<SelectRecord[]>;
  getAppeal(id: string): Promise<AppealRecord>;
  createAppeal(body: ParkPayload): Promise<unknown>;
  updateAppeal(id: string, body: ParkPayload): Promise<unknown>;
  deleteAppeal(id: string): Promise<unknown>;
  deleteAppeals(ids: string[]): Promise<unknown>;

  pageInterviews(query: PageQuery): Promise<PageResult<InterviewRecord>>;
  getInterview(id: string): Promise<InterviewRecord>;
  createInterview(body: ParkPayload): Promise<unknown>;
  updateInterview(id: string, body: ParkPayload): Promise<unknown>;
  deleteInterview(id: string): Promise<unknown>;
  deleteInterviews(ids: string[]): Promise<unknown>;

  listAreas(query?: Record<string, unknown>): Promise<SelectRecord[]>;
  listRoomStatuses(): Promise<SelectRecord[]>;
  listRooms(query?: Record<string, unknown>): Promise<SelectRecord[]>;
  pageRooms(query: PageQuery): Promise<PageResult<RoomRecord>>;
  getRoom(id: string): Promise<RoomRecord>;
  createRoom(body: ParkPayload): Promise<unknown>;
  updateRoom(id: string, body: ParkPayload): Promise<unknown>;
  deleteRoom(id: string): Promise<unknown>;
  deleteRooms(ids: string[]): Promise<unknown>;

  pageRentals(query: PageQuery): Promise<PageResult<RentalRecord>>;
  getRental(id: string): Promise<RentalRecord>;
  createRental(body: ParkPayload): Promise<unknown>;
  updateRental(id: string, body: ParkPayload): Promise<unknown>;
  deleteRental(id: string): Promise<unknown>;
  deleteRentals(ids: string[]): Promise<unknown>;

  listMonitors(categoryCode?: string): Promise<MonitorRecord[]>;
  createMonitor(body: Omit<MonitorRecord, "id"> & { applicationCode: string }): Promise<unknown>;
  updateMonitor(id: string, body: Partial<MonitorRecord> & { applicationCode: string }): Promise<unknown>;
  deleteMonitor(id: string): Promise<unknown>;

  pageInvestmentPlans(query: PageQuery): Promise<PageResult<OperationRecord>>;
  pageProjects(query: PageQuery): Promise<PageResult<OperationRecord>>;
  pageEstateContracts(query: PageQuery): Promise<PageResult<OperationRecord>>;
  pageComplaints(query: PageQuery): Promise<PageResult<OperationRecord>>;
  pageRentRecords(query: PageQuery): Promise<PageResult<OperationRecord>>;
}
