export interface PageResult<T> {
  total: number;
  page?: number;
  records: T[];
}

export interface PageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
}

export interface RecordingQuery extends PageQuery {
  code?: string;
  period?: string;
  fileType?: "voice" | "video" | null;
}

export interface Recording {
  id: string;
  caller?: string;
  callee?: string;
  type?: string;
  fileCreateTime?: string;
  fileEndTime?: string;
  url?: string;
  name?: string;
}

export interface GroupPayload {
  id?: string;
  code: string;
  name: string;
  groupLevel: number;
  isRecord: boolean;
  type: number;
}

export interface IntercomGroup extends GroupPayload {
  id: string;
  createTime?: string;
  devices?: DispatchDevice[];
}

export interface DeviceUpdatePayload {
  id?: string;
  name: string;
  code: string;
  password: string;
  type: string;
  deviceLevel: number;
  isRecord: boolean;
  isVideo: boolean;
}

export interface DispatchDevice extends Omit<DeviceUpdatePayload, "id" | "password"> {
  id: string;
  password?: string;
  createTime?: string;
  groups?: { id: string; code?: string; name: string }[];
}

export interface FusionAccount {
  id: string;
  name: string;
  code: string;
  level?: number;
  usageState?: string;
  createTime?: string;
}

/** Business methods return DTOs after the BFF removes the upstream envelope. */
export interface CommandDispatchClient {
  pageRecordings(query: RecordingQuery): Promise<PageResult<Recording>>;
  pageGroups(query: PageQuery): Promise<PageResult<IntercomGroup>>;
  createGroup(payload: GroupPayload): Promise<void>;
  updateGroup(id: string, payload: GroupPayload): Promise<void>;
  deleteGroup(code: string): Promise<void>;
  pageDevices(query: PageQuery): Promise<PageResult<DispatchDevice>>;
  updateDevice(id: string, payload: DeviceUpdatePayload): Promise<void>;
  setGroupMembers(code: string, deviceCodes: string[]): Promise<void>;
  pageAccounts(query: PageQuery): Promise<PageResult<FusionAccount>>;
}
