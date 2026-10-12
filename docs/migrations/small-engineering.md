# 小散工程迁移记录

## 范围与基线

- 旧应用：`/Users/Admin/workCopy/ghcloud/prod/cube/business/small-engineering`。
- 菜单基线：本次用户提供的菜单 JSON，包含 17 个小散工程入口及 10 个 DAILY 入口。
- Domain：`@g2-domain/small-engineering`，logicalName `smallEngineering`，basePath `/d/small-engineering`，端口 5125。
- Client：`@g2-client/small-engineering`，logicalName `smallEngineeringClient`，端口 5126。
- 旧注册名 `small-engineering`，应用编码保留旧拼写 `SMALLENFINEERING`。
- 共享依赖：dailyInspectionClient、streamEngineClient、ouaaClient、fileClient、messageClient、pcUi、streamEnginePages；DAILY 页面由 dailyTask Domain 承接。

## 页面对照

下表记录已实现范围，浏览器验收均待恢复连接后执行；代码对照不代表运行验收通过。

| 入口 | 已实现的旧页能力 |
| --- | --- |
| 工程管理 | 六种阶段统计与切换、日期/关键词查询、动态列、分页、全量 Excel 导出、工程详情 |
| 工程请示 / 工程审批 | 待办/发起/抄送/全部范围、发起时间、分页、权限控制、流程新增/详情 |
| 工程监管 | 状态/部门/类型/时间/关键词查询、分页、Excel 导出、新增/编辑/删除、反馈/验收、创建巡检 |
| 工程监管详情 | 工程信息、附件、反馈记录、验收记录、巡查记录统计及分页、整改记录分页、所属记录详情 |
| 工程整改 | 范围/时间查询、分页、流程新增/详情 |
| 巡查计划 | 状态/类型/关键词查询、分页、启停确认、详情/编辑/复制/删除 |
| 巡查计划表单 | 负责人/部门/岗位/角色、时间、任务时限、扫码巡查、预设及自定义周期、名称查重、巡检对象与内容 |
| 巡查任务 | 状态/类型/时间/关键词查询、分页、新增、停止、详情 |
| 巡查任务详情 | 基础信息、巡检内容、任务执行进度、对象统计、巡检结果及记录跳转 |
| 巡查记录 | 结果/时间/关键词查询、分页、标准/巡检项/结果/图片、所属任务及计划跳转 |
| 临时巡查记录 | 时间/关键词查询、分页、详情和图片 |
| 工程类型 / 巡检类型 | 列表、分页、新增/编辑/删除 |
| 巡检周期 | 列表、分页、名称/表达式/说明、新增/编辑/删除及批量删除 |
| 巡检结果 | 列表、分页、启用状态、结果项名称/值/异常标识、新增/编辑/删除 |
| 巡检项 | 列表、分页、名称、动态内容、结果/默认值/照片/备注/标签、逐行编辑保存 |
| 巡检标准 | 工程类型树、关联标准、默认标准开关、分页、新增/编辑/详情、调用巡检项 |
| 流程配置 | 共享 ApprovalConfig 页面，真实前缀 `/api/loose-works/project` |
| 消息配置 | 四场景分别按 label 读取、通知方式、失效时间、巡检类型与通知人员、统一保存、失败禁止覆盖 |
| DAILY 菜单 | 计划、任务、草稿、类型、紧急等级、周期、标准、标准项、结果、消息配置，保留 `dailyType=DAILY_SMALL_INSPECTION` |

## 接口与组合

- 小散工程业务 API 使用 `/api/loose-works`；共享巡检使用 `/api/maintain`；流程使用 `/api/flow`；消息配置使用 `/api/bracing/message`。
- 保留旧 HTTP 动词、分页参数、流程业务类型及消息 label。
- 共享巡检 Client 增加完整任务执行进度返回，以及标准/配置接口的可选 businessType；原调用不传参时行为不变。
- Domain 与 Client 已加入生产 Composition、开发 registry、dev-filter、Shell 本地映射和 release set。
- 隐藏路由均声明 hideInMenu 与 activeMenuPath；DAILY 入口指向共享领域。
- 无旧 cube 组件或 compat 引入；表格使用 usePcTable，分页/表单按钮由 PageLayout footer 承载。

## 2026-09-29 验证记录

### 已执行

- 小散工程 Domain：typecheck、build、菜单契约 test 通过。
- 小散工程 Client：typecheck、build、URL 与载荷 test 通过。
- 共享巡检 Client：typecheck、8 项 test 通过，包含 businessType 隔离及任务进度完整返回断言。
- Shell typecheck、Composition validate、dev-filter 10 项测试、依赖白名单检查通过。
- 新增 Domain/Client 的 oxlint 无错误；有既有风格规则级 warning。`git diff --check` 通过。
- `check:deps-graph` 使用 Node 20 执行；全仓仍有既有领域的第三方组件依赖违规，不能记为通过。小散工程没有该检查新增违规。
- 本地 Shell 注册查询：legacy-compat / test；API target 为 `https://cube-test.guhecloud.com:3000`。
- 未启动小散工程时来源为 target-environment；启动构建预览后 Domain 与 Client 均为 local-remote，manifest 分别位于 5125、5126。
- 续查共享依赖：daily-inspection、stream-engine、file、ouaa、message Client 的 Shell `/@fs` 模块均为 HTTP 200 JavaScript；未启动的 workspace Client 不以独立端口可达性判定失败。
- 既有 5107 流程页面库服务的 manifest 请求返回 HTML。保留该用户进程，为验收另行构建并启动 5207 页面库预览；同时构建并启动 5064 dailyTask 预览。两者使用本地 Remote 注册，供流程页面和 10 个 DAILY 入口验收。
- 依赖预览启动后，smallEngineering、smallEngineeringClient、dailyTask、streamEnginePages 均为 local-remote，四份 manifest 均 HTTP 200，名称及 exposes 正确。

### 未通过 / 未完成

- Chrome 在验收过程中断开；随后浏览器工具没有可用 Chrome，内置浏览器也等待挂载超时，最后返回 `User unavailable`。
- 继续执行时再次获取浏览器清单，仍为 `apps: []`、`browsers: []` 和 `Browsers: Error: User unavailable`，没有恢复可操作会话。
- 断开前只验证了已登录 Shell 和旧菜单可显示；旧应用主体未形成可用页面，不能将此记为回退验收通过。
- 迁移后的逐菜单浏览器验收、真实业务 Network/Console、详情侧栏高亮、查询/分页/滚动和邻近交互仍未完成。
- 未执行真实业务保存/删除/上传，以及通知消息发送。

## 恢复后的验收顺序

1. 恢复已登录浏览器连接，打开 `http://localhost:5100/d/small-engineering/manage`。
2. 检查 Domain/Client manifest、业务 URL、状态码、响应结构和 Console。
3. 完整走查 17 个入口，再通过已启动的共享 dailyTask 领域检查 10 个 DAILY 入口。
4. 检查查询/重置、分页、固定 footer、原生表格横滚、Shell 四边与 PageLayout 左右 16px 留白。
5. 覆盖列表到详情/编辑、隐藏路由深链、侧栏高亮、巡检内容弹窗、消息场景切换。
6. 如需修正，集中修改并重建后重新验收；验收期间使用构建预览避免 HMR 打断。
7. 注销本次 Remote 后检查目标环境回退，再恢复本地入口。

目前状态：实现与静态验证已推进，浏览器验收受连接阻塞，尚未达到迁移完成条件。
