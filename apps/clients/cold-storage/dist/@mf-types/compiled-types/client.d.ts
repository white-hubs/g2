import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type ColdStorageClient = {
    getColdStorePage: (query?: unknown) => Promise<unknown>;
    getColdStoreDetail: (id?: unknown) => Promise<unknown>;
    saveColdStore: (payload?: unknown, _id?: unknown) => Promise<unknown>;
    deleteColdStore: (id?: unknown) => Promise<unknown>;
    getColdStoreMonitorExceptionStatistics: () => Promise<unknown>;
    getColdStoreMonitorCards: (query?: unknown) => Promise<unknown>;
    getColdStoreMonitorCardDetail: (id?: unknown) => Promise<unknown>;
    getColdStoreInsideDoorStatuses: () => Promise<unknown>;
    getColdStoreInsideDoorDetail: (storeId?: unknown) => Promise<unknown>;
    getColdStoreInsideTemperatureOverview: () => Promise<unknown>;
    getColdStoreRefrigerationHealthOverview: () => Promise<unknown>;
    getColdStoreRefrigerationUnitDetail: (unitCode?: unknown) => Promise<unknown>;
    getColdStoreRefrigerationEnergy: () => Promise<unknown>;
    getColdStoreLeakResponses: () => Promise<unknown>;
    getColdStoreLeakResponseDetail: (alarmId?: unknown) => Promise<unknown>;
    getColdStoreStatisticsPreview: () => Promise<unknown>;
};
export declare function createColdStorageClient(http: HttpClient): ColdStorageClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<ColdStorageClient>;
export {};
//# sourceMappingURL=client.d.ts.map