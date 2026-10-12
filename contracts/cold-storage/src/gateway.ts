import type { Pagination } from "@g2-contract/base";

import type { ColdStoreMonitorCardQuery, ColdStoreQuery, ColdStoreSavePayload } from "./request";
import type {
  ColdStore,
  ColdStoreInsideDoorDetail,
  ColdStoreInsideDoorStatus,
  ColdStoreInsideTemperatureOverview,
  ColdStoreLeakResponseDetail,
  ColdStoreLeakResponseListItem,
  ColdStoreMonitorCard,
  ColdStoreMonitorCardDetail,
  ColdStoreMonitorExceptionStatistics,
  ColdStoreRefrigerationEnergy,
  ColdStoreRefrigerationHealthOverview,
  ColdStoreRefrigerationUnitDetail,
  ColdStoreStatisticsPreview,
} from "./response";

export interface ColdStorageGateway {
  getColdStorePage: (query: ColdStoreQuery) => Promise<Pagination<ColdStore>>;
  getColdStoreDetail: (id: string) => Promise<ColdStore>;
  saveColdStore: (payload: ColdStoreSavePayload, id?: string) => Promise<void>;
  deleteColdStore: (id: string) => Promise<void>;
  getColdStoreMonitorExceptionStatistics: () => Promise<ColdStoreMonitorExceptionStatistics>;
  getColdStoreMonitorCards: (query: ColdStoreMonitorCardQuery) => Promise<Pagination<ColdStoreMonitorCard>>;
  getColdStoreMonitorCardDetail: (id: string) => Promise<ColdStoreMonitorCardDetail>;
  getColdStoreInsideDoorStatuses: () => Promise<ColdStoreInsideDoorStatus[]>;
  getColdStoreInsideDoorDetail: (storeId: string) => Promise<ColdStoreInsideDoorDetail>;
  getColdStoreInsideTemperatureOverview: () => Promise<ColdStoreInsideTemperatureOverview>;
  getColdStoreRefrigerationHealthOverview: () => Promise<ColdStoreRefrigerationHealthOverview>;
  getColdStoreRefrigerationUnitDetail: (unitCode: string) => Promise<ColdStoreRefrigerationUnitDetail>;
  getColdStoreRefrigerationEnergy: () => Promise<ColdStoreRefrigerationEnergy>;
  getColdStoreLeakResponses: () => Promise<ColdStoreLeakResponseListItem[]>;
  getColdStoreLeakResponseDetail: (alarmId: string) => Promise<ColdStoreLeakResponseDetail>;
  getColdStoreStatisticsPreview: () => Promise<ColdStoreStatisticsPreview>;
}
