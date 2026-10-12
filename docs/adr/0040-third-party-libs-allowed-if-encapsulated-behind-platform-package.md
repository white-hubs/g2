# 「非必要不依赖三方库」重读为「三方库须封装在平台包背后，不得泄露到消费方接口」

`@g2-platform/logger` 内部允许真实引入 OpenTelemetry 相关 SDK（trace 与 log 均可），用它实现 span/context 传播与日志字段模型；但这些依赖完全封装在 logger 包内部，shell/platform/domain 等消费方只拿到 `logger.debug/info/warn/error(message, context)` 这套自建接口，不会也不需要直接 `import '@opentelemetry/api'`。

这把贯穿本仓库的「平台统一工具库第一原则」（ADR-0001 起、pc-auth 日期工具封装等场景反复出现）精确化：原则约束的是**消费方的直接依赖面**，不是「整个技术栈里出现三方库的总次数」——三方库允许存在，但必须收敛在某个 `@g2-shared/*` 或 `@g2-platform/*` 包内部作为实现细节，对外只暴露自建接口。这避免了把原则读成「能力上有个三方库更成熟的实现也要拒绝」，同时保住了原则真正要防的东西：消费方各自直接依赖不同版本/不同三方库，导致收敛失效。
