/**
 * `HttpClientModule` 的唯一定义在 `@g2-platform/http/client`（`createHttpClientForPlatform` 本身
 * 定义的地方）——这里只是一个薄的 re-export，让本包内已有的 `import { HttpClientModule } from
 * "../http-client-module"`/`"./http-client-module"` 写法不用大改。此前这里是一份独立手写的重复
 * 定义（与 `apps/shells/pc/src/main.ts` 里另一份内联接口完全同构但各自维护，审计已指出这个重复
 * 风险），现在统一收口到唯一来源，`import type` 编译期擦除，不产生新的运行时依赖。
 */
export type { HttpClientModule } from "@g2-platform/http/client";
//# sourceMappingURL=http-client-module.d.ts.map