import type { FireManagementGateway } from "./gateway";
import type { SaveFireManageDeviceParams } from "./request";

/** Client facade extends gateway with stats / helpers used by PC pages. */
export interface FireManagementClient extends FireManagementGateway {
  getFireManageStats: () => Promise<{
    hostCount: number;
    pointCount: number;
    todayAlarmCount: number;
    todayFaultCount: number;
  }>;
  getProductModelList: (type?: string) => Promise<string[]>;
  getDeviceNameList: () => Promise<{ id: number | string; deviceName: string; areaName?: string; productModel?: string }[]>;
  getRefMonitorDeviceIds: (deviceId: string | number) => Promise<string[]>;
  getDeviceCenterInfo: (deviceId: string | number) => Promise<unknown>;
  getAreaList: () => Promise<unknown[]>;
  getAreaPlaneMap: (areaId: string | number) => Promise<unknown[]>;
  setControlPassword: (params: { id: string | number; password: string }) => Promise<void>;
  /** @deprecated Use batchFillFirePointEmptyFields. */
  batchFillEmptyFields: (file: File) => Promise<unknown>;
  addFireManageDevice: (params: SaveFireManageDeviceParams) => Promise<unknown>;
}
