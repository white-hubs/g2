import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type ProcessEngineClient = {
    getPermissionFormFlowGroupCount: (params?: unknown) => Promise<unknown>;
    getFormFlowGroupCount: (params?: unknown) => Promise<unknown>;
    updateFormFlowGroup: (params?: unknown) => Promise<unknown>;
    deleteFormFlowGroup: (id?: unknown) => Promise<unknown>;
    getFormFlowPageList: (params?: unknown) => Promise<unknown>;
    updateFormFlowEnable: (params?: unknown) => Promise<unknown>;
    deleteFormFlow: (id?: unknown) => Promise<unknown>;
    getFlowProcessPage: (params?: unknown) => Promise<unknown>;
    getWorkOrderList: (params?: unknown) => Promise<unknown>;
    exportWorkOrderList: (params?: unknown) => Promise<unknown>;
    getWorkOrderStatisticsList: (params?: unknown) => Promise<unknown>;
    exportWorkOrderStatisticsList: (params?: unknown) => Promise<unknown>;
    getFlowBusinessNodeNames: (params?: unknown) => Promise<unknown>;
    getFormFlowGroupList: (_params?: unknown) => Promise<unknown>;
    getWorkOrderBusinessTypeList: (_params?: unknown) => Promise<unknown>;
    getUserFlowNumber: (params?: unknown) => Promise<unknown>;
};
export declare function createProcessEngineClient(http: HttpClient): ProcessEngineClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<ProcessEngineClient>;
export {};
//# sourceMappingURL=client.d.ts.map