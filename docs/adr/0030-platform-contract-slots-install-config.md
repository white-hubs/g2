# Platform 契约新增 slots + install + Profile config，与 Domain 的 routes + install 对称

`@g2-composition/contract` 目前只有 Domain 侧契约（`routes` 必选、`install` 可选，见 ADR-0021），Platform 至今没有正式契约——运行时只是 ad-hoc 调用 `getPlatformLabel`/`platformInfo`。为支撑 bimops 宿主拆分出的 `pc-auth`/`pc-chrome`/`pc-messaging`/`pc-rtc`（ADR-0027），Platform 侧新增：

- `slots?: Record<string, Component>` —— 具名槛位内容（如 `auth.login`、`auth.verifyAuth`、`chrome.topBar`），门面把这些内容挂进自己已经定义好的挖洞位；Platform 不因此拥有路由/导航权，这点与 Domain 的 `routes`（自带入口）明确区分。
- `install?: (app: App, router: Router, ctx: PlatformContext) => void | Promise<void>` —— 全局副作用挂载（订阅消息总线、挂全局浮层），`pc-messaging`/`pc-rtc` 用这个而不是 slots。
- Composition Profile 的 platform 条目新增可选 `config: Record<string, unknown>`，运行时透传给该 Platform 的 `install`/slot 工厂，用于声明式开启具体能力（如 pc-auth 该部署启用哪些鉴权策略），避免把部署差异写死进 Platform 源码。

`label` 字段取代原来 ad-hoc 的 `getPlatformLabel`/`platformInfo` 双轨约定，统一走 slots 之外的一个具名可选字段。

`PlatformContext` 里包含 `bus`（事件总线实例）：总线本体由 Shell 实例化并持有，不归 `pc-messaging` 或 `pc-rtc` 任何一方所有——二者都只是总线上的消费者/发布者（`pc-messaging` 挂通用通知与登出/重载回调，`pc-rtc` 挂通话与报警 handler）。总线不进 ADR-0018 的 MF shared 单例白名单，走 `install` 参数按需注入即可，避免扩大 shared 白名单的变更成本。
