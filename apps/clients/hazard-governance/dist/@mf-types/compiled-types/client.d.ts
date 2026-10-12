import type { PlatformContext } from "@g2-composition/contract";
import type { HazardGovernanceGateway } from "@g2-contract/hazard-governance";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type HazardGovernanceClient = HazardGovernanceGateway;
export declare function createHazardGovernanceClient(http: HttpClient): HazardGovernanceClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<HazardGovernanceClient>;
export {};
//# sourceMappingURL=client.d.ts.map