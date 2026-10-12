import type {
  AccessControlAnyParams,
  AccessControlPagingParams,
  DoorControlParams,
  DoorDevicePageParams,
  DoorStatusParams,
  GetDoorTendParams,
  RemoveDoorDeviceBatchParams,
  RemoveDoorDeviceParams,
  SecurityLockNeedParams,
  SecurityLockVerifyParams,
} from "./request";
import type {
  AccessControlPage,
  AccessControlRecord,
  DeviceProductCategoryRecord,
  DeviceProductRecord,
  DoorDeviceRecord,
  DoorEventRecord,
  DoorRankingRecord,
  DoorTypeRecord,
  EnterpriseDirectoryRecord,
} from "./response";

export interface AccessControlGateway {
  getEnterpriseDirectory: (params: AccessControlPagingParams) => Promise<AccessControlPage<EnterpriseDirectoryRecord>>;
  getDoorRanking: (params: AccessControlAnyParams) => Promise<DoorRankingRecord[]>;
  getDoorEvents: (params: AccessControlAnyParams) => Promise<DoorEventRecord[]>;
  passedTodayNum: (params: AccessControlAnyParams) => Promise<number>;
  getDoorTend: (params: GetDoorTendParams) => Promise<AccessControlRecord[]>;
  generDeviceIsWord: (params: SecurityLockNeedParams) => Promise<boolean | AccessControlRecord>;
  controlDoorverify: (params: SecurityLockVerifyParams) => Promise<boolean | AccessControlRecord>;
  generDevice: (params: AccessControlAnyParams) => Promise<DoorDeviceRecord[] | AccessControlPage<DoorDeviceRecord>>;
  getDoorType: (params: AccessControlAnyParams) => Promise<DoorTypeRecord[]>;
  addDoorDevices: (params: AccessControlAnyParams) => Promise<boolean | AccessControlRecord>;
  getDoorDevicePage: (params: DoorDevicePageParams) => Promise<AccessControlPage<DoorDeviceRecord>>;
  removeDoorDevice: (params: RemoveDoorDeviceParams) => Promise<boolean | void>;
  removeDoorDeviceBatch: (params: RemoveDoorDeviceBatchParams) => Promise<boolean | void>;
  controlDoor: (params: DoorControlParams) => Promise<boolean | AccessControlRecord>;
  getDoorEventRecord: (params: AccessControlPagingParams) => Promise<AccessControlPage<DoorEventRecord>>;
  getToDayEventTrend: (params: AccessControlAnyParams) => Promise<AccessControlRecord[]>;
  getAbnormalEvent: (params: AccessControlPagingParams) => Promise<AccessControlPage<DoorEventRecord>>;
  inspectgetStatus: (params: DoorStatusParams) => Promise<AccessControlRecord>;
  getDeviceProduct: (params: AccessControlAnyParams) => Promise<DeviceProductCategoryRecord[]>;
  getDeviceList: (params: AccessControlAnyParams) => Promise<AccessControlPage<DoorDeviceRecord> | DoorDeviceRecord[]>;
  getProductAll: (params: AccessControlAnyParams) => Promise<DeviceProductRecord[]>;
}
