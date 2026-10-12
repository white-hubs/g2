# 安全信用与电气安全迁移验收记录

验证日期：2026-09-21。环境：本地 Shell `localhost:5100`，旧网关 test 环境，使用当前已登录会话。

## 发布与运行边界

| 应用     | Domain                         | Client                         | 本地端口（Domain / Client） |
| -------- | ------------------------------ | ------------------------------ | --------------------------- |
| 安全信用 | `@g2-domain/safety-credit`     | `@g2-client/safety-credit`     | 5099 / 5103                 |
| 电气安全 | `@g2-domain/electrical-safety` | `@g2-client/electrical-safety` | 5102 / 5104                 |

- 两个应用分别有 Domain、Client、Contract；注册到 Composition、开发 registry、按需启动筛选、Shell 本地映射和正式 release-set。
- 本地菜单保留用户提供的完整层级与数组顺序；菜单及路由覆盖有自动化断言。
- 业务请求使用原服务真实路径，不将旧接口虚构为 BFF。安全信用使用 `/api/safety-credit`、`/api/ouaa`；电气安全保留 `/api/electrical-management`、`/api/securitymanagement`、公共设备/报警 Client 和 `/scada/api/pages`。
- 公共报警页面通过正式 Page Library 加载；同一旧报警路由在不同菜单下保持各自的标题和返回入口。
- 未提交代码、未推送、未更改测试账号和权限；未执行真实设备控制或删除操作。

## 安全信用页面对照

下列路径统一加 `/d/safety-credit/`；旧原生路径前缀为 `/portal/safety-credit/`。

| 菜单顺序                | 路径                  | 本轮浏览器证据                                              |
| ----------------------- | --------------------- | ----------------------------------------------------------- |
| 商户管理                | merchants             | 8 条真实记录；无匹配查询为 0、重置恢复 8；新增弹窗打开/关闭 |
| 评分模型 / 数据源配置   | data-sources          | 3 条记录；新增弹窗可加载真实上游应用选项                    |
| 评分模型 / 评分权重配置 | score-models          | 6 条记录；新增表单、事件权重加载；未保存                    |
| 评分模型 / 模型版本管理 | score-models/versions | 从模型进入历史版本并读到版本数据                            |
| 评分模型 / 评分日志     | score-logs            | 真实列表数据与分页                                          |
| 行为采集 / 行为记录     | behaviors             | 11 条记录                                                   |
| 行为采集 / 行为审核     | behavior-audits       | 1 条待审核数据；未执行审核                                  |
| 自查管理 / 自查清单     | checklists            | 19 条记录                                                   |
| 自查管理 / 自查处理     | check-processing      | 商户选择后读取当前清单；显示 3 个检查项、备注、照片和进度   |
| 自查管理 / 自查质检     | check-quality         | 15 条记录                                                   |
| 自查管理 / 自查统计     | check-statistics      | 15 条统计数据                                               |
| 评分公示 / 评分排名看板 | rankings              | 8 条排名数据                                                |
| 评分公示 / 公示配置     | publicity-config      | 使用已有园区读取配置，接口 200，四个展示选项回显            |
| 权益联动 / 权益规则配置 | benefit-rules         | 6 条规则                                                    |
| 权益联动 / 权益生效记录 | benefit-records       | 5 条记录                                                    |
| 信用档案                | archives              | 8 条档案；打开隐藏详情路由读取完整详情                      |

所有主列表保留原查询项、列、行操作和弹窗，使用 PC 公共表单/表格及 footer 分页。导入使用公共 Upload 和 multipart Client；模板保留 Blob 下载。

## 电气安全页面对照

下列新路径统一加 `/d/electrical-safety/`。旧原生路径为 `/portal/electrical-safety/`，复用的旧跨应用入口在备注说明。

