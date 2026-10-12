import type { PlatformModule } from "@g2-composition/contract";
/**
 * `@g2-platform/http` 是纯库型 Platform：其它 Platform 通过 `ctx.loadPlatform("httpPlatform", "client")`
 * 按需消费 `createHttpClientForPlatform`，本身没有 install 逻辑也不暴露 slot。补这个最小
 * PlatformModule（暴露为独立的 "./platform" MF 路径，与 "./client" 分开）是为了让 Task 7.3 的
 * `runPlatformInstalls`（对 Profile 里每个 platform 统一尝试 `loadRemote(name, "platform")`）
 * 能一致地处理它，不需要为它开特殊分支。
 */
export declare const platformModule: PlatformModule;
export default platformModule;
//# sourceMappingURL=platform-module.d.ts.map