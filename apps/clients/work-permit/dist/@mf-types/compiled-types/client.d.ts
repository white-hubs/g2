import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type WorkPermitClient = {
    listWorkPermitTypes: (params?: unknown) => Promise<unknown>;
    getWorkPermitTypeDetail: (id?: unknown) => Promise<unknown>;
    createWorkPermitType: (payload?: unknown) => Promise<unknown>;
    updateWorkPermitType: (id?: unknown, payload?: unknown) => Promise<unknown>;
    deleteWorkPermitType: (id?: unknown) => Promise<unknown>;
    listWorkPermitLevels: (params?: unknown) => Promise<unknown>;
    exportWorkPermitTypes: (params?: unknown) => Promise<unknown>;
    recognizeWorkPermitAssociatedItemByAi: (payload?: unknown) => Promise<unknown>;
};
export declare function createWorkPermitClient(http: HttpClient): WorkPermitClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<WorkPermitClient>;
export {};
//# sourceMappingURL=client.d.ts.map