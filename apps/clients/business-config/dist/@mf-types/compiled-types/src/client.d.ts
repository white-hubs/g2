import type * as CompositionContract from "@g2-composition/contract";
import type { BusinessConfigClient } from "@g2-contract/business-config";
export interface HttpClient {
    get(url: string, init?: RequestInit): Promise<unknown>;
    post(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
    put(url: string, body?: unknown, init?: RequestInit): Promise<unknown>;
    delete(url: string, init?: RequestInit): Promise<unknown>;
}
export declare function createBusinessConfigClient(http: HttpClient, tenantCode?: string): BusinessConfigClient;
export declare function create(ctx: CompositionContract.PlatformContext): Promise<BusinessConfigClient>;
export type { BusinessConfigClient };
//# sourceMappingURL=client.d.ts.map