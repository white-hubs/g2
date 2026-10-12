import type { PlatformContext } from "@g2-composition/contract";
import type { FumigationOperationClient } from "@g2-contract/fumigation-operation";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export declare function createFumigationOperationClient(http: HttpClient): FumigationOperationClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<FumigationOperationClient>;
export type { FumigationOperationClient };
//# sourceMappingURL=client.d.ts.map