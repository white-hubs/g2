# 考勤管理迁移对照

旧应用：`ghcloud/prod/cube/business/attendance`。业务代码全部按旧页面、组件和 API 迁入；旧应用基础设施由 G2 DomainContext、正式 Client、pc-ui PageLayout 和 Shell 承接。

- Domain：`attendance`，`/d/attendance`，端口 `5187`。
- Client：`attendanceClient`，端口 `5287`。
- 旧 qiankun 注册名：`attendance`。
- 29 个菜单叶子按提供菜单的原顺序、原分组保留。
- 41 个旧有效路由完整迁移；原未注册的 `attendance-ledger/state.tsx` 补充隐藏路由。
- 保留菜单外规则表单、余额详情、加班/补卡明细、换班台账、统计下钻与流程详情。
- 预统计下钻单独入口，避免错误高亮汇总统计菜单。
- 121 个旧业务 API 全量保留，19 个 Blob 下载/模板和 3 个 multipart 导入沿用旧合同。
- 流程配置、审批记录及流程详情复用 `streamEnginePages`，考勤配置接口为 `/api/attendance/common`。
- 查询缓存统一复用现有 `usePcQueryState` / `usePcForm`：筛选与分页共享查询状态的页面由 `usePcQueryState` 唯一写入 URL，`Page` 仅发出分页事件。

逐页源文件、查询标签、表头、操作和分页盘点见 `apps/domains/attendance/src/migration-inventory.json`；接口 URL、method、参数、响应类型见 `contracts/attendance` 与 `apps/clients/attendance/src/client.ts`。

## 按需开发

先启动 Shell，再执行 `bun run --cwd apps/domains/attendance dev`。默认 `legacy-compat` 模式中，领域未启动时由目标环境 qiankun 承接；领域注册后切换本地 MF，Client 可由 Shell 使用工作区加载。独立 Client Remote、组合和正式发布边界仍保留。

显式配置 `G2_DEV_PROFILE_URL` 时为 `g2-profile` 模式：未覆盖模块保持目标 resolved Profile 来源，不能把该模式与 qiankun 回退混为一谈。此次注册映射不改变已有运行进程；`dev:full` 若需拉起新 Domain/Client 应在适当时机重启。

## 旧应用既有缺口

`staff-change/change-ledger.tsx` 旧源码的查询函数为空、表格数据为占位、导出仅改变 loading，未定义真实台账接口。此次完整保留该隐藏页面及其原逻辑，不自行猜测接口，也不把它计为真实查询/导出已验证。

## 验证记录

浏览器验收按要求安排在代码迁移和静态检查之后。当前状态：代码迁移已落地，浏览器最终验收未完成，不能标记为 DONE。

2026-09-30 首次迁移静态结果：

- Domain、Client、Contract、pc-ui Typecheck：通过。
- Domain、Client Build：通过；Domain 最后一轮构建成功，存在打包体积提示。
- 迁移路由、API 合同、列表查询缓存、表格自定义表头、公共表格、Shell 按需加载和 qiankun 过滤测试：65 通过、0 失败，328 条断言。
- 迁移范围 Oxlint：无错误，保留格式/导入排序等警告。
- 组合校验、Profile 解析、按需启动映射与 `git diff --check`：通过。
- 全仓依赖图检查：45 条其他领域既有违规；本次考勤 Domain/Client/Contract 没有违规。

运行环境观测：

- Shell 使用 `legacy-compat`，后端为 `https://cube-test.guhecloud.com:3000`。
- 本地 Domain 的 `mf-manifest.json` 与 `src/domain.ts` 均返回 HTTP 200；Shell 注册信息确认 attendance 为 `local-remote`，attendanceClient 为 `workspace`。
- 初次打开 Shell 遇到 `@g2-runtime/common-loader` 解析失败。实际链接与源码正确，既有 Vite 进程持有安装前的解析失败缓存。单次触碰配置文件触发 Vite 自身重载后，`compose-from-profile.ts` 返回 200；文件内容未修改，原进程和其他 Remote 注册保留。
- 旧考勤测试页跳转 `/login`，账号和密码均为空，已请求用户完成登录。
- 浏览器连接中断后重新出现，但页面导航及状态获取连续超时；应用内浏览器也未能连接。因此未取得考勤业务页渲染、真实数据响应、交互及 Console 无新增错误的验收证据。

