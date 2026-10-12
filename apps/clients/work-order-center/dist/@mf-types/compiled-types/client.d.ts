import type * as CompositionContract from "@g2-composition/contract";
import type { WorkOrderCenterClient } from "@g2-contract/work-order-center";
interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createWorkOrderCenterClient(http: HttpClient): WorkOrderCenterClient;
export declare function create(ctx: CompositionContract.PlatformContext): Promise<WorkOrderCenterClient>;
export type { WorkOrderCenterClient };
//# sourceMappingURL=client.d.ts.map