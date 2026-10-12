import type { PlatformContext } from "@g2-composition/contract";
import type { EmergencyManagementClient } from "@g2-contract/emergency-management";
interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createEmergencyManagementClient(http: HttpClient): EmergencyManagementClient;
export declare function create(ctx: PlatformContext): Promise<EmergencyManagementClient>;
export {};
//# sourceMappingURL=client.d.ts.map