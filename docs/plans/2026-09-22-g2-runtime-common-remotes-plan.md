# G2 全量子应用的运行时公共模块独立发布方案

> 状态：实施中（阶段 A、B 已执行；阶段 C 按组件准入条件推进）
> 更新：2026-09-29
> 目标：公共组件或公共能力变更后，仅构建、发布对应公共模块及其运行时指针；所有已完成迁移的 G2 子应用在刷新后加载新版本，不再逐个重新构建。

> 新增/迁移子应用必须遵守 [`Runtime Common 子应用迁移标准`](../runtime-common-migration-standard.md)；本次 main 合并后的不合规消费者与整改顺序见 [`main 合并新增消费者 Runtime Common 整改计划`](./2026-09-29-runtime-common-main-merge-remediation.md)。

## 1. 结论

G2 已经使用 Module Federation、生产组合清单和版本化 CDN 发布目录，具备实现条件。但当前的 `shared: { "@g2-platform/pc-ui": { singleton: true } }` 仅保证运行时优先共享，不保证消费者完全不携带本地 fallback。因此，现阶段不能把“发布 `pcUi`”当作所有子应用立即更新的可靠承诺。

目标方案是将公共能力明确建模为 **运行时公共 Remote**：

```text
Shell
  └─ 读取 prod.resolved.json
       └─ 先注册 Core Runtime Remotes
            ├─ pcUi
            ├─ pcChart
            ├─ pcPlayer
            ├─ pcMap
            ├─ pcVisualSdk
            └─ 领域公共 Remote（如 securityCommon）
                 └─ Domain Remote / 页面库只消费已注册的公共实现
```

一次性完成消费方基线迁移后，后续公共能力发布只需：

```text
修改公共 Remote
→ 测试与构建该 Remote
→ 上传版本化资源
→ 更新公共 Remote 的运行时指针
→ 验证代表性消费者刷新后加载新版本
```

不需要重新构建所有领域子应用。

## 2. 当前仓库事实

### 2.1 已有能力

- Shell 使用 `@module-federation/enhanced/runtime`，从 `prod.resolved.json` 动态注册并加载 Remote。
- `deploy/compositions/prod.pc.yaml` 已按 `client`、`platform`、`pageLibrary`、`remotes` 分类描述生产组合。
- `deploy/release-sets/prod.yaml` 已将每个成员作为独立发布对象。
- 发布生成器已支持 `--only`：可只构建、发布指定 logicalName，并更新生成的 registry / resolved profile。
- CDN 发布资产已有版本目录和带 hash 静态资源的结构。

### 2.2 现有公共候选模块

| 层级 | 当前模块 | 适合独立发布的能力 |
|---|---|---|
| 基础 UI | `pcUi` | 表单、表格、弹窗、页面布局、主题、图标、通用 hooks |
| 可视化 | `pcChart`、`pcAlarmCharts`、`pcVisualSdk` | 图表、告警图、指标卡、可视化 SDK |
| 多媒体 | `pcPlayer`、`pcRtc` | 视频播放器、流媒体控制、画面布局、RTC 能力 |
| 设备/空间 | `pcMap`、`pcGraphEditor`、`pcScada` | 地图、设备图、图编辑、SCADA 通用能力 |
| 壳能力 | `pcChrome`、`pcMessaging`、`pcAlarmPopup`、`pcAiAssistant` | 顶栏、消息、告警弹窗、AI 助手壳层能力 |
| 跨领域服务 | `httpPlatform`、`datePlatform`、`resourcePlatform`、`loggerPlatform` | HTTP、日期、资源、日志 |
| 页面库 | `genericEquipmentMonitorPages`、`safety-management` 页面库 | 无独立路由的可复用页面实现 |

### 2.3 当前缺口

- 多个领域 Remote 仅将 `@g2-platform/pc-ui` 等声明为 `singleton shared`；消费者仍可能构建本地 fallback。
- 目前没有“领域公共组件”的明确边界。例如安防监控中的设备树、摄像头宫格、告警标签等仍可能散落在领域应用内。
- 当前生产 registry 将逻辑成员直接指向版本目录。它可以支持单模块发布，但缺少一个专门的、可审计的公共模块运行时指针和兼容版本策略。

## 3. 目标架构

### 3.1 Remote 类型

将现有及新增 Remote 分为三种，不混用职责。

| 类型 | 命名 | 允许内容 | 是否允许独立发布 |
|---|---|---|---|
| Core Runtime Remote | `pcUi`、`pcChart`、`pcPlayer` 等 | 无领域业务的 UI、SDK、工具、主题 | 是 |
| Domain Common Remote | `securityCommon`、`safetyCommon`、`emergencyCommon` 等 | 跨两个以上领域、无路由和领域 Store 的业务通用组件 | 是 |
| Domain Remote | `securityMonitor`、`emergencyManagement` 等 | 路由、页面、业务 Store、接口编排、领域权限 | 否；变更时构建自身 |

客户端 Remote 继续用于接口契约和请求封装，不作为 UI 公共组件发布机制。

### 3.2 首批 Domain Common Remote

| 新 Remote | 首批迁入能力 | 首批消费者 |
|---|---|---|
| `securityCommon` | 设备树、摄像头选择器、多画面宫格、巡航线/告警状态组件、视频筛选区 | `securityMonitor`、`accessControl`、`intruderAlarm`、`fireManagement` |
| `safetyCommon` | 风险标签、检查项、人员/组织选择、隐患状态组件 | `safetyManagement`、`safetyManagementHead`、`hazardGovernance`、`dailyInspection`、`riskGradedControl`、`warehouseSafety` |
| `emergencyCommon` | 预案选择、物资状态、指挥调度卡片、事件时间线 | `emergencyManagement`、`emergencyDispatch`、`emergencySupplies`、`commandDispatch` |
| `workbenchCommon` | 卡片容器、应用入口、待办/消息展示模型 | `workbench`、`pcChrome`、`pcMessaging` |

是否迁入一个组件的准入条件：它必须被至少两个领域使用，不能拥有领域路由，不能直接写领域 Store，不能在内部固定某领域 BFF 路径。

### 3.3 执行记录（2026-09-24）

