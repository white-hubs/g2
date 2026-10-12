# G2 Production Runtime Common 消费矩阵（阶段 D 初版）

> 日期：2026-09-24  
> 成员清单来源：`deploy/compositions/prod.pc.yaml`；发布包路径以 `deploy/release-sets/prod.yaml` 为准；依赖边由机器可读的 `deploy/runtime-common-dependencies.prod.json` 维护。本文用于解释当前盘点结果，不替代这些清单。

## 口径

- 下表记录生产 Remote / 页面库源码中显式的 `loadPlatform`、`loadRuntimeCommon` 调用及静态平台名列表。
- `pcUi` 等平台初始化依赖和异步加载的具体组件依赖都算消费者依赖；它们不一定表示该领域当前页面实际渲染了该能力。
- `—` 表示源码没有显式 Runtime Common 加载调用；产物审计需另外确认 Federation shared 与运行时注入，不能据此推断“完全无依赖”。
- Clients 单列为 HTTP 传输基础设施消费者；它们仍是独立契约 Remote，不因此变成 UI 公共模块消费者。

## 生产 Remotes 与页面库

| Production 成员 | Core Runtime 依赖（源码显式加载） |
|---|---|
| `commandDispatch` | `pcUi`, `pcMap`, `resourcePlatform` |
| `secureEduHead`（包 `@g2-domain/secure-edu`） | `pcUi`, `pcChart` |
| `accessControl` | `pcUi`, `pcChart`, `pcPlayer`, `pcScada`, `pcMap`, `pcIotSocket`, `pcAlarmCharts`, `pcGraphEditor`, `pcVisualSdk` |
| `intruderAlarm` | `pcUi`, `pcChart`, `pcPlayer` |
| `gasManagement` | `pcUi`, `pcChart`, `pcPlayer` |
| `riskManagement` | `pcUi` |
| `dailyTask` | `pcUi` |
| `securityMonitor` | `pcUi`, `pcChart`, `pcPlayer`, `pcScada`, `pcMap`, `pcIotSocket`, `pcAlarmCharts`, `pcGraphEditor`, `pcVisualSdk` |
| `safetyManagementHead` | `pcUi` |
| `safetyManagement` | `pcUi` |
| `rotatingManagement` | `pcUi`, `pcChart`, `pcPlayer`, `pcScada`, `pcMap`, `pcIotSocket`, `pcAlarmCharts`, `pcGraphEditor`, `pcVisualSdk` |
| `fireManagement` | `pcUi`, `pcPlayer` |
| `emergencyManagement` | `pcUi` |
| `emergencyDispatch` | `pcUi`, `pcMap`, `pcPlayer` |
| `emergencySupplies` | `pcUi`, `pcMap` |
| `hazardGovernance` | `pcUi` |
| `riskGradedControl` | `pcUi`, `pcMap` |
| `warehouseSafety` | `pcUi`, `pcChart`, `pcPlayer`, `pcMap`, `pcIotSocket`, `pcAlarmCharts`, `pcScada`, `pcGraphEditor`, `pcVisualSdk` |
| `dailyInspection` | `pcUi` |
| `safetyDuty` | `pcUi` |
| `energyConsumption` | `pcUi`, `pcChart`, `pcPlayer` |
| `workbench` | `pcUi`, `resourcePlatform` |
| `broadcastCenter` | `pcUi`, `pcPlayer` |
| `pocRemotePc` | — |
| `genericEquipmentMonitorPages` | `pcUi`, `pcChart`, `pcPlayer` |

## 产物审计补充（2026-09-29）

