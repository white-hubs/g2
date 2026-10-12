import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type InspectionAiClient = {
    analyzeInspectionImage: (params?: unknown) => Promise<unknown>;
};
export declare function createInspectionAiClient(http: HttpClient): InspectionAiClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<InspectionAiClient>;
export {};
//# sourceMappingURL=client.d.ts.map