- 阶段 B 已完成代表性基线迁移与本地发布验证。播放器播放请求仍有后端 HTTP 500 的既有问题；它不影响 `pcPlayer` 作为 Core Runtime Remote 的归属，但完整视频播放验收需在视频服务恢复后补验。
- 阶段 C 按上述准入条件执行。若指定消费者之间不存在真实共享组件，则该 Domain Common Remote 暂缓，不通过重复包装 Core Runtime Remote 或创建空 Remote 来满足计划项；继续审查后续候选，待出现满足条件的组件后再补做该项。
- C1 `securityCommon` 暂缓：`securityMonitor` 有设备树/多画面监控实现，但 `accessControl` 当前没有摄像头、视频或相同设备树组件。消防管理与安防监控均直接使用 Core Runtime Remote `pcPlayer`，仅提取播放器包装层会重复已有通用能力，暂不作为 `securityCommon`。恢复条件：找到至少两个领域真实需要、且不包含领域路由、Store 或固定 BFF 路径的安防业务组件，并据此更新消费者验证组合。
- C2 `safetyCommon` 暂缓：`dailyInspection` 有自己的巡检表单和巡检项组件；`safety-management` 主要承载安全管理页面库。当前检查未发现计划指定消费者间已共享的风险标签、检查项或隐患状态组件。恢复条件：跨至少两个计划消费者确认同一组件契约及实现归属后再迁移。
- C3 `emergencyCommon` 暂缓：当前 `emergencyManagement` 的预案配置、`emergencyDispatch` 的疏散指挥/资源管理、`emergencySupplies` 的物资台账及 `commandDispatch` 的通信记录由各自领域实现；检查未发现计划指定消费者共同使用的预案选择、物资状态卡或事件时间线组件。恢复条件：至少两个消费者出现同一无路由、无领域 Store/BFF 耦合的组件。
- C4 `workbenchCommon` 暂缓：工作台使用自身业务卡片；`pcChrome` 提供顶栏应用入口；`pcMessaging` / `pcAlarmPopup` 通过总线处理消息/告警。职责不同，当前未发现工作台与平台间可直接迁移的共同组件或展示模型。恢复条件：确认共享模型/API 和至少两个真实消费者后再抽取。
- 阶段 D 依赖矩阵已建立：`deploy/runtime-common-dependencies.prod.json` 覆盖生产组合中的 24 个 Remote、1 个页面库、17 个 Core Runtime 提供者及 2 个非 Core Runtime Platform。自动检查对源码中的显式 `loadPlatform` / `loadRuntimeCommon` 消费边、清单覆盖、提供者存在性和 Core Runtime 注册顺序进行比对；当前源码矩阵检查通过。
- `commandDispatch` 的产物残留根因已查明并修复：地图配置页此前仍用动态 `import("@g2-platform/pc-map")`，pc-map 根入口导出 `MapPickerModal`，该组件又引入 pc-ui，最终把 pc-ui / Ant Design Vue 一并编入消费者。现地图能力也经 `loadRuntimeCommon("pcMap", "index")` 获取。修复后构建处理模块从 3481 降至 119，原约 1.05 MB chunk 消失；pcUi 与 pcMap artifact fallback 检查通过。
- 本轮 `commandDispatch` 类型检查通过、22 项领域测试通过、构建通过；Runtime Common 检查工具 4 项测试通过，生产 composition validate 通过，`git diff --check` 通过。
- 本地单成员发布的生成/构建/profile resolve 阶段成功，但上传阶段访问 `localhost:8081` 失败（curl 亦无法连接；Docker API 当前 permission denied，未尝试绕过权限）。发布未完成，尚未将本次新构建资源提供给浏览器；需本地 S3/MinIO 与发布网关恢复后重试单成员上传，再做刷新后的页面与实际版本验证。工作区 profile 中 `commandDispatch` 指针仍是原 `20260924.65cdd51/mf-manifest.json`，与发布前一致。
- 本轮在已登录浏览器打开 `/d/command-dispatch/radio-record`：运行时页面和 pcUi 控件成功挂载；录音查询 API 返回 404（页面展示“加载失败 [404]”），属于当前后端数据接口不可用，不作为 Runtime Common 迁移通过证据。Console 同时有旧版本 Federation singleton 版本范围告警和 `loggerPlatform` 菜单加载错误；需在后续发布/运行时基线验证中分离处理。
- 验证记录：`bun run validate:compositions` 通过，组合 Schema 测试 18 项通过。全仓 `bun test` 未通过（886 pass、16 fail、13 errors），包含 BFF 装饰器加载错误、占用端口测试失败、Leaflet/Bun 子进程错误和缺少 `@cube-scada/core`；这些需分类处理，不能作为 Runtime Common 改造通过的证据。`check:runtime-common` 根脚本需传入构建目录和包名，本次未按其 CLI 契约执行，因此不记录为通过。
- 阶段 D 继续迁移 `riskManagement`：三个业务页的 pc-ui 运行时组件、消息能力和表格/表单 hooks 改由 `loadRuntimeCommon("pcUi", "index")` 获取；领域安装阶段先加载 Runtime Common，再初始化 `pcUi` 平台。移除消费者 Federation shared 项，pc-ui 保留为开发期类型依赖。新构建仅转换 105 个模块，产物扫描通过，未发现 pc-ui fallback；类型检查通过、7 项测试通过、构建通过、该目录 `git diff --check` 通过。仅保留的 `@g2-platform/pc-ui` 引用是 type-only 类型导入，不产生运行时实现。
- `riskManagement` 尚未进行已发布页面验证：其新产物不能经当前本地发布网关提供给已登录浏览器；8081 不可达。因此本轮是本地基线迁移通过，运行时加载版本/Network/Console 验收仍待网关恢复后完成。下一批优先选择静态 pc-ui 消费文件较少的生产成员，逐个做同样的类型、测试、构建和 fallback 检查；禁止用本地构建通过替代线上/浏览器验收。
- 阶段 D 继续验收 `emergencySupplies`：此前已完成 pcUi / pcMap Runtime Common 加载及 Federation fallback 移除，本轮将 pc-ui 从运行依赖移至开发依赖（源码只剩 type-only 引用）。类型检查通过、2 项测试通过、构建通过（120 个模块），pc-ui 与 pcMap 产物 fallback 扫描通过，`git diff --check` 通过。页面发布与浏览器运行时验证仍受 localhost:8081 不可达阻塞。
- 阶段 D 继续迁移 `warehouseSafety`：领域安装时先经 `loadRuntimeCommon("pcUi", "index")` 加载 pcUi，五处静态组件/消息导入（含兼容组件）改为本地 Runtime Common 代理；移除 pc-ui Federation shared，并将 pc-ui 依赖移至开发依赖。类型检查通过、2 项测试通过、构建通过（179 个模块），pc-ui 产物 fallback 扫描通过，源码不再有 pc-ui 静态导入，`git diff --check` 通过。尚未发布，浏览器运行时与实际 Network/Console 验收仍受 localhost:8081 不可达阻塞。
- 2026-09-24 手动浏览器验收：生产 Shell `/d/risk-management/risk-type` 成功渲染分类表及已有记录；`/d/emergency-supplies/supplies-list` 成功渲染物资列表（4 条）；`/d/warehouse-safety/warehouses` 成功渲染仓库管理页（当前返回 0 条）。但页面从生产旧版本 `20260924.65cdd51` 加载，Console 可见旧 Federation singleton 版本告警（要求 `^0.0.0`、提供 `1.0.0`）和既有 `loggerPlatform` menuContribution 错误，因此只证明旧线上页面的基线可打开，不能验收本轮新构建。
- 为测试新源码启动本地 Shell 与 `riskManagement` dev Remote；dev Remote 成功注册为 `http://localhost:5084/mf-manifest.json`，但独立本地 Shell 因未登录跳转 `/login`。没有复用生产 Shell 的凭据或登录态。验收服务已停止，并恢复原浏览器页路径。解除阻塞需用户在本地 Shell 完成登录（或恢复可访问的本地发布网关、将对应 Remote 版本发布至测试环境），再对三页检查实际 Runtime Common 来源、请求和 Console。
- 阶段 D 下一项 `intruderAlarm`：源码无 pc-ui 静态导入，`pcUi` 仅由 `loadPlatform` 初始化，故移除其 `@g2-platform/pc-ui` 依赖声明及 Federation shared fallback，不增加无用运行时组件适配。类型检查通过、1 项测试通过、构建通过（101 个模块），产物 fallback 扫描通过，`git diff --check` 通过。首轮本地 Shell 启动后到达独立 `/login`，当时暂停浏览器验收并将登录页交由用户接管；其后的登录与页面验收结果见下一条。开发服务保持运行；未发布、未更新生产指针。
- `intruderAlarm` 本地浏览器验收后续完成：用户登录本地 Shell 后，重启 Shell 使其在组合初始化前即载入 `intruderAlarm` 与 `genericEquipmentMonitorPages` 两个本地注册项。页面 `/d/intruder-alarm/overView` 由新本地 Domain Remote 成功渲染，统计卡片与区域表格可见真实数据；两个 Remote 的 `mf-manifest.json` 和 `remoteEntry.js` 均 HTTP 200。Shell source 显示 `intruderAlarm`、页面库为 `local-remote`，`pcUi` 由本地 workspace platform 初始化；消费者构建 artifact fallback 检查通过。浏览器 Console 无 error；有已有 Shell 菜单数据重复 key 的 Vue warning，未发现来自新 Domain 的运行错误。Runtime dependency matrix profile check 通过（24 remotes、1 page library、17 Core Runtime providers）。为页面库单独运行的 typecheck 未通过，报错集中在其已有页面与 UI/API 类型契约不匹配（本轮未修改页面库）；记录为依赖项未通过，不掩盖 intruderAlarm 自身类型检查通过。验收 Shell、Domain 与页面库开发服务暂保持运行，便于继续后续消费者验收；未发布、未更新生产指针。
- 阶段 D 下一项 `safetyManagementHead`：源码只通过 `loadPlatform("pcUi", "platform")` 初始化平台，没有 `@g2-platform/pc-ui` 静态导入，因此删除 Domain 的 pc-ui 运行依赖、Federation shared fallback，并同步 lockfile；保留运行时平台初始化。构建通过（3460 modules）、profile dependency matrix 检查通过（24 remotes、1 page library、17 Core Runtime providers）、改动路径 diff check 通过。类型检查被复用的 `@g2-pages/safety-management` 中两个数据字典参数类型错误阻断；该 Domain 无测试文件（`bun test` 返回 No tests found）。本地 Shell 路由 `/d/safety-management-head/monthly-report` 最初因为 `safetyManagementClient` 5093 未启动而空白；启动本地客户端后，页面成功显示安全月报列表（13 条）及操作控件。新 Domain manifest HTTP 200，shared 列表仅有 Vue / Vue Router，未包含 pc-ui。浏览器记录有旧的 Shell compose timeout（发生在依赖缺失期间）及既有菜单重复 key warning；页面最终渲染后无新的 Runtime Common 错误。新产物未发布、生产指针未修改。
- 阶段 D 继续迁移 `safetyManagement`：源码没有 pc-ui 静态导入，仅保留 `loadPlatform("pcUi", "platform")`，故删除 Domain 运行依赖与 Federation shared fallback，保留平台初始化。构建通过（3460 modules）、profile dependency matrix 通过（24 remotes、1 page library、17 Core Runtime providers）、diff check 通过；类型检查仍由同一页面库 `pages.tsx:2162/2164` 数据字典参数类型错误阻断，Domain 无测试文件。Vite 首次依赖优化期间短暂不可响应，完成后本地 Remote 注册与 manifest 200；已登录 Shell `/d/safety-management/monthly-report` 实际展示月报数据（34 条）及查看/编辑/上报/导出控件。页面最终运行时无 Console error；有既有 Shell 菜单重复 key Vue warning。未发布，生产指针未修改。
- 阶段 D 下一项 `emergencyManagement`：9 个页面静态导入 pc-ui 的组件、消息和 hooks，统一改为 `pc-ui-runtime` 代理，install 阶段先 `loadRuntimeCommon("pcUi", "index")` 再初始化 `pcUi` 平台；将 pc-ui 仅保留为开发期类型依赖，并移除 Federation shared fallback。正常 typecheck 命令被项目 TypeScript 6 `baseUrl` 弃用设置阻断；补充兼容参数 `--ignoreDeprecations 6.0 --allowImportingTsExtensions` 后专项 tsc 通过。无测试文件。构建通过（3253 modules）；manifest shared 仅 Vue/Vue Router，不包含 pc-ui；产物中只有本地异步代理代码，没有 PC UI 实现 fallback。Runtime profile matrix 检查通过，diff check 通过。已登录 Shell `/d/emergency-management/plan-documents` 实际展示筛选器、操作按钮和表格，当前测试数据返回 0 条；Console 无 error，只有已有的菜单重复 key warning。未发布、生产指针未修改。
- 阶段 D 继续迁移 `safetyDuty`：12 个 pc-ui 源文件改为运行时代理，类型-only Upload 接口保留为开发依赖；install 阶段先加载 Runtime Common `pcUi/index`，再初始化 pcUi 平台。专项 TypeScript 检查（TS6 兼容参数）通过；构建通过（127 modules），Domain 测试无测试文件；manifest shared 仅 Vue/Vue Router，矩阵与 diff check 通过。浏览器 `/d/safety-duty/organization-duty/overview` 显示真实履职总览数据（主要负责人 6 人、一线人员 4 人）；Console 无 error，有已有菜单重复 key warning。未发布、生产指针未修改。
- 阶段 D 继续迁移 `broadcastCenter`：6 个页面/工具模块改由本地 Runtime Common 代理读取 pcUi 组件、hooks、message 与 dayjs；保留仅供表单/上传类型检查的 pc-ui 开发依赖，移除 Federation shared fallback。专项 TypeScript 检查（TS6 兼容参数）通过；1 项路由测试通过；构建通过（111 modules），manifest shared 仅 Vue/Vue Router；Runtime profile matrix 与 diff check 通过。浏览器 `/d/broadcast-center/broadcast-record` 成功挂载表格、查询/重置及分页控件，当前数据为 0 条；Console 无 error/warning。未发布、生产指针未修改。
- 阶段 D 继续迁移 `secureEduHead`：6 个 PC UI 静态导入点迁为 Runtime Common 组件、dayjs 与滚动 hooks 代理；已有 `pcChart` Runtime Common 迁移保留。UI `pcUi/index` 与图表公共模块均在对应平台初始化前加载，类型-only `ColumnType` / `UploadRequestOption` 保留开发依赖。专项 TypeScript 检查（TS6 兼容参数）通过；Domain 9 项测试通过（更新测试验证 pcUi Runtime Common 的加载顺序）；构建通过（110 modules）；manifest shared 不含 pc-ui；矩阵与 diff check 通过。浏览器 `/d/secure-edu-head/over-view` 显示总览指标卡、周期筛选和图表区域（测试 API 当前均为 0/暂无数据）；Console 无 error，只有既有菜单重复 key warning。未发布、生产指针未修改。
- 阶段 D 继续迁移 `dailyInspection`：23 个源码文件的 PC UI 运行时导入改为 lazy Runtime Common 代理，领域安装阶段先加载 `pcUi/index` 再初始化 pcUi 平台；移除 Federation shared fallback，pc-ui 留作开发依赖，并补齐 Leaflet 类型开发依赖及地图实例局部变量类型收窄。TS6 兼容参数专项类型检查通过；16 项测试、82 次断言通过；构建通过（1996 modules），manifest shared 仅 Vue/Vue Router；Runtime profile matrix（24 remotes、1 page library、17 Core Runtime providers）及 `git diff --check` 通过。已登录本地 Shell `/d/daily-inspection/inspect-plan` 实际显示 21 条巡检计划记录，以及查询、重置、新增和分页控件；Console 无 error，只有既有 Shell `daily-inspection` 菜单重复 key warning 和启动时一次 compose 3 秒超时（随后完成挂载）。开发服务保持运行便于继续验收；未发布、生产指针未修改。
- 阶段 D 继续 `rotatingManagement`：源码没有 PC UI 运行时导入，只通过 `ctx.loadPlatform("pcUi", "platform")` 初始化宿主平台；移除 pc-ui workspace dependency 与 Federation shared 项，新增安装测试验证 pcUi、pcChart、pcPlayer 仍由宿主初始化。专项类型检查通过、2 项测试（17 次断言）通过、构建通过（104 modules），manifest shared 仅 Vue/Vue Router，产物未发现 pc-ui fallback；Runtime profile matrix 与 `git diff --check` 通过。浏览器运行时验收未通过：本地 Shell 侧栏未暴露动环管理入口，直接访问 `/d/rotating-management/` 仍显示工作台空内容，浏览器未记录 rotatingManagement Remote 加载；因此只记录静态/构建通过，不将该消费者标记为运行时验收完成。开发 Remote 保持运行；未发布、生产指针未修改。
- 阶段 D 继续 `securityMonitor`：补齐领域安装顺序，先加载 `pcUi/index` Runtime Common，再初始化 `pcUi` 平台；已有 pcChart Runtime Common 加载与 PC UI / pcPlayer 代理保留。13 项测试（76 次断言）通过；构建通过（124 modules），manifest shared 仅 Vue/Vue Router，pc-ui、pc-player、pc-chart 产物 fallback 均未发现；Runtime profile matrix 通过。浏览器本地 `/d/security-monitor` 实际显示安防数据总览、日期筛选与图表区域（当前数据为 0/暂无数据）；本页无 Console error，存在既有菜单重复 key warning。类型检查仍有 `patrol-pages.tsx` 中 9 处旧组件 props/回调类型错误；为判断归属，临时恢复该文件原始静态 UI import 后同样出现完全相同错误，证明并非本次 Runtime Common 代理引入。未发布、生产指针未修改。

