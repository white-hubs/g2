import type { Pagination } from "@g2-contract/base";

export interface AccessControlRecord {
  id?: string | number;
  [key: string]: unknown;
}

export interface EnterpriseDirectoryRecord extends AccessControlRecord {
  name?: string;
}

export interface DoorRankingRecord extends AccessControlRecord {
  doorName?: string;
  name?: string;
  count?: number;
}

export interface DoorEventRecord extends AccessControlRecord {
  doorName?: string;
  eventTime?: string | number;
  eventType?: string;
}

export interface DoorTypeRecord extends AccessControlRecord {
  doorTypeName?: string;
}

export interface DoorDeviceRecord extends AccessControlRecord {
  name?: string;
  doorCode?: string;
  typeName?: string;
  areaName?: string;
  status?: string;
  businessId?: string;
  outBusinessId?: string;
}

export interface DeviceProductCategoryRecord extends AccessControlRecord {
  name?: string;
  children?: DeviceProductCategoryRecord[];
}

export interface DeviceProductRecord extends AccessControlRecord {
  name?: string;
}

export type AccessControlPage<T extends AccessControlRecord = AccessControlRecord> = Pagination<T>;

export type AccessControlResult<T = unknown> = T;
