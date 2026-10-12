export type WarehouseSafetyStatus = "ACTIVE" | "INACTIVE" | string;

export interface WarehouseSafetyPageParams {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  status?: WarehouseSafetyStatus | "";
  areaId?: string;
  warehouseId?: string;
  zoneType?: string;
  forkliftType?: string;
  deviceType?: string;
  categoryCode?: string;
  alarmStatus?: string;
  alarmLevelCode?: string;
  startTime?: string;
  endTime?: string;
}

export interface WarehouseSafetyWarehouse {
  id: string;
  code: string;
  name: string;
  areaId?: string;
  areaName?: string;
  address?: string;
  managerUserId?: string;
  managerName?: string;
  contactPhone?: string;
  capacity?: number;
  capacityUnit?: string;
  builtTime?: string;
  status?: WarehouseSafetyStatus;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseSafetyWarehouseParam {
  code: string;
  name: string;
  areaId?: string;
  areaName?: string;
  address?: string;
  managerUserId?: string;
  managerName?: string;
  contactPhone?: string;
  capacity?: number;
  capacityUnit?: string;
  builtTime?: string;
  status?: WarehouseSafetyStatus;
  remark?: string;
}

export interface WarehouseSafetyShelf {
  id: string;
  code?: string;
  name: string;
  zoneType?: string;
  zoneTypeName?: string;
  warehouseId?: string;
  warehouseName?: string;
  areaId?: string;
  areaName?: string;
  length?: number;
  width?: number;
  shelfRows?: number;
  cameraDeviceIds?: string[];
  cameraDeviceNames?: string[];
  cameraDeviceCodes?: string[];
  cameraCount?: number;
  status?: WarehouseSafetyStatus;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseSafetyShelfParam {
  code?: string;
  name: string;
  zoneType?: string;
  zoneTypeName?: string;
  warehouseId?: string;
  warehouseName?: string;
  areaId?: string;
  areaName?: string;
  length?: number;
  width?: number;
  shelfRows?: number;
  cameraDeviceIds?: string[];
  cameraDeviceNames?: string[];
  cameraDeviceCodes?: string[];
  status?: WarehouseSafetyStatus;
  remark?: string;
}

export interface WarehouseSafetyForklift {
  id: string;
  code: string;
  name: string;
  forkliftType?: string;
  forkliftTypeName?: string;
  warehouseId?: string;
  warehouseName?: string;
  areaId?: string;
  areaName?: string;
  deviceId?: string;
  deviceCode?: string;
  deviceName?: string;
  longitude?: number | string;
  latitude?: number | string;
  cameraDeviceIds?: string[];
  cameraDeviceNames?: string[];
  driverUserId?: string;
  driverName?: string;
  licensePlate?: string;
  loadCapacity?: number;
  loadCapacityUnit?: string;
  batterySpec?: string;
  status?: WarehouseSafetyStatus;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseSafetyForkliftParam {
  code: string;
  name: string;
  forkliftType?: string;
  forkliftTypeName?: string;
  warehouseId?: string;
  warehouseName?: string;
  areaId?: string;
  areaName?: string;
  deviceId?: string;
  deviceCode?: string;
  deviceName?: string;
  cameraDeviceIds?: string[];
  cameraDeviceNames?: string[];
  driverUserId?: string;
  driverName?: string;
  licensePlate?: string;
  loadCapacity?: number;
  loadCapacityUnit?: string;
  batterySpec?: string;
  status?: WarehouseSafetyStatus;
  remark?: string;
}

export interface WarehouseSafetyEvent {
  id: string;
  alarmEventName?: string;
  alarmLevelName?: string;
  alarmLevelCode?: string;
  alarmStatus?: string;
  alarmStatusName?: string;
  alarmTime?: string;
  alarmTargetName?: string;
  alarmTargetKey?: string;
  areaName?: string;
  businessKey?: string;
  defaultDeviceId?: string;
  deviceIds?: string[];
  warehouseId?: string;
  warehouseName?: string;
  shelfId?: string;
  shelfName?: string;
  forkliftId?: string;
  forkliftName?: string;
  remark?: string;
}

export interface WarehouseSafetyDeviceOption {
  id: string;
  code?: string;
  name: string;
  productName?: string;
  categoryName?: string;
  areaName?: string;
  status?: string;
}

export interface WarehouseSafetyAreaTreeNode {
  id: string;
  name: string;
  parentId?: string;
  children?: WarehouseSafetyAreaTreeNode[];
}

export interface WarehouseSafetyWarehouseStatistics {
  warehouseTotal?: number;
  totalArea?: number;
  maxWarehouseArea?: number;
  managerCount?: number;
}

export interface WarehouseSafetyShelfStatistics {
  deployedAreaCount?: number;
  boundCameraCount?: number;
  unboundAreaCount?: number;
}

export interface WarehouseSafetyForkliftStatistics {
  forkliftTotal?: number;
  electricForkliftCount?: number;
  boundCameraCount?: number;
}
