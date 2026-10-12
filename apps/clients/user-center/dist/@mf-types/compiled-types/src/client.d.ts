import type { PlatformContext } from "@g2-composition/contract";
import type { UserCenterClient } from "@g2-contract/user-center";
interface HttpClient {
    get(url: string): Promise<unknown>;
    delete(url: string): Promise<unknown>;
}
export declare function createUserCenterClient(http: HttpClient): UserCenterClient;
export declare function create(ctx: PlatformContext): Promise<UserCenterClient>;
export type { UserCenterClient };
//# sourceMappingURL=client.d.ts.map