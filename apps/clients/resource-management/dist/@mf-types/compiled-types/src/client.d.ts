import type { PlatformContext } from "@g2-composition/contract";
import type { ResourceManagementClient } from "@g2-contract/resource-management";
interface HttpClient {
    get(url: string, init?: RequestInit): Promise<unknown>;
    post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
    put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
    delete(url: string, init?: RequestInit): Promise<unknown>;
}
export declare function createResourceManagementClient(http: HttpClient): ResourceManagementClient;
export declare function create(ctx: PlatformContext): Promise<ResourceManagementClient>;
export type { ResourceManagementClient };
//# sourceMappingURL=client.d.ts.map