## 4. 关键实现规则

### 4.1 不再把公共实现打入消费者

对每个公共 Remote 的消费者实施一次性基线改造：

1. 在 Shell 中把公共 Remote 注册并加载在领域 Remote 之前。
2. 消费方仅从统一的 `runtime-common-loader` 获取公共能力。
3. Federation shared 配置不允许为运行时公共包生成本地 fallback。
4. 构建产物检查必须确认消费者的 `mf-manifest.json` / chunks 不再包含公共模块实现。

建议新增公共加载器包：

```text
packages/runtime-common-loader/
  contracts/       // 类型、版本范围、组件 props/emits
  loader/          // loadRemote、缓存、错误处理
  vue/             // defineAsyncComponent / Suspense 适配
  diagnostics/     // 当前实际加载版本、来源、降级状态
```

领域代码不得散落调用 `mf.loadRemote()`；统一经加载器访问，便于版本检查、失败降级和观测。

### 4.2 Vue 组件加载方式

- 页面级或较大组件：使用 `defineAsyncComponent`，从 `runtime-common-loader` 获取 Remote 组件。
- 必须同步使用的工具函数：在领域 `install()` 或页面初始化阶段预加载，再通过 loader 缓存读取。
- `vue`、`vue-router`、`pinia` 继续严格 singleton，不能跨 Remote 各自创建实例。
- 全局 CSS、Ant Design Vue 注册、主题变量只能由 `pcUi` / Shell 负责；领域公共 Remote 不允许重复全局注册。

