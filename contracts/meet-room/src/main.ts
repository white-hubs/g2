export interface PageResult<T> {
  records: T[];
  total: number;
  pages: number;
}

export interface NamedOption {
  id: string;
  name: string;
  parentId?: string | null;
  children?: NamedOption[] | null;
}

export interface ConferenceDevice {
  id?: string;
  deviceId: string;
  deviceName?: string;
  name?: string;
  code?: string;
  deviceCode?: string;
  deviceProdName?: string;
  deviceProdCategoryName?: string;
  areaName?: string;
}

export interface ConferenceRoom {
  id: string;
  name: string;
  areaId?: string | null;
  areaName?: string | null;
  capacity?: number | null;
  administrators?: string | null;
  administratorsName?: string | null;
  period?: string | null;
  status?: number | null;
  devicesVos?: ConferenceDevice[] | null;
  bookPersonType?: PersonScopeType | null;
  bookPerson?: string | null;
  bookPersonList?: NamedOption[] | null;
  conferenceRoomTypeId?: string | null;
  conferenceRoomTypeName?: string | null;
}

export type PersonScopeType = "DEPARTMENT" | "ROLE" | "USER";

export interface ConferenceRoomPayload {
  id?: string;
  name: string | null;
  areaId?: string | null;
  areaName: string | null;
  capacity: number | null;
  administrators: string | null;
  period: string | null;
  status: number;
  devices: { deviceId: string; name: string }[];
  bookPersonType?: PersonScopeType | null;
  bookPerson?: string | null;
  conferenceRoomTypeId?: string | null;
}

export interface ConferenceGoods {
  id: string;
  goodsName: string;
  illustrate?: string | null;
  areaId?: string | null;
  areaName?: string | null;
}

export interface ConferenceGoodsPayload {
  goodsName: string | null;
  illustrate: string | null;
  areaId: string | null;
  areaName: string | null;
}

export interface ConferenceType {
  id: string;
  name: string;
  status: boolean;
}

export interface FieldConfiguration {
  id: string;
  fieldCode: string;
  fieldName: string;
  required?: boolean | null;
  hidden?: boolean | null;
}

export type DisplayStatus = "OPEN" | "CLOSE";

export interface RoomScreenConfig {
  id: string;
  conferenceId?: string | null;
  conferenceName?: string | null;
  deviceCode?: string | null;
  deviceName?: string | null;
  displayStatus?: DisplayStatus | null;
  cronExpression?: number | null;
  programUrl?: string | null;
  authInfo?: string | null;
  jobId?: number | null;
}

export interface AppointmentSlot {
  bookId?: string | number | null;
  bookStatus?: AppointmentStatus | null;
  conferenceId?: string | number | null;
  timeInterval?: string | null;
}

export type AppointmentStatus =
  | "BEING_USED"
  | "CANCEL_RESERVATION"
  | "EXPIRE"
  | "FINISH"
  | "RESERVABLE"
  | "RESERVED"
  | "APPROVAL"
  | "NO_RESERVABLE";

export interface AppointmentRoom {
  id?: string;
  conferenceId: string;
  conferenceName: string;
  capacity?: number | null;
  appointmentDetails?: AppointmentSlot[] | null;
}

export interface BookRoomDetail {
  id?: string;
  bookId?: string;
  appointmentDate?: string | null;
  conferenceId?: string | null;
  conferenceName?: string | null;
  conferenceType?: string | null;
  conferenceTheme?: string | null;
  timeInterval?: string | null;
  bookNum?: number | null;
  goodsIds?: string | null;
  goodsNames?: string | null;
  content?: string | null;
  subscribePerson?: string | null;
  subscribePersonName?: string | null;
  participantType?: PersonScopeType | null;
  participantList?: NamedOption[] | null;
  organization?: NamedOption | null;
  isCancel?: boolean | null;
  cancelReason?: string | null;
}

export interface BookRoomPayload {
  appointmentDate: string;
  conferenceId: string;
  timeInterval: string;
  conferenceType?: string | null;
  conferenceTheme?: string | null;
  goodsIds?: string | null;
  goodsNames?: string | null;
  bookNum?: number | null;
  content?: string | null;
  participantType?: PersonScopeType | null;
  participantIds?: string[];
}

export interface AppointmentRecord {
  id: string;
  userName?: string | null;
  departmentName?: string | null;
  createTime?: string | number | null;
  operate?: string | null;
  status?: string | null;
  conferenceName?: string | null;
  timeInterval?: string | null;
  goodsNames?: string | null;
  cancelReason?: string | null;
  processInstanceId?: string | null;
  currentTaskId?: string | null;
}

