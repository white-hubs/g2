# main 合并新增消费者 Runtime Common 整改计划

## 目标与状态（2026-09-30）

针对 2026-09-29 合并的 `origin/main`（`78acf71`）以及全量生产消费者扫描中发现的 Runtime Common 静态依赖缺口，按 [`docs/runtime-common-migration-standard.md`](../runtime-common-migration-standard.md) 完成代码整改、矩阵登记和静态验收。

**静态整改：完成。生产构建及产物检查：通过。Shell / Runtime Common 浏览器启动链：通过。登录态业务页验收：尚未完成。生产环境验收/部署：未执行。**

## 整改范围

本次整改覆盖以下领域消费者：`complaint`、`daily-inspection`、`electrical-safety`、`electronic-patrol`、`fault-repair`、`form-audit`、`fumigation-operation`、`hazard-governance`、`knowledge-document`、`line-loss-management`、`log-management`、`maintenance`、`outsource-repair`、`problems`、`renovation`、`resource-management`、`risk-graded-control`、`safety-credit`、`safety-personnel-management`、`security-opinion-monitoring`、`stream-engine`、`technical-bulletin`、`user-center`、`warehouse-safety`、`work-order-center`；并整改 `stream-engine` page library。

整改包含：把运行时 provider 导入改为 Shell 管理的 Runtime Common 加载/失败关闭代理；移除消费者 Federation `shared` 中的公共实现 fallback；把运行时依赖改为构建期依赖；在领域安装前按需加载 Runtime Common；补齐 provider 矩阵及领域安装顺序测试。保留仅用于类型检查的 type-only imports。

## 验收证据

- `bun run check:runtime-common -- --profile`：通过；生产矩阵覆盖 **45 个 remotes、2 个 page libraries、17 个 Core Runtime providers**，无矩阵、源码静态导入、运行依赖或 release-set 不一致诊断。
- `bun run check:runtime-common -- --changed-from=e7c7fef`：通过，变更消费者门禁通过。
- `bun run check:deps`：通过，依赖治理白名单检查通过。
- `bun run --filter @g2-tooling/runtime-common-check test`：9/9 通过；领域与 Runtime Common checker 测试均通过。
- 最后一批 8 个整改消费者（`maintenance`、`daily-inspection`、`hazard-governance`、`risk-graded-control`、`warehouse-safety`、`line-loss-management`、`electrical-safety`、`fumigation-operation`）的 typecheck、测试、生产构建及 Runtime Common 产物 fallback 扫描均通过；领域测试合计 86 项通过。
- 对 130 个改动 TS/JS 文件执行定向 Oxlint：0 个 Error；仍有风格 warnings。全仓 `bun run lint` 返回失败，包含大量仓库级 lint 诊断，未将全仓 lint 宣称为通过。
- `bun install --ignore-scripts` 完成，锁文件依赖解析成功；`git diff --check` 通过。

## 浏览器验收现状与阻塞

已实际访问用户原有 `http://localhost:5100/d/security-monitor/alarmRecord`：旧 Shell 页面仍显示 Vite 无法解析 `@module-federation/enhanced/runtime`。该包在 Shell 中有依赖声明、Node/Bun 可以解析，且 Shell 生产构建成功；此异常只存在于用户原有 dev server，尚未重启验证。

为不打断 `5100/3031` 原进程，另启本地验收 Shell `5101` 并启动 profile 所需的 17 个 Runtime Common providers 与 `authClient`。实际访问目标路由后，Shell 完成 bootstrap 并重定向到 `/login`，登录表单正常渲染；无 `composeFromProfile` 超时，Vite 服务日志未出现相关加载错误，证明 Runtime Common 浏览器启动链通过。仓库 `dev:full` 编排器仍在 180 秒阶段窗口超时（等待 `pcChrome:5011`、`loggerPlatform:5017`），但这两个 Vite 服务及其余 providers 后续逐个直接启动均成功。

目标业务 remote `securityMonitor` 已注册至验收 Shell（本地 manifest `5068`），`securityMonitorClient` 本地入口 `5065` 已启动。登录态业务页还未验收：浏览器在 `5101` 显示登录表单，而原登录态属于 `5100` origin，浏览器存储不跨端口共享。需要在 `5101` 重新登录后再访问目标业务路由。此前再次读取页面时，浏览器自动审查拒绝了对 `localhost:5101` 的后续访问（审批等待超时）；未尝试绕过或换通道读取，等待用户登录并明确允许重试。Console/Network 面板细项也尚未核对。生产验收仍需实际发布后单独执行。

## 完成边界

本计划中的源码整改、静态规则、矩阵/发布集合对齐、目标领域构建验收及 Shell/Runtime Common 浏览器启动链已完成。未完成项是登录后的业务页面验收、Console/Network 核对和未来生产环境验收；不得将它们与已通过的静态整改混为一谈。