### 4.3 运行时指针与缓存

发布目录保持不可变：

```text
pcUi/<version>/mf-manifest.json
pcUi/<version>/remoteEntry.js
pcUi/<version>/assets/<content-hash>.js
```

新增受控逻辑指针（推荐由 registry/resolved profile 承担，而不是让领域应用写死 `latest`）：

```text
prod.resolved.json
  └─ platform.pcUi.entry = .../pcUi/<version>/mf-manifest.json
```

缓存策略：

| 资源 | 缓存 |
|---|---|
| `prod.resolved.json` | `no-cache` |
| `mf-manifest.json`、`remoteEntry.js` | `no-cache` 或短缓存 |
| content-hash JS/CSS/字体/图片 | 长缓存、`immutable` |

更新顺序必须是：先上传版本资源并校验可访问，再原子更新 registry / `prod.resolved.json`。禁止先改 profile 再上传资源。

### 4.4 兼容版本

每个公共 Remote 在暴露 `./info`：

```ts
export const runtimeVersion = "2026.09.22.x";
export const apiVersion = "1.3.0";
export const compatibility = { minConsumer: "1.0.0", maxConsumer: "1.x" };
```

- 样式修复、内部逻辑修复、可选 prop：同一 `apiVersion`，允许仅发布公共 Remote。
- 删除 prop、修改事件语义、改变数据结构：升级 major API；保留旧 Remote entry，消费者按兼容范围继续使用旧版，不能强制切换。
- Shell 在加载公共 Remote 时记录实际版本；版本不兼容时停止加载相关领域模块并给出明确错误，不渲染半成品页面。

### 执行记录（2026-09-28，远端发布校验）

