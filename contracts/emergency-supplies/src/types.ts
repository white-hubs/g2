import type { Pagination } from "@g2-contract/base";

export type PageResult<T> = Pagination<T>;

export interface WarehouseVO {
  id: string;
  name: string;
  code: string;
  address?: string;
  longitude?: number;
  latitude?: number;
  keeperPersonId?: string;
  keeperPersonName?: string;
  status: boolean;
  remark?: string;
}

export interface SuppliesTypeVO {
  id: string;
  name: string;
  code: string;
  color?: string;
  status: boolean;
  remark?: string;
}

export interface WarehouseStockVO {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface SuppliesBatchVO {
  id: string;
  suppliesId: string;
  warehouseId: string;
  warehouseName?: string;
  batchNo: string;
  quantity: number;
  locationDesc?: string;
  longitude?: number;
  latitude?: number;
  productionDate?: string;
  expiryDate?: string;
  supplier?: string;
  supplierContact?: string;
  status: string;
}

export interface SuppliesVO {
  id: string;
  code: string;
  name: string;
  type: string;
  typeName?: string;
  specification?: string;
  unit: string;
  photoFileId?: string;
  quantity?: number;
  safetyStockMin?: number;
  warehouseId?: string;
  warehouseName?: string;
  locationDesc?: string;
  longitude?: number;
  latitude?: number;
  productionDate?: string;
  expiryDate?: string;
  supplier?: string;
  supplierContact?: string;
  status: string;
  remark?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  earliestExpiryDate?: string;
  expiryWarningLevel?: string;
}

export interface DispatchItemVO {
  id: string;
  dispatchOrderId: string;
  suppliesId: string;
  suppliesNameSnapshot: string;
  suppliesSpecSnapshot?: string;
  unit: string;
  warehouseId?: string;
  warehouseNameSnapshot?: string;
  dispatchQuantity: number;
  outboundQuantity: number;
  totalReturned: number;
  totalWriteoff: number;
  status: string;
}

export interface ReturnLogVO {
  id: string;
  dispatchOrderId: string;
  dispatchItemId: string;
  type: string;
  quantity: number;
  operateTime: string;
  operatorName?: string;
  reason?: string;
  remark?: string;
}

export interface DispatchOrderVO {
  id: string;
  code: string;
  dispatchTime: string;
  dispatcherId?: string;
  dispatcherName?: string;
  outboundConfirmerId?: string;
  outboundConfirmerName?: string;
  outboundTime?: string;
  expectedReturnTime?: string;
  status: string;
  remark?: string;
  items?: DispatchItemVO[];
}

export interface WarningConfigVO {
  id?: string;
  warningType: string;
  yellowDays?: number;
  orangeDays?: number;
  redDays?: number;
  enabled: boolean;
}

export interface MapPointVO {
  suppliesId: string;
  suppliesName: string;
  typeId: string;
  typeName?: string;
  typeColor?: string;
  warehouseId: string;
  warehouseName?: string;
  longitude?: number;
  latitude?: number;
  quantity: number;
  earliestExpiryDate?: string;
  warningLevel?: string;
}

export interface MapTypeVO {
  typeId: string;
  typeName?: string;
  typeColor?: string;
  pointCount: number;
  quantity: number;
  points: MapPointVO[];
}
export interface MapWarningVO {
  suppliesId: string;
  suppliesName: string;
  typeId?: string;
  typeName?: string;
  typeColor?: string;
  warehouseId?: string;
  warehouseName?: string;
  earliestExpiryDate?: string;
  warningLevel?: string;
}
export interface DispatchStatVO {
  todayCount: number;
  pendingCount: number;
  usingCount: number;
  monthCount: number;
}

export interface SuppliesOverviewVO {
  typeCount: number;
  totalQuantity: number;
  warningCount: number;
  pendingCount: number;
  usingCount: number;
  monthCount: number;
}
export interface DispatchPayload {
  dispatcherId?: string;
  dispatcherName?: string;
  expectedReturnTime?: string;
  remark?: string;
  items: {
    suppliesId: string;
    warehouseId?: string;
    dispatchQuantity: number;
  }[];
}
