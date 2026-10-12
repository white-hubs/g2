import type { PlatformContext } from "@g2-composition/contract";
import type { RiskManagementClient } from "@g2-contract/risk-management";
interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
/** 接口逐条对齐旧仓 cube-risk-management-service：业务面保持 /api，不改写为 /gw-bff。 */
export declare function createRiskManagementClient(http: HttpClient): RiskManagementClient;
export declare function create(ctx: PlatformContext): Promise<RiskManagementClient>;
export type { RiskManagementClient };
//# sourceMappingURL=client.d.ts.map