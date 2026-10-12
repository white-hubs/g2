import type { PlatformContext } from "@g2-composition/contract";
import type { FileClient } from "@g2-contract/file";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
}
export declare function createFileClient(http: HttpClient): FileClient;
export declare function create(ctx: PlatformContext): Promise<FileClient>;
export type { FileClient };
//# sourceMappingURL=client.d.ts.map