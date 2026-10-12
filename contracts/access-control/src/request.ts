import type { Paging } from "@g2-contract/base";

export interface AccessControlAnyParams {
  [key: string]: unknown;
}

export interface AccessControlPagingParams extends Partial<Paging>, AccessControlAnyParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
}

export interface GetDoorTendParams extends AccessControlAnyParams {
  timeFlag: string;
}

export interface DoorDevicePageParams extends AccessControlPagingParams {
  type?: string;
  doorArea?: string;
  applicationCode?: string;
}

export interface RemoveDoorDeviceParams extends AccessControlAnyParams {
  id: string | number;
}

export interface RemoveDoorDeviceBatchParams extends AccessControlAnyParams {
  ids: string | number | Array<string | number>;
}

export interface DoorControlParams extends AccessControlAnyParams {
  id?: string | number;
  doorId?: string | number;
  status?: string | number;
}

export interface DoorStatusParams extends AccessControlAnyParams {
  id: string | number;
}

export interface SecurityLockNeedParams extends AccessControlAnyParams {
  deviceInstanceId: string | number;
}

export interface SecurityLockVerifyParams extends AccessControlAnyParams {
  deviceInstanceId?: string | number;
  password?: string;
}
