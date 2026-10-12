import type { PlatformContext } from "@g2-composition/contract";
import type { MessageClient, MessageListParams } from "@g2-contract/message";
/** 运行时经 `ctx.loadPlatform("httpPlatform", "client")` 取得；不静态打进本 remote。 */
interface HttpClient {
    post: (url: string, body?: unknown) => Promise<unknown>;
    get: (url: string) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
}
export declare function createMessageClient(http: HttpClient): MessageClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057 H1/X1）。 */
export declare function create(ctx: PlatformContext): Promise<MessageClient>;
export type { MessageClient, MessageListParams };
//# sourceMappingURL=client.d.ts.map