export interface UsageDatum {
  name?: string | null;
  num?: string | number | null;
}

export interface IdleDatum {
  conferenceName?: string | null;
  idleRate?: number | null;
}

export interface IntervalDatum {
  intervalLogCount?: number | null;
  timeInterval?: string | null;
}

export interface IntervalSeries {
  conferenceName?: string | null;
  conferenceNameLists?: IntervalDatum[] | null;
}

export interface ConferencePageQuery {
  pageNumber: number;
  pageSize: number;
  name?: string;
  areaName?: string;
}

export interface AppointmentPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  date?: string;
  status?: string;
}

export interface StatisticsQuery {
  TimeFlag?: string;
  period?: string;
}

export interface DevicePageQuery {
  applicationCode: string;
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  ids?: string[];
}

export interface MeetRoomClient {
  pageConferenceRooms(query: ConferencePageQuery): Promise<PageResult<ConferenceRoom>>;
  listConferenceRooms(query?: { keyword?: string }): Promise<ConferenceRoom[]>;
  getConferenceRoom(id: string): Promise<ConferenceRoom>;
  createConferenceRoom(body: ConferenceRoomPayload): Promise<unknown>;
  updateConferenceRoom(body: ConferenceRoomPayload & { id: string }): Promise<unknown>;
  setConferenceRoomStatus(id: string, status: number): Promise<unknown>;
  deleteConferenceRoom(id: string): Promise<unknown>;

  pageConferenceGoods(query: { goodsName?: string; pageNumber: number; pageSize: number }): Promise<PageResult<ConferenceGoods>>;
  listConferenceGoods(query?: { goodsName?: string; pageNumber?: number; pageSize?: number }): Promise<ConferenceGoods[]>;
  createConferenceGoods(body: ConferenceGoodsPayload): Promise<unknown>;
  updateConferenceGoods(id: string, body: ConferenceGoodsPayload): Promise<unknown>;
  deleteConferenceGoods(id: string): Promise<unknown>;
  batchDeleteConferenceGoods(ids: string[]): Promise<unknown>;

  pageConferenceTypes(query: { keyword?: string; pageNumber: number; pageSize: number }): Promise<PageResult<ConferenceType>>;
  listConferenceTypes(): Promise<ConferenceType[]>;
  createConferenceType(body: Omit<ConferenceType, "id">): Promise<unknown>;
  updateConferenceType(id: string, body: Omit<ConferenceType, "id">): Promise<unknown>;
  deleteConferenceType(id: string): Promise<unknown>;

  pageRoomTypes(query: { keyword?: string; pageNumber: number; pageSize: number; status?: boolean }): Promise<PageResult<ConferenceType>>;
  listRoomTypes(query?: { keyword?: string; status?: boolean }): Promise<ConferenceType[]>;
  saveRoomType(body: Partial<ConferenceType>): Promise<unknown>;
  deleteRoomType(id: string): Promise<unknown>;

  listFieldConfigurations(query: { fieldName?: string; pageNumber: number; pageSize: number }): Promise<PageResult<FieldConfiguration>>;
  updateFieldConfiguration(body: Partial<FieldConfiguration> & { id: string }): Promise<unknown>;

  pageAppointmentRooms(query: AppointmentPageQuery): Promise<PageResult<AppointmentRoom>>;
  createBookRoom(body: BookRoomPayload): Promise<unknown>;
  getBookRoom(id: string): Promise<BookRoomDetail>;
  cancelBookRoom(id: string, reason?: string): Promise<unknown>;
  pageAppointmentRecords(query: AppointmentPageQuery): Promise<PageResult<AppointmentRecord>>;

  getConferenceUsage(query: StatisticsQuery): Promise<UsageDatum[]>;
  getConferenceCount(query: StatisticsQuery): Promise<{ num?: string | number | null }>;
  getConferenceIdle(query: StatisticsQuery): Promise<IdleDatum[]>;
  getTimeIntervalLog(query: StatisticsQuery): Promise<IntervalSeries[]>;

  listRoomScreenConfigs(query?: { keyword?: string }): Promise<RoomScreenConfig[]>;
  saveRoomScreenConfig(body: Partial<RoomScreenConfig>): Promise<unknown>;
  openRoomScreenConfig(body: Partial<RoomScreenConfig>): Promise<unknown>;
  deleteRoomScreenConfig(id: string): Promise<unknown>;
  pageAvailableDevices(query: DevicePageQuery): Promise<PageResult<ConferenceDevice>>;
}
