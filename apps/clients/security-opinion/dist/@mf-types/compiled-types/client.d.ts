import type { PlatformContext } from "@g2-composition/contract";
import type { SecurityOpinionGateway } from "@g2-contract/security-opinion";
export interface HttpClient {
    get: <T>(url: string) => Promise<T>;
    post: <T>(url: string, body?: unknown) => Promise<T>;
    put: <T>(url: string, body?: unknown) => Promise<T>;
    delete: <T>(url: string) => Promise<T>;
}
export type SecurityOpinionClient = SecurityOpinionGateway;
export declare function createSecurityOpinionClient(http: HttpClient): SecurityOpinionClient;
export declare function create(ctx: PlatformContext): Promise<SecurityOpinionClient>;
//# sourceMappingURL=client.d.ts.map