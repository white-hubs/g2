import type { PlatformContext } from "@g2-composition/contract";
import type { LineLossManagementClient } from "@g2-contract/line-loss-management";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
}
export declare function createLineLossManagementClient(http: HttpClient): LineLossManagementClient;
export declare function create(ctx: PlatformContext): Promise<LineLossManagementClient>;
export type { LineLossManagementClient } from "@g2-contract/line-loss-management";
//# sourceMappingURL=client.d.ts.map