import type { PlatformContext } from "@g2-composition/contract";
import type { FormAuditClient } from "@g2-contract/form-audit";
interface HttpClient {
    get(url: string): Promise<unknown>;
    post(url: string, body?: unknown): Promise<unknown>;
    put(url: string, body?: unknown): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createFormAuditClient(http: HttpClient): FormAuditClient;
export declare function create(ctx: PlatformContext): Promise<FormAuditClient>;
export type { FormAuditClient };
//# sourceMappingURL=client.d.ts.map