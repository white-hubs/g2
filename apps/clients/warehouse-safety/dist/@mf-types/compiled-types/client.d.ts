import type { PlatformContext } from "@g2-composition/contract";
import type { WarehouseSafetyGateway } from "@g2-contract/warehouse-safety";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type WarehouseSafetyClient = WarehouseSafetyGateway;
export declare function createWarehouseSafetyClient(http: HttpClient): WarehouseSafetyClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<WarehouseSafetyClient>;
export {};
//# sourceMappingURL=client.d.ts.map