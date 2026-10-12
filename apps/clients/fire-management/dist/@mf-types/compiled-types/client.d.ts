import type { PlatformContext } from "@g2-composition/contract";
import type { FireManagementClient as ContractClient } from "@g2-contract/fire-management";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    patch: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type FireManagementClient = ContractClient & Record<string, (...args: any[]) => Promise<any>>;
export declare function createFireManagementClient(http: HttpClient): FireManagementClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<FireManagementClient>;
export {};
//# sourceMappingURL=client.d.ts.map