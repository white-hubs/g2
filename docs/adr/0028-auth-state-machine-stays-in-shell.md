# 鉴权状态机与路由表留在门面，pc-auth 只提供可替换的页面内容与策略扩展点

`@g2-shell/pc` 自持 `/login`、`/verify-auth` 路由表、token 生命周期（写入/刷新/清除）与路由守卫；`@g2-platform/pc-auth` 只暴露可被门面动态引入的页面内容组件（登录表单、SSO 回调页 UI），不自带完整路由、不管理鉴权状态。这是鉴权场景的特例：一般 Domain 按「remote 自带 routes，门面挂载」的常规模式（见 ADR-0021 域契约）；Platform 的常规契约则是 `slots`/`install`（见 ADR-0030），本身就不拥有路由/导航权，pc-auth 在此基础上进一步收窄——不仅不自带路由，连页面内容之外的鉴权状态管理权也不下放。之所以强调这是特例，是因为哪怕未来 Platform 契约演进出「remote 自带入口」一类能力，鉴权状态机的管理权分散到 remote 仍会导致多实例/竞态问题，业界一致建议由 host 独占，不随 Platform 契约通用能力的扩展而改变。

pc-auth 内部通过「鉴权策略扩展点」解耦具体客制登录变体（CAS 回调、按字典开关触发的静默三方免登等）：核心只含 token 生命周期与标准 `/login`，具体策略在 Composition Profile 里按部署声明启用，新增策略不需要改 pc-auth 源码。
