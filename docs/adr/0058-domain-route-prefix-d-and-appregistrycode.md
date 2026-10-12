# 域路由前缀 `/d/{appRegistryCode}` 与跨域 navigate-intent

## 状态

Accepted

## 上下文

旧仓门户子应用多用 `/portal/{name}`（qiankun）。新仓弃用 `/portal` 作为 MF 域挂载前缀，避免与过渡期 qiankun 桥抢路径，并给域自管子路由（含可选 `/:appCode`）留出空间。

## 决策

1. **挂载前缀：** 所有 MF Domain 的 Profile `basePath` 形如 `/d/{appRegistryCode}`。`/d` 为全站统一前缀；**禁止** MF 域再用 `/portal`。
2. **`appRegistryCode`：** 稳定 kebab 域名（如 `access-control`），标识「挂哪一套域入口」。与旧仓 OUAA「应用」数据码脱钩时，数据分区优先由域自管动态段（如 `/:appCode`）表达；Profile `config` 可用于单实例默认码。
3. **壳职责：** 只按 `basePath` 前缀匹配加载 remote；**不**解释第二段以后的参数。
4. **跨域跳转：** 经 `navigate-intent`，载荷 `{ code, params?: { appCode?, entry?, … } }`。壳用 MF 域索引（`code` / `appRegistryCode` → `basePath`）解析；`entry` / `appCode` 拼到 basePath 之后。调用方**禁止**把完整 path 当契约。
5. **菜单：** 默认属域 `menuContribution`（ADR-0036）；可选无 path 的菜单 overlay 与页面库挂载见 **ADR-0059**；登录平铺 functionCode。

**后续变更（ADR-0059）**：跨应用跳转**目标态不再支持 path 载荷**；`path` 仅迁移期兼容旧调用方，新代码与页面库不得再发。应用域内子页主键为 `entry`；页面库内跳转用 `pageKey` 事件，由宿主域译成 entry / intent。共享业务页不默认占用独立 `appRegistryCode` 公共 URL。

## 后果

- access-control 本波 path：`/d/access-control`、`/devices`、`/logs`、`/events`。
- 已迁域须从运行时 qiankun `microApps` 剔除（见 `filterMigratedQiankunApps`），避免双轨。
- 壳 `navigate-intent` 实现须逐步去掉对 `path` 的依赖（见 ADR-0059）。
