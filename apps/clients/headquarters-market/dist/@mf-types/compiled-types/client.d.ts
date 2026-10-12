import type { PlatformContext } from "@g2-composition/contract";
import type { HeadquartersMarketClient, HeadquartersMarketConfig } from "@g2-contract/headquarters-market";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export declare function createHeadquartersMarketClient(http: HttpClient): HeadquartersMarketClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<HeadquartersMarketClient>;
export type { HeadquartersMarketClient, HeadquartersMarketConfig };
//# sourceMappingURL=client.d.ts.map