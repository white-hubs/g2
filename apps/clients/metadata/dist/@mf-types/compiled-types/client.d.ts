import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type MetadataClient = {
    listAllArea: () => Promise<unknown>;
};
export declare function createMetadataClient(http: HttpClient): MetadataClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<MetadataClient>;
export {};
//# sourceMappingURL=client.d.ts.map