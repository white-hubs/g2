import type { WarehouseSafetyClient } from "@g2-client/warehouse-safety/client";
import type { Pagination } from "@g2-contract/base";
import type {
  WarehouseSafetyAreaTreeNode,
  WarehouseSafetyDeviceOption,
  WarehouseSafetyEvent,
  WarehouseSafetyForklift,
  WarehouseSafetyForkliftParam,
  WarehouseSafetyForkliftStatistics,
  WarehouseSafetyPageParams,
  WarehouseSafetyShelf,
  WarehouseSafetyShelfParam,
  WarehouseSafetyShelfStatistics,
  WarehouseSafetyWarehouse,
  WarehouseSafetyWarehouseParam,
  WarehouseSafetyWarehouseStatistics,
} from "@g2-contract/warehouse-safety";

import { getWarehouseSafetyClient } from "@/domain-context";

function unwrap<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

async function call<T>(method: keyof WarehouseSafetyClient, ...args: unknown[]): Promise<T> {
  const fn = getWarehouseSafetyClient()[method] as (...values: unknown[]) => Promise<unknown>;
  return unwrap<T>(await fn(...args));
}

export const warehouseSafetyApi = {
  pageWarehouses: (params: WarehouseSafetyPageParams) => call<Pagination<WarehouseSafetyWarehouse>>("pageWarehouses", params),
  getWarehouseStatistics: () => call<WarehouseSafetyWarehouseStatistics>("getWarehouseStatistics"),
  getWarehouse: (id: string) => call<WarehouseSafetyWarehouse>("getWarehouse", id),
  createWarehouse: (payload: WarehouseSafetyWarehouseParam) => call<WarehouseSafetyWarehouse>("createWarehouse", payload),
  updateWarehouse: (id: string, payload: WarehouseSafetyWarehouseParam) => call<WarehouseSafetyWarehouse>("updateWarehouse", id, payload),
  deleteWarehouse: (id: string) => call<void>("deleteWarehouse", id),
  pageShelves: (params: WarehouseSafetyPageParams) => call<Pagination<WarehouseSafetyShelf>>("pageShelves", params),
  getShelfStatistics: () => call<WarehouseSafetyShelfStatistics>("getShelfStatistics"),
  getShelf: (id: string) => call<WarehouseSafetyShelf>("getShelf", id),
  createShelf: (payload: WarehouseSafetyShelfParam) => call<WarehouseSafetyShelf>("createShelf", payload),
  updateShelf: (id: string, payload: WarehouseSafetyShelfParam) => call<WarehouseSafetyShelf>("updateShelf", id, payload),
  deleteShelf: (id: string) => call<void>("deleteShelf", id),
  pageForklifts: (params: WarehouseSafetyPageParams) => call<Pagination<WarehouseSafetyForklift>>("pageForklifts", params),
  getForkliftStatistics: () => call<WarehouseSafetyForkliftStatistics>("getForkliftStatistics"),
  getForklift: (id: string) => call<WarehouseSafetyForklift>("getForklift", id),
  createForklift: (payload: WarehouseSafetyForkliftParam) => call<WarehouseSafetyForklift>("createForklift", payload),
  updateForklift: (id: string, payload: WarehouseSafetyForkliftParam) => call<WarehouseSafetyForklift>("updateForklift", id, payload),
  deleteForklift: (id: string) => call<void>("deleteForklift", id),
  pageEvents: (params: WarehouseSafetyPageParams) => call<Pagination<WarehouseSafetyEvent>>("pageEvents", params),
  getEvent: (id: string) => call<WarehouseSafetyEvent>("getEvent", id),
  listEventDevices: (id: string) => call<WarehouseSafetyDeviceOption[]>("listEventDevices", id),
  pageDeviceOptions: (params: WarehouseSafetyPageParams) => call<Pagination<WarehouseSafetyDeviceOption>>("pageDeviceOptions", params),
  getAreaTree: () => call<WarehouseSafetyAreaTreeNode[]>("getAreaTree"),
};