| 菜单顺序              | 新路径                   | 本轮浏览器证据                                                                     |
| --------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| 实时检测 / 电气中心   | electrical-center        | 安全评分 35、在线率 80%、设备 4/5、报警 3；真实组态绑定                            |
| 实时检测 / 设备检测   | device-monitoring        | 设施切换、组态背景、2 个设备、设备详情及真实 AI 分析                               |
| 实时检测 / 深度分析   | deep-analysis            | 保留旧演示诊断页，明确标注演示；查询从 4 条筛到 1 条，重置恢复                     |
| 资产管理 / 设施管理   | facility-management      | 4 条设施记录                                                                       |
| 报警管理 / 设备关联   | application-equipment    | 2 条关联设备；原 genericEquipmentMonitor/applicationEquipment                      |
| 报警管理 / 报警记录   | alarm-record             | 3 条报警；原 genericEquipmentMonitor/alarmRecord                                   |
| 报警管理 / 告警规则   | alarm-config             | 1 条真实规则；原 genericEquipmentMonitor/alarmConfigList                           |
| 报警管理 / 消息配置   | message-notice           | 实际保存的规则、站内及应用通知方式加载；原 legacy-business-config/newMessageNotice |
| 基础配置 / 拓扑图配置 | topology-editor          | 真实节点及连线渲染；原 graphEditor/editor                                          |
| 基础配置 / 远检配置   | remote-inspection-config | 2 个模板                                                                           |
| 远检查看 / 远检查看   | remote-inspection-view   | 动态分组列；154 条真实数据、每页 10 条；翻页和刷新保持第二页                       |
| 线损管理              | line-loss                | 真实拓扑可视化；原 graphEditor/lineLoss                                            |
| 线损预警 / 预警规则   | line-loss-warning-config | 1 条真实规则，打开详情后返回本菜单；原 iot-center/alarmConfigList                  |
| 线损预警 / 预警列表   | line-loss-warning-list   | 3 条报警；原菜单同样指向 genericEquipmentMonitor/alarmRecord                       |
| 业务配置 / 采集周期   | collection-cycle         | 读取实际配置时间 09:55；未保存                                                     |
| 数据统计 / 采集记录   | collection-record        | 设备选择后向 lineLoss/read/page 传设备 ID 集合，接口 200；所选设备返回 0 条        |
| 数据统计 / 损耗统计   | loss-statistics          | 首次查询默认日期有效；真实总数 108828、当前页 10 条                                |

## 迁移中修正的运行问题

- 原生日期组件适配公共 DateRangePicker 的 `valueFormat`，修正 `date1.isAfter is not a function`。
- 远检旧接口只返回 `headers/records`、忽略分页参数；Client 对无 `total` 的完整集合执行分页，服务端分页结果不再切片。
- 线损统计首次请求补齐原服务必需的起止时间；移除接口错误时伪造记录的降级逻辑。
- 线损预警规则接回对应的完整规则页面，详情/编辑返回保留菜单上下文。
- 组态 API 移入 Client；图编辑器从平台占位入口切换到正式 X6 实现，适配插件、类型和设备 Client 注入。
- 动态查询字段更新保留用户输入；错误响应无论是否包裹 `data` 都会抛错，不误报成功。
- 线损导出原本是空实现，现按真实统计分页生成 CSV，中文编码、引号和公式转义有测试。未对十万条测试数据执行全量下载。

## 验证范围与限制

- 自动化测试：107 PASS / 0 FAIL（安全信用 Domain 3、Client 5；电气安全 Domain 45、Client 7；pc-ui 32；pc-scada 15）。
- 7 个相关包的 typecheck/build：PASS；Composition 和依赖规则校验：PASS；`git diff --check`：PASS，未发现未合并文件。
- 迁移及相关公共组件的 Oxlint：0 error，仍有导入排序等风格 warning；构建仍有大型 chunk 提示，未关闭检查来掩盖警告。
- 浏览器已覆盖全部菜单入口及上表交互；修复后未观察到新增的领域运行错误。
- Shell 的旧菜单重复 key 警告仍存在，位于未修改的旧应用菜单数据链路；不是两个新菜单的 key。
- 全仓 `check:forbidden-files` 被四个既存文件阻塞：`safety-duty/tests/ui/fixtures.mjs`、`pc-visual-sdk` 两个 JS 文件和 Shell `public/cube-icon/iconfont.js`。本次新增目录没有 JS/Vue/compat 违规文件。
- 未执行真实新增、删除、审核、上传、保存配置、设备控制等会改变测试环境数据的动作；请求方法/参数做 Client 测试，表单与读取流程做浏览器验证。不能把这部分描述为真实写入验收通过。
- 深度分析页原源码没有后端诊断列表接口，仍为已标识的演示内容；设备详情 AI 分析使用真实接口。这不是已接入的实时诊断汇总服务。