- 新增 `runtime-common-check --remote --manifest=<url> --origin=<shell-origin>` 发布验收命令：下载并校验 MF manifest、`remoteEntry.js`、所有共享/暴露 JS/CSS 资源与 Content-Type；逐项检查 HTTP 成功、CORS 与按资源区分的 Cache-Control（manifest 可 `no-cache` 或短缓存；`remoteEntry.js` 可 `no-cache` 或 max-age≤300 秒；其他内容资源默认至少 24 小时，可要求 `immutable`）；静态读取 `./info` 的 `runtimeVersion`/`apiVersion`，支持与预期版本/range 比对，不执行远端 JavaScript。校验器测试、专项 TypeScript 检查与全仓 Runtime dependency matrix 通过。此前试测的 `http://localhost:5054/mf-manifest.json` 未监听；生产端点实测仍待可达的发布网关。

## 5. 全量迁移批次

### 阶段 A：基础设施与可观测性

- [x] 创建 `runtime-common-loader`、公共 Remote 契约、运行时诊断面板。
- [x] 在组合 loader 中支持 `coreRuntime` 依赖顺序，确保公共 Remote 先于 Domain Remote 注册。
- [x] 扩展发布生成器：支持 `--only <logicalName>` 后只更新该成员的 registry 指针和重新生成 resolved profile，不构建其它成员。
- [x] 增加发布校验：Remote manifest、`./info`、实际 chunks、CORS、缓存头及版本一致性（工具单测与本地构建产物 HTTP 验收通过；真实发布端点验收仍待发布网关恢复）。
- [x] 增加消费者产物扫描，阻止公共实现重新落入领域 bundle。

### 阶段 B：Core Runtime Remote 基线

按风险从低到高迁移：

1. `datePlatform`、`loggerPlatform`、`resourcePlatform`、`httpPlatform`
2. `pcUi`
3. `pcChart`、`pcAlarmCharts`
4. `pcPlayer`、`pcRtc`
5. `pcMap`、`pcGraphEditor`、`pcScada`、`pcVisualSdk`
6. `pcChrome`、`pcMessaging`、`pcAlarmPopup`、`pcAiAssistant`

每完成一个模块，选至少两个领域消费者进行一次基线发布。此阶段会重建消费者；完成后该公共模块的后续常规修改不需要重建它们。

### 阶段 C：领域公共模块

1. `securityCommon`：先以 `securityMonitor` + `accessControl` 验证。
2. `safetyCommon`：先以 `safetyManagement` + `dailyInspection` 验证。
3. `emergencyCommon`：先以 `emergencyManagement` + `emergencyDispatch` 验证。
4. `workbenchCommon`：先以 `workbench` + `pcChrome` 验证。

每个阶段都需要：组件归属审查、契约测试、双消费者实际页面验证、产物去重检查及独立发布演练。

### 阶段 D：覆盖所有生产成员

以 `deploy/release-sets/prod.yaml` 和 `deploy/compositions/prod.pc.yaml` 为唯一清单来源，建立矩阵：

- 每个 production `remotes`、`pageLibrary`：列出其消费的 Core / Domain Common Remote。
- 每个 production `platform`：声明是否是公共提供者、依赖顺序和兼容版本。
- 每个 production `client`：保持独立契约 Remote；不作为 UI 公共能力的 fallback。

新增子应用必须在合入前填充该矩阵，否则拒绝发布。

## 6. 公共模块独立发布标准流程

以 `securityCommon` 为例：

```text
修改 securityCommon
→ 契约测试 + 单元测试 + 代表性视觉测试
→ 仅构建 securityCommon
→ 上传 securityCommon/<version>/ 全部资源
→ 校验 manifest、remoteEntry、chunks、CORS 与缓存头
→ 仅更新 securityCommon 的 registry 指针并生成 prod.resolved.json
→ 上传新的 prod.resolved.json
→ 新开或刷新 securityMonitor、accessControl 页面验证
```

发布完成的判定不是构建成功，而是：两个以上消费者在刷新后均报告加载到目标 `runtimeVersion`，且 Console/Network 无 Remote 加载、共享依赖或 Vue 实例错误。

## 7. 回退

公共 Remote 回退不重新构建消费者：

1. 将 registry / `prod.resolved.json` 中该公共成员 entry 指回上一个已验证版本。
2. 重新发布 profile 文件。
3. 验证 Shell 新开页和代表性消费者加载旧 `runtimeVersion`。
4. 不删除故障版本资源，保留用于定位与审计。

若公共 Remote 无法加载，`runtime-common-loader` 必须阻止受影响领域模块挂载，并显示“公共模块版本不可用”；不得静默加载本地旧 fallback，以免同一页面混用两套实现。

## 8. 验收标准

- [ ] 任意一个已迁移公共 Remote 可单独构建并发布。
- [ ] 发布该 Remote 时，构建日志仅包含该 Remote，不包含其消费者。
- [ ] 新 profile 指向目标 Remote 版本，所有资源可访问且缓存策略正确。
- [ ] 至少两个消费者刷新后加载同一目标版本。
- [ ] 消费者构建产物不含该公共 Remote 的实现 fallback。
- [ ] 公共 Remote 失败时，受影响页面明确失败，不出现混合版本运行。
- [ ] 回退只修改运行时指针；不重建消费者。
- [ ] 生产组合清单中的全部 Domain Remote、页面库和平台都有公共依赖矩阵记录。

## 9. 决策建议

先落地阶段 A，再用 `pcUi` 与 `securityCommon` 做试点。不要直接对全部子应用修改 Federation 配置：缺少加载顺序、产物扫描和回退机制时，`shared singleton` 很容易造成“部分用户新版本、部分用户旧 fallback”的不可诊断问题。

## 执行记录（2026-09-28）

