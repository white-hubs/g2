# 安全教育迁移盘点与验收

## 项目边界

用户已确认普通安全教育与安全教育总部来自同一项目：
`ghcloud/prod/cube/apps/secure-edu/app`。不是复制两套公共页面。

- 普通入口：`secureEdu`，`/d/secure-edu`，开发端口 5141。
- 总部入口：`secureEduHead`，`/d/secure-edu-head`，开发端口 5094。
- 正式共享页面库：`secureEduPages`（`@g2-pages/secure-edu`），端口 5142。
- 两个入口共用 `secureEduClient`。共享统计、课件、题库、试卷、规则、主题及其编辑页。
- 总部培训/考试任务、总部记录与链接保留总部接口和原菜单；任务试卷详情明确走
  `/api/safety-education/headquarters/exam-task/{id}/paper/{paperId}`。
- Page Library 不拥有路由和菜单；隐藏路由由宿主声明 `activeMenuPath`，返回按钮在 footer 右侧。
- UI、日期与图表从 Runtime Common 加载，无旧 Cube/compat 组件依赖。
- 二维码依赖本次新增的 `pcUi/index.generateQrCode` 公共能力；发布消费者前须同步发布
  本次 pc-ui 产物，不能继续指向不包含该导出的旧公共模块。本次只做本地迁移与验收，未发布或切换生产指针。

## 普通入口菜单（附件稳定顺序）

| 顺序 | 分组     | 页面         | 入口                | 对照与保留能力                                                         |
| ---- | -------- | ------------ | ------------------- | ---------------------------------------------------------------------- |
| 1    | —        | 数据总览     | over-view           | header 时间区间，五项指标，类型/主题环图，出勤柱图，年度趋势折线       |
| 2    | 安全培训 | 培训任务     | training-task       | 原查询、列、状态操作，负责人/人员、培训课件、关联考试、二维码、分享    |
| 3    | 安全培训 | 培训统计     | training-count      | 原统计列、日期/主题/关键词，人员和关联考试明细、导出                   |
| 4    | 安全考试 | 考试任务     | exam-task           | 原查询、列、统一/随机组题、人员、限时/复考、任务试卷详情、二维码、分享 |
| 5    | 安全考试 | 试卷管理     | test-paper-manage   | 大题管理、跨页选题、新增/编辑选项答案、总分和及格分校验                |
| 6    | 安全考试 | 考试统计     | exam-count          | 原部门/类型/时间/关键词，成绩与缺考明细、导出                          |
| 7    | 系统配置 | 试卷考题规则 | paper-question-rule | 原 sort=0；三种题型、主题、抽题数、每题分数、及格分                    |
| 8    | 系统配置 | 课件库       | courseware          | 附件、大小、时长、详情/编辑、正式场景上传与文件持久化                  |
| 9    | 系统配置 | 考题库       | question            | 主题/题型查询，选项和答案，模板/导入/失败明细导出                      |
| 10   | 系统配置 | 主题管理     | theme               | 列表、新增/编辑/删除、即时弹窗与中文确认                               |
| 11   | —        | 消息配置     | message             | 培训/考试卡片页签、人员/负责人、四渠道、固定中文通知说明、失败提示/重试 |

各页字段、列顺序、查询参数与原接口路径的执行清单分别位于：
`apps/page-libraries/secure-edu/src/config.ts`、
`apps/page-libraries/secure-edu/src/model.ts` 的 `saveCommand`、
`apps/clients/secure-edu/src/market.ts`。
共享编辑器提交 DTO 白名单，避免详情 VOs 或其他表单的默认字段混入保存请求。

## 开发启动

已有 Shell 时启动普通入口：`bun run --filter @g2-domain/secure-edu-market dev`。
总部入口使用 `bun run --filter @g2-domain/secure-edu dev`。

