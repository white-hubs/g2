import type { Pagination } from "@g2-contract/base";

import type {
  WarehouseSafetyAreaTreeNode,
  WarehouseSafetyDeviceOption,
  WarehouseSafetyEvent,
  WarehouseSafetyForklift,
  WarehouseSafetyForkliftStatistics,
  WarehouseSafetyForkliftParam,
  WarehouseSafetyPageParams,
  WarehouseSafetyShelf,
  WarehouseSafetyShelfStatistics,
  WarehouseSafetyShelfParam,
  WarehouseSafetyWarehouse,
  WarehouseSafetyWarehouseStatistics,
  WarehouseSafetyWarehouseParam,
} from "./types";

export interface WarehouseSafetyGateway {
  pageWarehouses: (params: WarehouseSafetyPageParams) => Promise<Pagination<WarehouseSafetyWarehouse>>;
  getWarehouseStatistics: () => Promise<WarehouseSafetyWarehouseStatistics>;
  getWarehouse: (id: string | number) => Promise<WarehouseSafetyWarehouse>;
  createWarehouse: (payload: WarehouseSafetyWarehouseParam) => Promise<WarehouseSafetyWarehouse>;
  updateWarehouse: (id: string | number, payload: WarehouseSafetyWarehouseParam) => Promise<WarehouseSafetyWarehouse>;
  deleteWarehouse: (id: string | number) => Promise<void>;

  pageShelves: (params: WarehouseSafetyPageParams) => Promise<Pagination<WarehouseSafetyShelf>>;
  getShelfStatistics: () => Promise<WarehouseSafetyShelfStatistics>;
  getShelf: (id: string | number) => Promise<WarehouseSafetyShelf>;
  createShelf: (payload: WarehouseSafetyShelfParam) => Promise<WarehouseSafetyShelf>;
  updateShelf: (id: string | number, payload: WarehouseSafetyShelfParam) => Promise<WarehouseSafetyShelf>;
  deleteShelf: (id: string | number) => Promise<void>;

  pageForklifts: (params: WarehouseSafetyPageParams) => Promise<Pagination<WarehouseSafetyForklift>>;
  getForkliftStatistics: () => Promise<WarehouseSafetyForkliftStatistics>;
  getForklift: (id: string | number) => Promise<WarehouseSafetyForklift>;
  createForklift: (payload: WarehouseSafetyForkliftParam) => Promise<WarehouseSafetyForklift>;
  updateForklift: (id: string | number, payload: WarehouseSafetyForkliftParam) => Promise<WarehouseSafetyForklift>;
  deleteForklift: (id: string | number) => Promise<void>;

  pageEvents: (params: WarehouseSafetyPageParams) => Promise<Pagination<WarehouseSafetyEvent>>;
  getEvent: (id: string | number) => Promise<WarehouseSafetyEvent>;
  listEventDevices: (id: string | number) => Promise<WarehouseSafetyDeviceOption[]>;

  pageDeviceOptions: (params: WarehouseSafetyPageParams) => Promise<Pagination<WarehouseSafetyDeviceOption>>;
  getAreaTree: () => Promise<WarehouseSafetyAreaTreeNode[]>;
}