- `workbench` 完成 `pcUi` Runtime Common 消费迁移：领域安装阶段先初始化运行时 UI 代理，再加载 `pcUi` 平台；页面组件从领域 bundle 的静态 UI 实现切换到 Runtime Common 代理；`@g2-platform/pc-ui` 降为开发依赖且不再作为 Federation shared。
- 工作台实际浏览器验收发现并修复了卡片 API 标识到组件导出的解析问题，以及备忘录 Popover 在无触发节点时读取 `closest` 的异常。刷新后工作台通知、待办、备忘录、任务统计、告警汇总均实际渲染。
- 验证：Runtime Common 矩阵 PASS（24 remotes、1 page library、17 providers）；WorkBench 专项 TypeScript、测试（1 项）和生产构建 PASS；冻结锁文件安装 PASS（893 installs，无锁文件变更）；`git diff --check` PASS。
- 构建仍有已有的 `:global` CSS minifier 提示及 workbench-cards 大 chunk 告警；当前浏览器连接未暴露可读取的 Console 历史，因此本次不能据此宣称 Console 零错误。尚未做独立生产发布或生产指针切换。
- `dailyTask` 完成 `pcUi` Runtime Common 消费迁移：83 处静态导入切至本地代理，领域安装先加载 `pcUi/index` 再初始化平台，并新增安装顺序测试。类型检查通过、2 项测试通过、构建通过（175 modules）、产物检查与 Runtime dependency matrix 通过；源码不再静态引用 pc-ui，实现 fallback 未进入领域产物，Manifest shared 仅 Vue / Vue Router。
- 已登录本地 Shell 实际打开 `/d/daily-task/task-plan`：筛选表单、查询/重置/新增操作、表格与分页正常显示；当前测试数据为 0 条。最初 Console 出现 PcForm 表单 schema 中自定义 `DailyTaskTypeSelect` 组件被深响应式代理的 Vue warning；在该 schema 组件处使用 `markRaw` 后刷新，最近 Console 区间已无该 warning 或 error。仍有既有 Shell 菜单 duplicate-key warning 及首次组合挂载超时提示。未发布，生产指针未修改。
- `emergencyDispatch` 完成 `pcUi` Runtime Common 迁移：14 类组件/图标与 message 代理取代 21 个文件中的静态运行时引用；领域先加载 `pcUi/index` 再初始化平台；pc-ui 改为开发依赖并从 Federation shared 移除；安装测试覆盖运行时加载顺序。专项 TypeScript 检查通过、2 项测试通过、构建通过（1772 modules）、冻结锁文件安装无改动、Runtime Common artifact 检查与 24 Remote / 1 page library / 17 Provider 矩阵通过，Manifest shared 仅 Vue / Vue Router。
- 本地已登录 Shell 注册 `emergencyDispatch` dev Remote 并打开 `/d/emergency-dispatch/resource-list`：资源统计、筛选、查询/重置、表格、空态与分页实际渲染；点击查询后状态正常。Console 无 error，仅记录到首次 `composeFromProfile` 超时诊断提示；没有发布或修改生产指针。
- `fireManagement` 完成 `pcUi` Runtime Common 迁移：新增 Runtime Common UI 代理、领域安装先加载 `pcUi/index` 再初始化既有 `pcUi` / `pcPlayer` 平台；将 PC UI 运行时依赖移至开发依赖并从 Federation shared 移除；安装测试验证加载顺序。浏览器实际打开 `/d/fire-management/fire-point-management`，筛选表单、按钮、表格和空数据态渲染，点击“查询”后页面仍稳定显示空结果。验收中发现表单 schema 会把本地自定义 Select 组件深度响应式化，已在组件 schema 入口使用 `markRaw`。
- Fire Management 验证：2 项测试 / 11 条断言通过；生产构建通过（2645 modules）；Runtime Common artifact scan、全仓依赖矩阵（24 remotes、1 page library、17 providers）、冻结锁文件安装（893 installs，无变更）及 `git diff --check` 通过；产物 shared 仅 Vue / Vue Router。专项 TypeScript 检查与迁移前基线对比为相同的既有领域类型错误（表单/Cascader/JSX/旧字段等），未因本次代理迁移新增；尚未完成生产独立发布/指针切换。构建保留已有 Font Awesome 字体解析提示和 ExcelJS 大 chunk 告警。
- `riskGradedControl` 完成 `pcUi` Runtime Common 消费迁移：新增组件/消息/hooks/type 代理，领域安装先加载 `pcUi/index`；将 `pc-ui` 移为开发依赖并从 Federation shared 移除。独立开发入口仍使用本地 PC UI，以保留其独立预览能力；生产 Remote artifact scan 确认公共 PC UI 实现未进入领域远程产物，manifest shared 仅 Vue / Vue Router。
- Risk Graded Control 验证：专项 TypeScript 通过，3 项测试 / 18 条断言通过，生产构建（3535 modules）、artifact scan、Runtime Common 全仓矩阵、冻结锁文件安装（893 installs，无变更）与 `git diff --check` 通过。已登录 Shell 实际打开 `/d/risk-graded-control/config/warning-signs`，页面显示 17 条记录；点击“查询”后 URL 更新到 `pageNumber=1` 且表格仍正常显示。捕获到既有 Shell 菜单 duplicate-key Vue warning；未观察到风险管控页面新增相关错误。未进行生产发布或指针切换。
- `hazardGovernance` 完成 `pcUi` Runtime Common 迁移：新增组件/图标、message 与 hooks 代理；Domain install 先加载 `pcUi/index` 再初始化平台；PC UI 转为开发依赖，Federation shared 移除 PC UI，仅保留 Vue / Vue Router。
- Hazard Governance 验证：类型检查通过；4 项测试通过；生产构建（3862 modules）、Runtime Common artifact scan、全仓矩阵、冻结锁文件安装（893 installs，无变更）和 `git diff --check` 通过。已登录 Shell 实际打开 `/d/hazard-governance/hazard-workbench`，确认待办统计、筛选表单、表格与 32 条待确认记录渲染；点击“查询”后 URL 更新至 `pageNumber=1`，表格状态正常。观察到 Shell 菜单既有 duplicate-key Vue warning；未观察到该领域新增相关错误。没有生产发布或生产指针变更。
- `energyConsumption` 完成 `pcUi` Runtime Common 消费迁移：新增组件/图标、message、查询状态、dayjs 与日期 locale 代理；Domain install 先加载 `pcUi/index`，再按原顺序初始化 `pcUi`、`pcChart`、`pcPlayer` 平台。将 PC UI 转为开发依赖，并从 Federation shared 移除；保留既有 `pc-iot-socket` Federation shared。
- Energy Consumption 验证：专项类型检查通过；2 项测试通过；生产构建（3095 modules）、Runtime Common artifact scan、全仓矩阵、冻结锁文件安装（893 installs，无变更）和 `git diff --check` 通过。Manifest shared 为 Vue、Vue Router、pc-iot-socket。已登录 Shell 实际打开 `/d/energy-consumption/energy-overview`：能耗统计、报警、能源走向、用能趋势、区域 Top10 渲染；点击首组“日”周期后页面继续显示数据及图表空态，操作可用。构建保留既有 CSS `:deep` minifier 提示及 ECharts 大 chunk 警告；未进行生产发布或指针切换。
- 修正工作台迁移遗留引用：备忘录 composable 的错误消息由 PC UI 本地实现改为 Workbench Runtime Common `message` 代理。专项 TypeScript、1 项测试、构建、artifact scan、Runtime Common 矩阵和 `git diff --check` 通过；源码无剩余直接 PC UI imports。Shell `/d/workbench` 实际打开，工作台卡片及个人备忘录列表正常显示（5 条）；本次仅查看，不创建或修改业务数据。工作台构建仍提示既有 CSS `:global` minifier 及大 chunk 告警。
- 阶段 D 继续验收 `accessControl`：现有改造已将门禁页面的 PC UI 组件和消息能力切换至 Runtime Common 代理，安装时先加载 `pcUi/index` 与 `pcChart/index`，再初始化宿主平台；生产 Federation shared 仅 Vue / Vue Router。TS6 兼容参数专项类型检查通过；18 项测试、44 次断言通过；生产构建（114 modules）、Runtime Common artifact scan、依赖矩阵（24 remotes、1 page library、17 Core Runtime providers）与 `git diff --check` 通过。部署清单中的开发 Shell 指向 `localhost:5050/mf-manifest.json`，但浏览器运行时未能完成组合挂载：Vite 启动报 5050 端口占用，而提升权限检查未发现可连接的 listener；Shell Console 出现 `composeFromProfile` timeout，故本轮不记为页面验收通过。未发布、生产指针未修改。
- 阶段 D 继续处理 `gasManagement`：源码没有 PC UI 运行时导入，仅通过宿主 `pcUi` / `pcChart` / `pcPlayer` 平台初始化，因此移除 `pc-ui` 运行依赖和 Federation shared fallback（保留原有其他开发期工具依赖），并新增安装测试约束平台初始化顺序。专项类型检查、2 项测试、生产构建（101 modules）、Runtime Common artifact scan、冻结锁文件安装（893 installs、无改动）、依赖矩阵及 `git diff --check` 均通过；manifest shared 仅 Vue / Vue Router。浏览器运行时仍未验收：Shell Console 报 `composeFromProfile` timeout，Vite 启动报 5083 端口占用但提升权限后也无法连接 manifest。未发布、生产指针未修改。
- 补齐 Core Runtime 之间的依赖边：`PlatformContext` 增加 Shell 注入的 `loadRuntimeCommon`；`pcChrome` 顶栏、侧栏、标签、弹窗和主题运行时改为通过 `pcUi/index` 代理，pc-ui 仅保留开发期类型/测试依赖，矩阵新增 `pcChrome -> pcUi`。专项 TS6 兼容类型检查通过；pcChrome 22 项测试通过，Runtime Common loader 3 项、artifact/matrix checker 4 项测试通过；生产构建（124 modules）、无 UI fallback 产物扫描、全仓矩阵与冻结锁文件安装（893 installs、无改动）通过。浏览器运行时未验收：开发 registry 指向的 5011 manifest 不可连接，Vite 报端口占用，提升权限检查仍无法连接；未发布、未改生产指针。接下来 Core Runtime 中仍发现 `pcMap`、`pcAlarmPopup`、`pcAuth` 的生产源码静态引用 PC UI，需逐个完成同类加载边与 fallback 去除。
- `pcMap` 完成 PC UI 运行时依赖改造：地图选点弹窗的 UI 改由 Shell 注入的 Runtime Common `pcUi/index` 提供；`pcMap` platform install 先加载 `pcUi`，依赖矩阵新增 `pcMap -> pcUi`；`@g2-platform/pc-ui` 从运行依赖降为开发期类型依赖。专项类型检查、生产构建（99 modules）、Runtime Common artifact scan、全仓依赖矩阵（24 remotes、1 page library、17 Core Runtime providers）、冻结锁文件安装（893 installs，无锁文件变更）及 `git diff --check` 通过。新加的 `pcMap` 安装测试通过；整个 pcMap 测试套件另有 2 条既有 Leaflet 子进程测试无法启动，Bun 报 `posix_spawn .../bun` ENOENT（直接 Bun 命令可运行，提升权限重试结果相同）。浏览器当前 `/d/access-control` 页面只显示 Shell 空白内容，无法复现地图选点流程，因此 UI 验收未通过/未完成；未发布、未修改生产指针。
- `pcAlarmPopup` 完成 PC UI 运行时依赖改造：告警弹窗的按钮、Tabs、Tag、Space 与消息提示从 `pcUi/index` Runtime Common 代理获取；platform install 在创建告警服务与挂载 overlay 前先加载 `pcUi`；去掉静态 PC UI 样式导入，运行时由 `pcUi/index` 加载样式；矩阵依赖边扩为 `pcAlarmPopup -> pcUi, pcPlayer, pcAlarmCharts`，PC UI 降为开发期类型依赖。30 项测试 / 73 条断言通过，生产构建（97 modules）、Runtime Common artifact scan、全仓依赖矩阵、冻结锁文件安装（893 installs，无变更）和 `git diff --check` 通过。专项 tsc 检查仍报 `JSX` 命名空间、Player/Chart 组件类型及 handlers 测试联合类型问题；本次新增 Runtime Common 测试 mock 的泛型错误已修正，不在最终错误列表。当前 Shell 页面仍为空白，无法触发真实告警弹窗，UI 验收未完成；未发布、未修改生产指针。
- `pcAuth` 登录平台完成 PC UI Runtime Common 基线迁移：登录页、手机号/微信登录、找回密码、账号绑定和用户协议组件的运行时 UI 与 message 改用代理；platform install 最先加载 `pcUi/index`；pc-ui 降为开发期类型依赖；依赖矩阵声明 `pcAuth -> pcUi, httpPlatform, loggerPlatform`。92 项测试 / 161 条断言通过；生产构建（182 modules）、artifact scan、矩阵、冻结锁文件安装（893 installs，无改动）、Manifest shared（仅 Vue / Vue Router）及 `git diff --check` 通过。TS6 兼容类型检查仍被 `cas-sso.test.ts` 中既有 HttpClient mock 缺少必需 `patch` 方法阻断。构建有既有 federation DTS 调试输出及 Phone/Wechat Login 动态导入无效提示。已登录 Shell 页面仍是空白，未能安全验证登录表单运行时；未发布、未修改生产指针。至此已补齐 pcMap、pcAlarmPopup 和 pcAuth 三条 Core Runtime/平台 UI 依赖边，但告警弹窗和登录表单均待浏览器验收。
- 新增 Shell Runtime Common 诊断面板：正常应用内可查看每个 Core Runtime Remote 的加载状态、runtime/API 版本和错误；在 bootstrap 等待/失败且 Vue 尚未挂载时也展示可展开的公共模块诊断，避免启动故障吞掉诊断入口。Shell App 与 bootstrap UI 测试 27 项通过，loader 测试 3 项通过，Shell TS6 兼容类型检查与生产构建（422 modules）通过。已登录浏览器刷新 `/d/access-control` 后实际打开“公共模块诊断”，验证 17 个 Core Runtime Remote 均显示“已就绪”，其中 `pcMap` 当前加载版本为 `2026.09.23.3` / API `1.0.0`；此浏览器仍在用当前已解析的旧版本指针，不代表本轮本地构建已发布。Access Control 主体仍为空，因此不能据此确认地图/门禁业务组件验收。阶段 A 尚缺远端 manifest/chunk、CORS、缓存头及版本一致性发布校验；未执行生产发布或指针变更。

