export interface ColdStorageClient {
  getColdStorePage: (query) => Promise<unknown>;
  getColdStoreDetail: (id) => Promise<unknown>;
  saveColdStore: (payload, id) => Promise<unknown>;
  deleteColdStore: (id) => Promise<unknown>;
  getColdStoreMonitorExceptionStatistics: () => Promise<unknown>;
  getColdStoreMonitorCards: (query) => Promise<unknown>;
  getColdStoreMonitorCardDetail: (id) => Promise<unknown>;
  getColdStoreInsideDoorStatuses: () => Promise<unknown>;
  getColdStoreInsideDoorDetail: (storeId) => Promise<unknown>;
  getColdStoreInsideTemperatureOverview: () => Promise<unknown>;
  getColdStoreRefrigerationHealthOverview: () => Promise<unknown>;
  getColdStoreRefrigerationUnitDetail: (unitCode) => Promise<unknown>;
  getColdStoreRefrigerationEnergy: () => Promise<unknown>;
  getColdStoreLeakResponses: () => Promise<unknown>;
  getColdStoreLeakResponseDetail: (alarmId) => Promise<unknown>;
  getColdStoreStatisticsPreview: () => Promise<unknown>;
}
