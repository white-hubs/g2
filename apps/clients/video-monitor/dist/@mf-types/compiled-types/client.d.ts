import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type VideoMonitorClient = {
    createCameraAuth: (params?: unknown) => Promise<unknown>;
    updateCameraAuth: (id?: unknown, params?: unknown) => Promise<unknown>;
    deleteCameraAuth: (id?: unknown) => Promise<unknown>;
    getCameraAuth: (id?: unknown) => Promise<unknown>;
    listAuthGroup: (params?: unknown) => Promise<unknown>;
    listVideoMonitorGroup: (params?: unknown) => Promise<unknown>;
    listVideoMonitorDeviceOfRule: (params?: unknown) => Promise<unknown>;
    listVideoMonitorDevice: (params?: unknown) => Promise<unknown>;
    queryVideoMonitorDeviceByAreaOrGroupAndTag: (params?: unknown, _arg?: unknown) => Promise<unknown>;
    listAiInspectionCameraOptions: (params?: unknown) => Promise<unknown>;
    getAiInspectionCameraOptionsByIds: (params?: unknown) => Promise<unknown>;
    listAiInspectionAlgorithms: () => Promise<unknown>;
    listAiInspectionPlans: (params?: unknown) => Promise<unknown>;
    getAiInspectionPlan: (id?: unknown) => Promise<unknown>;
    pageAiInspectionPlanCameras: (id?: unknown, params?: unknown) => Promise<unknown>;
    listAiInspectionPlanActionRules: (id?: unknown, params?: unknown) => Promise<unknown>;
    createAiInspectionPlan: (params?: unknown) => Promise<unknown>;
    patchAiInspectionPlan: (id?: unknown, params?: unknown) => Promise<unknown>;
    updateAiInspectionPlanEnabled: (id?: unknown, enabled?: unknown) => Promise<unknown>;
    deleteAiInspectionPlan: (id?: unknown) => Promise<unknown>;
    runAiInspectionPlanOnce: (id?: unknown) => Promise<unknown>;
    listAiInspectionTasks: (params?: unknown) => Promise<unknown>;
    getAiInspectionTask: (id?: unknown) => Promise<unknown>;
    listAiInspectionEvents: (params?: unknown) => Promise<unknown>;
    getAiInspectionEvent: (id?: unknown) => Promise<unknown>;
    ignoreAiInspectionEvent: (id?: unknown, params?: unknown) => Promise<unknown>;
    generateAiInspectionEventAction: (id?: unknown, params?: unknown) => Promise<unknown>;
    listAiInspectionEmergencyRules: (params?: unknown) => Promise<unknown>;
    listAiInspectionWorkOrderTemplates: (params?: unknown) => Promise<unknown>;
    getAiInspectionWorkOrderTemplate: (id?: unknown) => Promise<unknown>;
};
export declare function createVideoMonitorClient(http: HttpClient): VideoMonitorClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<VideoMonitorClient>;
export {};
//# sourceMappingURL=client.d.ts.map