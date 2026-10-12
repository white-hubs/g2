import type { PlatformContext } from "@g2-composition/contract";
import type { AuthClient, AuthTokenRequest } from "@g2-contract/auth";
interface HttpClient {
    post: (url: string, body?: unknown) => Promise<unknown>;
}
export declare function createAuthClient(http: HttpClient): AuthClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057 H1/X1）。 */
export declare function create(ctx: PlatformContext): Promise<AuthClient>;
export type { AuthClient, AuthTokenRequest };
//# sourceMappingURL=client.d.ts.map