- 2026-09-28 继续阶段 D 验收：`secure-edu` 9 项测试 / 54 条断言、专项类型检查、生产构建（110 modules）、Runtime Common 产物扫描和全仓矩阵均通过；但浏览器当前使用的 legacy-compat Shell profile 只包含 9 个已注册 Remote，未包含 `secureEduHead`，因此安全教育路由不能作为该 Shell 的业务页面验收样本。换到已注册的 `/d/workbench` 后，工作台问候区、快捷入口、通知、待办、备忘录、任务统计与告警汇总均实际渲染；Runtime Common 诊断面板可见 17 个 Core Runtime Remote 全部就绪（运行时版本为仓库之外的当前解析版本）。当前 profile 没有触发生产发布、修改发布指针或业务数据写入。
- 新增远端验收工具复验：Runtime Common checker 7 项测试 / 10 条断言、类型检查、产物扫描、依赖矩阵及 `git diff --check` 通过；尝试用该 CLI 对本机 `pcUi` Remote（5016）读取 manifest/chunks 时 Bun fetch 无法连接；同一时间本机 Shell 返回 resolved profile 可读，表明运行时验证器的实际 HTTP 访问仍受当前执行环境网络隔离限制。不能据此判为真实 HTTP 发布验收通过；仍待网关/执行环境可达后复验。
- 2026-09-29 阶段 C 组件归属验收：`safetyManagement` 主要宿主化 `@g2-pages/safety-management` 页面，`dailyInspection` 是独立巡检工作流，未发现跨领域组件调用；应急管理的预案附件上传与应急调度平面图上传虽都涉及文件，但分别绑定不同 Client、sceneCode/businessKey、文件结构和业务规则，不能抽成无领域语义的同一 Remote；`workbench` 是业务卡片，`pcChrome` 是 Shell 导航/标签/主题平台，两者没有可复用的同一业务组件。三个候选当前均不满足“两个以上真实消费者 + 无领域耦合”门槛，暂不创建空壳 Common Remote，后续需从重复业务实现与组件调用证据重新选候选。
- 同轮浏览器复验：工作台首页与应急调度 `/d/emergency-dispatch/resource-list` 均成功渲染；应急资源列表筛选、查询按钮、空态和分页实际可见，点击查询后页面仍稳定，未写入业务数据。诊断面板显示 17 个 Core Runtime 已就绪；Console 未从当前浏览器控制面读取，故不记录 Console 零错误。安全教育路由仍不在当前 Shell 的 9 个本地注册 Remote 中，未验收其运行时页面。
- 2026-09-29 继续运行时消费者验收：`dailyTask` 已在当前 Shell profile 注册且本地 Remote 端口 5064 正在监听。浏览器 `/d/daily-task/task-plan` 显示筛选、操作按钮、表格及空数据态；点击“查询”后 URL 更新为 `pageNumber=1`，页面仍稳定。诊断面板 17 个 Core Runtime 全部就绪。真实 HTTP 运行 checker 对 `dailyTask` manifest 返回“缺少 Cache-Control 响应头”：响应成功且 CORS 检查通过后，按策略在缓存检查处失败；这是 Vite 开发端点，不是带发布缓存头的生产静态资源，因此此结果确认工具真实联网检查生效，但不算发布验收通过。`pcUi` 5016 当前无监听进程；checker 测试 7 项 / 10 条断言、矩阵（24 Remotes、1 页面库、17 providers）和 `git diff --check` 通过。
- 同日按缓存策略验收发现并修正校验器误判：原实现把 manifest、remoteEntry 和内容哈希 chunk 一概要求长缓存，与本计划缓存矩阵不符。新增回归测试先失败，修正后完整 checker 测试 8 项 / 13 条断言通过，专项 TypeScript 检查、24 Remote / 1 page library / 17 Core Runtime provider 矩阵和 `git diff --check` 均通过。使用临时只读 HTTP 服务提供本地 `pcUi/dist` 并按发布策略注入 CORS/缓存响应头，校验器成功检查 33 项实际构建资源，runtime `2026.09.22.1` / API `1.0.0`；服务随后已关闭。这证明构建产物契约和检查调用链可用，但因响应头由临时服务提供，仍不替代 CDN/部署网关实测。真实 dailyTask Vite manifest 因开发端点未提供 Cache-Control 被正确拒绝；将 `dailyTask` 域 Remote 误用于公共 Runtime 校验时则因它不暴露 `./info` 被拒绝，这两项均不计作公共 Remote 发布验收失败。
- 2026-09-29 扩展到全部 Core Runtime 构建产物：对 17 个 `Core Runtime` dist 使用临时只读本地 HTTP 服务检查 manifest、静态 `./info` 版本和完整资源清单，并按计划设置 `manifest=no-cache`、`remoteEntry=max-age=300`、其余资源 `max-age=31536000, immutable`。17/17 Remote 全部通过，共检查 135 项资源；API 均为 `1.0.0`，runtime 版本与各平台当前 dist 一致。临时服务已关闭。此项覆盖构建产物/校验器链路，不代表上传到实际 CDN 后的响应头验收。
- 补齐 fail-closed 行为回归：新增组合级测试，模拟 `pcUi/info` 网络加载失败，验证 Promise 以明确错误拒绝、失败诊断保留，且在尝试加载领域模块前没有注册任何 Domain Remote。Shell 测试 251 项 / 527 条断言通过，Shell TypeScript 检查通过；这是组合/加载器自动化证据，尚未替代浏览器中的远端故障注入验收。
- 2026-09-29 改造 `genericEquipmentMonitorPages` 的 PC UI 消费：页面库新增 Remote Runtime Common 代理，Vite 精确别名把 `@g2-platform/pc-ui` 运行时导入指向代理；代理模块在求值时通过 `loadRuntimeCommon("pcUi", "index")` 获取公共实现，失败时不回退到本地副本。pc-ui 从运行依赖移到开发依赖并从 Federation `shared` 移除，生产依赖矩阵新增 `genericEquipmentMonitorPages -> pcUi`。构建通过（168 modules），manifest shared 仅 Vue/Vue Router，公共 UI 实现 fallback 产物扫描通过；Runtime Common 矩阵、检查器测试（8 项/13 断言）、页面库测试（33 项/68 断言）、锁文件离线更新及 `git diff --check` 通过。页面库全量 TypeScript 检查仍被既有 Select/业务数据类型问题和 `mf-vite` `.ts` 扩展配置错误阻断。浏览器验收未完成：Vite preview 5051 启动报告端口占用，但本机 HTTP 检查连接失败；未发布、未改生产指针。
- 本地验收闭环 `genericEquipmentMonitorPages`：改用项目 `dev-link` 而非单独 preview，确认页面库 manifest 可用并成功动态注册到已运行 Shell。浏览器打开 `/d/security-monitor/alarmRecord` 后筛选区、表格和真实列表数据（4,275 条）均渲染；点击查询，URL 更新为 `pageNumber=1` 且列表维持；进入首条详情页后报警信息、Tab 和页面操作正常。Runtime Common 诊断面板中 17 个 Provider 全部“已就绪”，`pcUi` 版本 `2026.09.22.1` / API `1.0.0`。运行期间 Vite 捕获到 Shell 侧栏 duplicate-key Vue warning；没有捕获到 Runtime Common 加载失败。浏览器 DevTools Network/Console 未独立检查，因此仍不宣称其零错误。验收所需 `dev-link`/页面库服务仍在运行并已向 Shell 注册，未发布或修改生产指针。