待登录与浏览器连接恢复后：统一验收全部菜单及隐藏入口、查询重置和分页、表单与选择器、流程详情、日历表头和原生滚动，以及目标环境回退；保存、导入等写入操作需使用明确可用的测试数据。原换班台账占位功能不计入真实查询/导出通过项。

### 查询缓存统一复核

- 移除本次迁移新增的公共列表缓存 Hook、导出及配套测试；12 处调用改用原有 `usePcQueryState`。原有 `usePcQueryState`、`usePcForm` 和 `form-query-cache` 实现没有修改。
- 20 处使用共享查询状态的页面/组件统一关闭 `Page` 自行读写 URL，避免重复回填和重复请求；其余使用公共表单缓存与分页缓存的页面保持原有接入方式。
- 日期数组只在对应字段解析，汇总统计的逗号日期字符串保持字符串，长 ID 保持字符串。补卡明细与统计下钻返回时恢复缓存分页，并保留深链业务参数。
- Domain / pc-ui Typecheck、Domain Build、`git diff --check`：通过。相关范围 Lint 无错误，存在已有导入排序等警告。
- 公共查询状态、公共表单、考勤路由及 Client 测试：25 通过、0 失败、269 条断言。真实 Vue Router 的内存历史测试覆盖筛选、分页、详情往返、重置、日期数组及长 ID。
- 浏览器已在登录状态打开本地班次管理及操作日志页；操作日志筛选“班次”后 URL 正确保存 `keyword`，初次列表请求 `/api/attendance/attendanceLog/page` 返回 200，本次操作时 Console 无新增错误。
- 刷新后回填、重置和详情往返的浏览器验收未完成：浏览器连接连续超时，新建同一筛选深链页面显示 `bootstrap timeout after 25015ms: composeFromProfile`，进一步网络检查时连接再次超时。此项为运行环境阻塞，不记为浏览器通过。

### 操作列权限修复复核

- 旧壳 `legacy/bimops-fe-web-migrate/src/views/platform/home.vue` 从 `/api/ouaa/user-permissions` 筛选 `type === "FUNCATION"`；旧公共权限包读取这些项的 `code`。G2 Shell 原实现误读菜单使用的 `functionCode`，会丢失用户实际获授的功能权限，使考勤操作按钮全部隐藏。
- Shell 改为提取已授权项的 `code`，保留原有权限类型筛选；考勤按钮、业务处理函数及权限码不变。
- 权限字段、无授权拒绝、异步授权后响应式更新与菜单权限回归：10 个测试通过、0 失败、21 条断言。Shell Typecheck、Build、`git diff --check` 通过；相关 Lint 无错误，Shell 原文件存在既有警告。
- 最后阶段浏览器验收仍受阻：本地班次页显示 `bootstrap timeout after 28596ms: composeFromProfile`，Network 调试连接超时，后续浏览器清单中 Chrome 连接消失。尚未取得修复后操作按钮显示、编辑弹窗及真实权限响应的浏览器通过证据，不能标记为 DONE。

### 法定节假日弹窗样式复核

- 对照用户提供的旧版截图和旧 cube-ui Modal 默认值，将弹窗恢复为 800px 宽、居中；仅在 `attendance-holiday-modal` 范围恢复白底、60px 日历行、浅蓝选中背景，并隐藏旧版未展示的月/年模式切换。保留原生年、月选择器与节假日查询逻辑。
- Domain Typecheck、Build、相关 Lint、`git diff --check` 通过；Domain/Client 现有测试 18 通过、0 失败、254 条断言。
- 实际访问 `/d/attendance/scheduling-rules-form?id=2063863118892195842&action=edit`，验收会话中的 `#app` 仍为空；刷新及新建验收页时 Chrome 导航/调试连续超时。尚未完成修改后弹窗视觉及月份切换的浏览器验收，不计为通过。