- `pocRemotePc`：本地 `dist/mf-manifest.json` 的 Federation shared 只有 `vue`、`vue-router`；expose `./domain` 的 JS 仅含自身 domain 代码。`dist` 全量 JS/JSON 未发现 `pcRtc`、`datePlatform` 或 `@g2-platform/*` 的远端加载引用。结论：对本矩阵覆盖的 Runtime Common/平台远端无已观察到的消费边；Vue/Vue Router 是 Federation 静态 shared，不等于 Runtime Common。
- `pcRtc`、`datePlatform`：各自 manifest 仅静态 shared `vue`，未发现其他生产 `dist` manifest/JS 引用 `pcRtc` 或 `datePlatform`。两者仍是发布清单中的独立 provider，但本地构建产物中没有观察到消费者，也没有证据表明其 API 已由其他模块本地打包兜底。
- `genericEquipmentMonitorPages`：扫描时发现它除源码显式加载的 `pcChart`、`pcPlayer` 外，还配置静态 shared `@g2-platform/pc-ui` 并含产物 fallback。本轮新增页面库级 Runtime Common 代理，在 Vite 构建中将 `@g2-platform/pc-ui` 运行时导入指向代理，通过 `loadRuntimeCommon("pcUi", "index")` 加载公共实现；pc-ui 从 Federation shared 移除并降为开发期类型依赖，矩阵声明 `pcUi`。重建后 manifest shared 仅 Vue/Vue Router，Runtime Common artifact scan 与依赖矩阵通过，生成的代理 chunk 只调用 Shell 注入 loader；包自身构建与 33 项测试通过。随后通过项目 `dev-link` 动态注册并完成浏览器验收：安防监控报警记录页显示 4,275 条记录，查询后仍可用，进入首条报警详情成功；Shell 诊断面板的 17 个 Core Runtime 全部就绪，`pcUi` 为 `2026.09.22.1` / API `1.0.0`。Vite 转发 Console 中观察到 Shell 侧栏既有 duplicate-key Vue warning；本次未捕获到 Runtime Common 加载错误，但浏览器 DevTools Network/Console 面板未独立检查。完整 TypeScript 检查仍因多处页面类型与 `mf-vite` `.ts` 扩展配置错误未通过。未发布、未改生产指针。
- 本次仅检查现存本地构建产物与源码/配置，不代表 CDN/部署版本；没有发布任何产物，也没有修改生产指针。

## Platform 与 Client 依赖

| Core Runtime 提供者 | 已发现的显式消费者 |
|---|---|
| `httpPlatform` | Shell 的 `pcAuth`；生产 Clients（见下方） |
| `loggerPlatform` | Shell、`pcAuth` |
| `resourcePlatform` | Shell、`pcChrome`、`pcAiAssistant`、`commandDispatch`、`workbench` |
| `pcUi` | 上表中所有显式列出 `pcUi` 的生产 Remote |
| `pcChart` | `accessControl`, `intruderAlarm`, `gasManagement`, `securityMonitor`, `rotatingManagement`, `warehouseSafety`, `energyConsumption`, `secureEduHead`; `genericEquipmentMonitorPages` |
| `pcAlarmCharts` | `accessControl`, `securityMonitor`, `rotatingManagement`, `warehouseSafety`, `pcAlarmPopup` |
| `pcPlayer` | `accessControl`, `intruderAlarm`, `gasManagement`, `securityMonitor`, `rotatingManagement`, `fireManagement`, `emergencyDispatch`, `warehouseSafety`, `energyConsumption`, `broadcastCenter`, `pcAlarmPopup`, `genericEquipmentMonitorPages` |
| `pcMap` | `commandDispatch`, `accessControl`, `securityMonitor`, `rotatingManagement`, `emergencyDispatch`, `emergencySupplies`, `riskGradedControl`, `warehouseSafety` |
| `pcScada` | `accessControl`, `securityMonitor`, `rotatingManagement`, `warehouseSafety` |
| `pcIotSocket` | `accessControl`, `securityMonitor`, `rotatingManagement`, `warehouseSafety` |
| `pcGraphEditor` | `accessControl`, `securityMonitor`, `rotatingManagement`, `warehouseSafety` |
| `pcVisualSdk` | `accessControl`, `securityMonitor`, `rotatingManagement`, `warehouseSafety` |
| `pcChrome`, `pcMessaging`, `pcAlarmPopup`, `pcAiAssistant` | Shell composition / platform lifecycle；其中 `pcAlarmPopup` 另加载 `pcAlarmCharts`、`pcPlayer` |
| 非 Core Runtime 平台 | `pcAuth` → `httpPlatform`, `loggerPlatform`；`pcIotSocket` 无进一步显式 Platform 依赖 |
| `pcRtc` | 本次源码静态检索未发现直接消费者，待运行时与传递依赖复核 |
| `datePlatform` | 本次源码静态检索未发现直接消费者，待运行时与传递依赖复核 |

当前生产组合中的 38 个 Client 成员均通过 `httpPlatform` 获取 HTTP client；Client 保持独立契约，不把 UI fallback 带入领域 Remote。

## 后续校验项

1. **已完成本地扫描**：对“—”项及静态 shared 包检查源码、Vite Federation 配置和现存构建产物。`pocRemotePc` 无已观察到的 Runtime Common 消费边；`pcRtc`、`datePlatform` 无已观察到的消费者；`genericEquipmentMonitorPages` 发现未纳入 Runtime Common 矩阵的 `pcUi` 静态 shared 与产物内 fallback。详见上文。后续改造 `genericEquipmentMonitorPages` 后需重建并复扫，确认 fallback 消失。
2. 在独立发布验证中核对目标版本、`./info` API 兼容范围、消费者运行时诊断和 Network 资源状态。
3. 后续若增加非字面形式的加载器封装，扩展源码依赖提取器并为该语法添加测试。
