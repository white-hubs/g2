# 统一 HTTP 客户端范式为 @g2-platform/http；响应包裹协议下沉到服务 Client，不做全局假设

部分用语已被 ADR-0057 修正：下文「分域 client / `*.client.ts`」一律读作按 **服务面** 拆的 **服务 Client**（`@g2-client/<surface>`），**不是**嵌在 Domain/Platform UI 包内的模块。传输与解包职责划分（本 ADR）仍然成立。

g2 的 Platform（`pc-auth`/`pc-chrome`/`pc-messaging`/`pc-rtc`/`pc-ai-assistant`）与后续 Domain 统一走一套 `@g2-platform/http`（remote，理由与 ADR-0039 logger 相同——需要脱离消费者发版周期独立热修，不叫 `@g2-shared/http`）。旧仓两套并存范式都不直接照搬：新式 `@ghcloud/cube-gateway`（源码在 `standard/infrastructure/gateway`）本身很薄，唯一价值是错误归一化，重试/去重它也没做；它的成功响应处理反而把 `{code,data}` 解包散落到每个业务方法（`resp.data || resp`），比旧式 axios 拦截器集中处理还退步。旧式 axios 直连（`legacy/bimops-fe-web-migrate/src/utils/request.js`）的并发合并（`concurrentRestful`）机制目前没找到明确业务驱动证据，本轮不予保留。

业务代码不直连 `@g2-platform/http` 的底层实现，而是通过 **服务 Client** 调用（对齐并修正旧仓 `@ghcloud/cube-services-client` 的分层思路；所有权见 ADR-0057）。由于无法保证接入的各后端服务都一致包裹 `{code,data}` 或都不包裹，响应契约**不做全局统一假设**：解包差异下沉到每个服务 Client 的具体接口方法内部处理，业务调用方（Client 的消费者）拿到的永远是已经处理好的资源本体，不需要关心底层是否包裹、也不需要像旧仓那样在每个方法体手写解包判断逻辑扩散到调用方。

`@g2-platform/http` 内部用中间件管道（洋葱模型：鉴权注入、可选超时/重试/日志等横切逻辑逐层包裹原生 `fetch`）组织实现，不引入任何三方 HTTP 库（axios/ky/wretch 等），符合 ADR-0041 的依赖治理闭口原则——原生 `fetch`/`AbortController`/`Headers` 已经足够表达这些能力，三方库不提供本仓真正需要且原生做不到的东西。
