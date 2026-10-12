import type { PlatformContext } from "@g2-composition/contract";
import type { MdataClient } from "@g2-contract/mdata";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
}
export declare function createMdataClient(http: HttpClient): MdataClient;
export declare function create(ctx: PlatformContext): Promise<MdataClient>;
export type { MdataClient };
//# sourceMappingURL=client.d.ts.map