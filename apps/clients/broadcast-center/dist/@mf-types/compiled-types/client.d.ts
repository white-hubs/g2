import type { PlatformContext } from "@g2-composition/contract";
import type { BroadcastCenterClient } from "@g2-contract/broadcast-center";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type { BroadcastCenterClient };
export declare function createBroadcastCenterClient(http: HttpClient): BroadcastCenterClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<BroadcastCenterClient>;
//# sourceMappingURL=client.d.ts.map