仅 Shell + Domain 时，正式 Client/Page Library 使用开发期 workspace 源码回退。
注册对应 Remote 后，优先加载 Remote；生产构建无源码回退。
同一个旧 qiankun 宿主承载普通/总部模式，只有两个本地入口都注册后才移除旧宿主。
未启动的一侧继续使用测试环境旧入口。

## 2026-10-08 浏览器验收记录

测试环境：Shell `http://localhost:5100`，上游 `cube-test.guhecloud.com:3000`。

- 普通 11 个菜单均实际访问。
- 培训任务 89 条，关键词查询/重置回归；详情的时间、主题、负责人回填，侧栏保持展开。
- 培训统计 84 条，已从人数进入人员明细并返回。
- 考试任务 74 条，详情人员及任务试卷内容、选项、答案实际加载。
- 考试统计 61 条，缺考明细 10 条实际加载并返回。
- 试卷 10 条，题库 56 条：跨页选中两题，大题回填且总分为 10。
  弹窗表格改用公共 `autoScrollY=false/scrollY`，分页不再被背景整页的高度覆盖。
- 随机规则 4 条，主题、数量、每题分数回填；示例规则总分 37、及格分 20。
- 课件 3 条、主题 5 条，编辑回填及主题弹窗实际检查。
- 总部课件列表和编辑使用同样 3 条真实记录；返回路径保留总部入口。
- 年度总览真实统计、类型环图、出勤柱图、年度折线已渲染；时间筛选固定在 header。
- 培训二维码生成真实 PNG 已显示。
- 关闭独立 Client/Page Library 进程后，只保留 Shell + 普通入口仍成功打开页面。
- 最后一次培训详情 → 返回列表 → 年度总览回归，Console 无新增相关 error/warning。
- 消息通知补充对齐：页面标题、卡片页签、培训/考试负责人标题及三行说明恢复原页；
  移除原页不存在的启用开关、有效天数和模板编辑器，仅通知方式可编辑。
  培训/考试切换实际检查，两组规则由 482px 高缩为 140px，当前视口内均可见；
  保存用模板及服务器元数据保留，不因只读中文说明而覆盖。新增规则不伪造启用状态或有效天数。

## 验证及未完成项

- 相关 Domain、Page Library、Client、pc-ui、Shell Typecheck 与生产 Build 通过。
- 领域/Client/模型/按需加载等 82 项单元测试通过；BFF 文件流和 multipart 等 4 项集成测试通过。
- 本次三个消费单元的 Runtime Common 产物和页面库架构检查通过。
- `git diff --check`、Composition 校验通过；oxlint 无错误，仍有导入排序等警告。
- 仓库全量 Runtime Common/Profile 和 Page Library 检查存在其他已迁域的既有错误；
  本次不修改无关领域，不将全量检查记录为通过。

**消息配置当前被上游阻塞，不可登记为完整迁移通过：**
正式认证请求 `GET /api/message/sat-msg-configs?satMsgDefineCodes=EXAM_TASK_PUBLISHED%2CCULTIVATE_TASK_PUBLISHED` 返回
`404 NOT_FOUND "No static resource message/sat-msg-configs."`。
原源码使用 `/api/message/sat-msg-configs/`，相同功能的既有 G2 Client 使用无尾斜杠版本；
两种版本本次均出现 404。没有依据把旧 DTO 换成其他消息服务的新 DTO。
页面保留中文失败提示与重试，并禁止把未加载的默认规则覆盖到服务器。
需要上游恢复原接口或提供替代契约后，继续核验读取/保存。

以下操作未修改测试环境真实业务数据，不能宣称已经端到端通过：
新增/修改保存、发布/撤回、删除、真实文件上传/Excel 导入。
它们的接口、DTO 和校验已有代码/单测证据；浏览器本次只验收打开、选择、回填、取消。
模板下载在内嵌浏览器未收到 download 事件，尚未确认最终文件落盘。
总部测试租户任务列表为空，任务试卷专用接口已有 Client URL 单测，未用真实总部任务验证。
