import type {
  DispatchOrderVO,
  DispatchPayload,
  DispatchStatVO,
  MapPointVO,
  MapTypeVO,
  MapWarningVO,
  PageResult,
  SuppliesOverviewVO,
  SuppliesBatchVO,
  SuppliesTypeVO,
  SuppliesVO,
  WarehouseVO,
  WarningConfigVO,
} from "./types";

export interface EmergencySuppliesGateway {
  getWarehousePage: (payload: Record<string, unknown>) => Promise<PageResult<WarehouseVO>>;
  getWarehouseDetail: (id: string) => Promise<WarehouseVO>;
  createWarehouse: (payload: Partial<WarehouseVO>) => Promise<string>;
  updateWarehouse: (id: string, payload: Partial<WarehouseVO>) => Promise<void>;
  changeWarehouseStatus: (id: string, status: boolean) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  getSuppliesTypePage: (payload: Record<string, unknown>) => Promise<PageResult<SuppliesTypeVO>>;
  createSuppliesType: (payload: Partial<SuppliesTypeVO>) => Promise<string>;
  updateSuppliesType: (id: string, payload: Partial<SuppliesTypeVO>) => Promise<void>;
  deleteSuppliesType: (id: string) => Promise<void>;
  getSuppliesPage: (payload: Record<string, unknown>) => Promise<PageResult<SuppliesVO>>;
  getSuppliesDetail: (id: string) => Promise<SuppliesVO>;
  getSuppliesOverview: () => Promise<SuppliesOverviewVO>;
  createSupplies: (payload: Partial<SuppliesVO> & { firstBatch?: Partial<SuppliesBatchVO> }) => Promise<string>;
  updateSupplies: (id: string, payload: Partial<SuppliesVO>) => Promise<void>;
  changeSuppliesStatus: (id: string, status: string) => Promise<void>;
  exportSuppliesLedger: (payload: Record<string, unknown>) => Promise<Blob>;
  downloadSuppliesImportTemplate: () => Promise<Blob>;
  importSuppliesLedger: (file: File) => Promise<void>;
  createSuppliesBatch: (id: string, payload: Partial<SuppliesBatchVO>) => Promise<string>;
  getSuppliesBatches: (id: string) => Promise<SuppliesBatchVO[]>;
  getDispatchOrderPage: (payload: Record<string, unknown>) => Promise<PageResult<DispatchOrderVO>>;
  getDispatchOrderDetail: (id: string) => Promise<DispatchOrderVO>;
  createDispatchOrder: (payload: DispatchPayload) => Promise<string>;
  getDispatchStat: () => Promise<DispatchStatVO>;
  confirmDispatchOutbound: (id: string, payload?: Record<string, unknown>) => Promise<void>;
  confirmDispatchUsing: (id: string) => Promise<void>;
  cancelDispatchOrder: (id: string) => Promise<void>;
  returnDispatchItem: (id: string, payload: Record<string, unknown>) => Promise<void>;
  writeoffDispatchItem: (id: string, payload: Record<string, unknown>) => Promise<void>;
  getWarningConfig: () => Promise<WarningConfigVO[]>;
  updateWarningConfig: (payload: WarningConfigVO[]) => Promise<void>;
  getExpiryWarningPage: (payload: Record<string, unknown>) => Promise<PageResult<Record<string, unknown>>>;
  getStockWarningPage: (payload: Record<string, unknown>) => Promise<PageResult<Record<string, unknown>>>;
  getSuppliesMapPoints: (payload: Record<string, unknown>) => Promise<MapPointVO[]>;
  getSuppliesMapData: (payload: Record<string, unknown>) => Promise<MapTypeVO[]>;
  getSuppliesMapWarnings: (payload: Record<string, unknown>) => Promise<MapWarningVO[]>;
}
