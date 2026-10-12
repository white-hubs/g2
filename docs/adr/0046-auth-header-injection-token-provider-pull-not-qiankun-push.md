# 鉴权头注入改为 Token Provider 拉模型，替代旧仓 qiankun props 推送

旧仓新式 `@ghcloud/cube-gateway` 配套的鉴权注入（`@ghcloud/cube-services-client` 的 `CubeAuthRequest`）显式耦合 qiankun 生命周期：鉴权快照靠 qiankun 主应用通过 `props.auth` 在 mount/update 时一次性推入子应用，子应用调 `updateAuth()` 存到实例字段；脱离 qiankun 运行时（`authStore` 从未被赋值）直接抛 `Login state is not ready!`，源码注释里明确写着这只是 dev 兜底，不能覆盖生产链路。g2 的 MF Platform/Domain 契约（ADR-0021/0030）没有等价的 qiankun props 通道，也不应该为 http 客户端专门发明一个推送通道——ADR-0031 的临时 qiankun 兼容桥确实还在传 `auth` 字段，但那服务的是尚未迁移、仍走 qiankun 的旧业务微应用，不是 g2 新建的 MF Platform/Domain。

改为 Token Provider 模式：Shell 在 `install(app, router, ctx)` 时给 Platform/Domain 注入一个 `getAuthHeaders()` 访问器（函数，不是一次性快照值），`@g2-platform/http` 每次发请求前调用它取最新鉴权头，不缓存到实例字段。这是"拉"模型（对应 AWS SDK Credential Provider Chain、Firebase `getIdToken()` 一类的行业惯例），比旧仓两套范式都更彻底：旧式 axios 也是拉模型，但拉的是一个全局单例（`CubeMfRootGlobalState`），耦合了 mf-root；新式 `CubeGateway` 是推模型，耦合了 qiankun props。Token Provider 拉的是 Shell 主动注入的一个纯函数，不耦合任何具体运行时（qiankun/MF/inline 都能用同一签名）。token 生命周期（写入/刷新/清除）与鉴权状态机仍完全留在 Shell 内部，不违反 ADR-0028；Platform/Domain 只拿到一个只读访问动作，不感知状态机内部数据结构。

`Authorization`/`tenant`/`terminal` 三个请求头的字面语义保持与旧仓一致（`CubeHeaders` 枚举命名不变），本轮不改后端契约，`getAuthHeaders()` 内部只做数据搬运，不做语义翻译。
