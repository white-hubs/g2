# 安防监控通用页面复用排查

## 结论

安防监控只复用“通用设备监测/报警”页面的实现，不把通用页面库的路由或菜单接入安防域。安防域继续拥有 `/d/security-monitor/*` 路由、菜单、页面标题、权限映射和 `SECURITY_MONITORING` 业务参数。

## 应复用通用页面库

| 安防入口               | 通用页面 expose        | 原因                                                        |
| ---------------------- | ---------------------- | ----------------------------------------------------------- |
| `alarmPage`            | `AlarmRecord`          | 通用报警记录列表，业务差异由 `applicationCode` 和能力码表达 |
| `alarmDetail`          | `AlarmDetail`          | 通用报警详情                                                |
| `alarm/record`         | `AlarmRecord`          | 报警统计下钻仍是报警记录，查询条件由宿主路由注入            |
| `alarmRulesList`       | `AlarmConfigList`      | 通用报警规则列表                                            |
| `alarmRulesConfig`     | `AlarmConfigureAdd`    | 通用报警规则新增、编辑和复制                                |
| `applicationEquipment` | `ApplicationEquipment` | 通用“应用关联设备”页面                                      |

这些页面现在通过 Shell 的 `DomainContext.loadPageLibrary("genericEquipmentMonitorPages", expose)` 运行时加载，不再静态打包进安防监控或门禁管理产物。

## 必须保留为安防专属页面

| 安防入口                                         | 处理方式                              | 原因                                                                                 |
| ------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `overView`                                       | 保留 `security-overview`              | 统计指标、设备与报警口径属于安防业务                                                 |
| `multipleVideo`                                  | 保留 `multiple-video`                 | 摄像机树、收藏、分屏和实时播放属于视频监控业务                                       |
| `permissions` 及其新增/编辑/详情子路由           | 迁入 `video-monitor-auth` 授权组页面  | 按区域、分组、设备授权给部门、角色、人员，不是旧 `/security/device/auth/*` 关联页    |
| `ai-inspection/plans`、`ai-inspection/tasks`     | 迁入 `video-monitor-auth` AI 巡检页面 | 巡检计划、摄像头算法配置、任务、任务详情和异常事件均属于视频监控服务                 |
| `patrolLine`、`addLine`、`patrolLineDetail`      | 保留巡逻页面                          | 安防巡逻线路业务                                                                     |
| `patrolRecord`、`recordDetail`、`implementPatro` | 保留巡逻页面                          | 巡逻记录与视频巡逻流程                                                               |
| `patrolStatistics`、`patrol/record`              | 保留巡逻页面                          | 安防巡逻统计与下钻                                                                   |
| `alarmStatistics`、`alarmHandelStatistics`       | 暂保留安防统计页                      | 当前通用库的 `AlarmStatistic` 仅是基础分析展示，尚不能覆盖旧安防表格、导出和下钻功能 |
| `safetyAnalysis`                                 | 保留安防分析页                        | 多维安全分析是安防专属业务                                                           |

## 两个子应用复用同一页面时如何区分

- 页面实现：同一个通用 expose，例如 `AlarmRecord`。
- 路由与菜单：分别由门禁域、安防域声明，所以 URL、标题和导航互不影响。
- 数据范围：宿主分别传入 `DOORMANAGE`、`SECURITY_MONITORING` 等 `applicationCode`。
- 页面权限：宿主分别提供自身的 `GemCapabilityCodes` 映射；Shell 注入当前用户真实 `functionCodes`。
- 页面跳转：通用页只发出 `pageKey + params`，由各宿主映射回本域路由。
- 发布版本：具体页面实现来自 Profile 中页面库 manifest，可独立升级或回滚。

## OUAA 实际路径与 G2 路由

OUAA 的 `/portal/*` 是旧 qiankun 地址。迁移后由 `SECURITY_MONITORING` / `video-monitor-auth` 的 `navigateCodes` 识别应用归属，再由 Domain 菜单贡献生成 `/d/security-monitor/*` 路由。

| OUAA 实际入口                                    | G2 路由                                   | 所属实现                     |
| ------------------------------------------------ | ----------------------------------------- | ---------------------------- |
| `/portal/video-monitor-auth/permissions`         | `/d/security-monitor/permissions`         | 本次迁移                     |
| `/portal/video-monitor-auth/ai-inspection/plans` | `/d/security-monitor/ai-inspection/plans` | 本次迁移                     |
| `/portal/video-monitor-auth/ai-inspection/tasks` | `/d/security-monitor/ai-inspection/tasks` | 本次迁移                     |
| `/portal/securityMonitoring/overView`            | `/d/security-monitor/overView`            | 安防专属                     |
| `/portal/securityMonitoring/multipleVideo`       | `/d/security-monitor/multipleVideo`       | 安防专属                     |
| `/portal/securityMonitoring/patrolLine`          | `/d/security-monitor/patrolLine`          | 安防专属                     |
| `/portal/securityMonitoring/patrolRecord`        | `/d/security-monitor/patrolRecord`        | 安防专属                     |
| `/portal/genericEquipmentMonitor/alarmRecord`    | `/d/security-monitor/alarmRecord`         | 通用页面库 `AlarmRecord`     |
| `/portal/securityMonitoring/alarmRulesList`      | `/d/security-monitor/alarmRulesList`      | 通用页面库 `AlarmConfigList` |
| `/portal/securityMonitoring/*Statistics`         | `/d/security-monitor/*Statistics`         | 安防专属                     |

以下 OUAA 菜单不属于安防 Domain 页面代码，仍应由对应业务域迁移，不能复制到安防域：

- `/portal/alarm-center/alarm-handler-sub-config`、`/portal/alarm-center/alarm-event-record`：报警中心。
- `/portal/security-management/monitoring-group`：安防基础配置/监控分组。
- `/portal/legacy-business-config/newMessageNotice`：通用消息配置。
- `/portal/generic-equipment/equipment-association`：新版通用设备应用的设备关联；与旧 GEM `ApplicationEquipment` 不是同一页面。

## 本次纠正

此前 `monitoring` 与 `monitoringNew` 被误接到旧 `/vmonitor/security/*/auth/*` 人员设备关联模型。本次根据真实 OUAA 路径和 `prod/cube/apps/video-monitor` 源码，替换为 `/vmonitor/camera-auths` 授权组模型，并迁入 AI 巡检计划、任务、详情和异常事件；旧 G2 地址仅作为兼容入口保留。
