import type { AuthClient } from "@g2-contract/auth";
import type { HttpClient } from "@g2-platform/http/client";
import type { AuthStrategy } from "../auth-strategy";
export declare function createCasSsoStrategy(deps: {
    auth: Pick<AuthClient, "exchangeToken">;
    http: Pick<HttpClient, "get">;
}): AuthStrategy;
//# sourceMappingURL=cas-sso.d.ts.map