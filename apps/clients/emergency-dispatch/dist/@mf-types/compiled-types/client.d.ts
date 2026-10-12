import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type EmergencyDispatchClient = {
    pageResourceRefs: (query?: unknown) => Promise<unknown>;
    listResourceRefs: (query?: unknown) => Promise<unknown>;
    createResourceRef: (payload?: unknown) => Promise<unknown>;
    deleteResourceRef: (id?: unknown) => Promise<unknown>;
    getResourceRefStatistics: () => Promise<unknown>;
    getAreaTree: () => Promise<unknown>;
    pageResourceCandidates: (query?: unknown) => Promise<unknown>;
    createAreaPlaneMap: (payload?: unknown) => Promise<unknown>;
    updateAreaPlaneMap: (id?: unknown, payload?: unknown) => Promise<unknown>;
    deleteAreaPlaneMap: (id?: unknown) => Promise<unknown>;
    listAreaPlaneMapsByAreaId: (areaId?: unknown) => Promise<unknown>;
    pageEvacuationRoutes: (query?: unknown) => Promise<unknown>;
    createEvacuationRoute: (payload?: unknown) => Promise<unknown>;
    updateEvacuationRoute: (id?: unknown, payload?: unknown) => Promise<unknown>;
    deleteEvacuationRoute: (id?: unknown) => Promise<unknown>;
    updateEvacuationRouteDevices: (id?: unknown, payload?: unknown) => Promise<unknown>;
};
export declare function createEmergencyDispatchClient(http: HttpClient): EmergencyDispatchClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<EmergencyDispatchClient>;
export {};
//# sourceMappingURL=client.d.ts.map