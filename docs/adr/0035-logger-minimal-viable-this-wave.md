# 本轮先落地最小可用 Logger，可观测性基建整体另立专项

`@ghcloud/logger` 用量目前只在 pc-auth 的登录报错路径（`logger.error(error)`），且它本身只是纯 console 封装，无远程上报能力。本轮不重建完整可观测性体系（结构化日志、线上动态调日志级别、链路追踪），那是一个独立量级的专项，见配套 handoff 文档。

本轮只落地一个**最小可用、且不堵future路**的 `@g2-shared/logger`：

- 调用签名从一开始就是 `logger.error(message, context?)` 这种「消息 + 结构化上下文对象」的形状，不是 `logger.error(...args)` 变长参数拼接——现在 context 只是简单打印，但接口形状不用未来重新设计。
- 级别集合 `debug/info/warn/error`，不带旧版那个已经是空函数、语义不明的 `fault`。
- 日期格式化不允许 pc-auth 自己直接 `import dayjs`；统一走 `@g2-shared/*` 里已有/待建的日期工具封装，遵守「非必要不独立依赖三方库」的平台原则（该原则本身也在可观测性专项 handoff 里进一步展开到其他基础设施）。
- 不做远程上报、不做动态级别、不做 trace-id 关联——这三项是可观测性专项的核心内容，本轮明确不做，避免半成品。
