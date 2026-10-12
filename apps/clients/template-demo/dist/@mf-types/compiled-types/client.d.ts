import type { PlatformContext } from "@g2-composition/contract";
interface HttpClient {
    get: (url: string) => Promise<unknown>;
    post: (url: string, body?: unknown) => Promise<unknown>;
    put: (url: string, body?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
}
export type TemplateDemoClient = {
    listTemplateDemo: (params?: unknown) => Promise<unknown>;
    getTemplateDemoDetail: (id?: unknown) => Promise<unknown>;
    createTemplateDemo: (params?: unknown) => Promise<unknown>;
    updateTemplateDemo: (params?: unknown) => Promise<unknown>;
    deleteTemplateDemo: (id?: unknown) => Promise<unknown>;
};
export declare function createTemplateDemoClient(http: HttpClient): TemplateDemoClient;
/** MF `./client` 入口：自持 http 编排（ADR-0057）。 */
export declare function create(ctx: PlatformContext): Promise<TemplateDemoClient>;
export {};
//# sourceMappingURL=client.d.ts.map