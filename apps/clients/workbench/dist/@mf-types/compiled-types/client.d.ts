import type { PlatformContext } from "@g2-composition/contract";
import type { WorkbenchClient } from "@g2-contract/workbench";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export declare function createWorkbenchClient(http: HttpClient): WorkbenchClient;
/** MF `./client` 入口 */
export declare function create(ctx: PlatformContext): Promise<WorkbenchClient>;
export type { WorkbenchClient };
//# sourceMappingURL=client.d.ts.map