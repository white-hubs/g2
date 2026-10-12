import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type AccessControlClient = {
    getEnterpriseDirectory: (params?: unknown) => Promise<unknown>;
    getDoorRanking: (params?: unknown) => Promise<unknown>;
    getDoorEvents: (params?: unknown) => Promise<unknown>;
    passedTodayNum: (params?: unknown) => Promise<unknown>;
    getDoorTend: (params?: unknown) => Promise<unknown>;
    generDeviceIsWord: (params?: unknown) => Promise<unknown>;
    controlDoorverify: (params?: unknown) => Promise<unknown>;
    generDevice: (params?: unknown) => Promise<unknown>;
    getDoorType: (params?: unknown) => Promise<unknown>;
    addDoorDevices: (params?: unknown) => Promise<unknown>;
    getDoorDevicePage: (params?: unknown) => Promise<unknown>;
    removeDoorDevice: (params?: unknown) => Promise<unknown>;
    removeDoorDeviceBatch: (params?: unknown) => Promise<unknown>;
    controlDoor: (params?: unknown) => Promise<unknown>;
    getDoorEventRecord: (params?: unknown) => Promise<unknown>;
    getToDayEventTrend: (params?: unknown) => Promise<unknown>;
    getAbnormalEvent: (params?: unknown) => Promise<unknown>;
    inspectgetStatus: (params?: unknown) => Promise<unknown>;
    getDeviceProduct: (params?: unknown) => Promise<unknown>;
    getDeviceList: (params?: unknown) => Promise<unknown>;
    getProductAll: (params?: unknown) => Promise<unknown>;
};
export declare function createAccessControlClient(http: HttpClient): AccessControlClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<AccessControlClient>;
export {};
//# sourceMappingURL=client.d.ts.map