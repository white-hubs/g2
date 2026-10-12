import type { PlatformContext } from "@g2-composition/contract";
import type { OuaaClient, OuaaJsonBody } from "@g2-contract/ouaa";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
}
export declare function createOuaaClient(http: HttpClient): OuaaClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057 H1/X1）。 */
export declare function create(ctx: PlatformContext): Promise<OuaaClient>;
export type { OuaaClient, OuaaJsonBody };
//# sourceMappingURL=client.d.ts.map