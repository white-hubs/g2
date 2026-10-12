# 自定义主题：硬编码颜色例外登记册

> 状态：`生效`
> 关联阶段：P0.3、P3、P4
> 维护规则：静态扫描默认禁止业务 UI 中的通用硬编码颜色。任何例外必须逐文件登记；禁止目录、应用或通配符豁免。

## 1. 登记字段与审批规则

| 字段 | 要求 |
|---|---|
| 文件 | 精确仓库相对路径，不允许 `**` 或整个目录 |
| 颜色/模式 | 精确色值或受限表达式 |
| 用途 | 说明其表达的业务、图表或外部资产语义 |
| 分类 | `品牌资产`、`图表序列`、`图编辑器`、`地图/视频`、`固定业务状态` |
| 替代 Token | 若未来可迁移，记录目标；永久例外写 `不适用` |
| 负责人 | 领域负责人角色或具体人员 |
| 复核日期 | 每次主题规则升级或至少每半年复核 |

固定业务状态色不豁免主题语义规则：它们应优先引用固定 `--g2-color-success`、`--g2-color-warning`、`--g2-color-danger` 或 `--g2-color-alarm-level-*`，而不是在业务页面重复书写色值。

## 2. 初始登记项

| 文件 | 颜色/模式 | 用途 | 分类 | 替代 Token | 负责人 | 复核日期 | 状态 |
|---|---|---|---|---|---|---|---|
| `apps/platforms/pc-graph-editor/src/electrical/components/electrical-element-lib.tsx` | `#5f95ff`、`#333333` 等元件图色 | 电气元件、端点与连线的图编辑语义 | 图编辑器 | 不适用，后续可评估 `graph*` | 图编辑器领域负责人 | 2027-03-16 | 待领域复核 |
| `apps/domains/workbench/src/components/icon/svg-icon.tsx` | SVG 内固有色 | 图标/品牌资产绘制 | 品牌资产 | 不适用 | 工作台领域负责人 | 2027-03-16 | 待领域复核 |
| `apps/domains/hazard-governance/src/views/hazard/dashboard/components.tsx` | ECharts 渐变与序列色 | 数据系列区分 | 图表序列 | 后续 `chartSeries*` | 隐患治理领域负责人 | 2027-03-16 | 待领域复核 |
| `apps/domains/energy-consumption/src/components/echart/e-pie.tsx` | `#fff`（`series.itemStyle.borderColor`） | 饼图扇区描边，保证数据扇区可分辨 | 图表序列 | 后续 `chartSeriesBorder` | 能耗领域负责人 | 2027-03-16 | 待领域复核 |
| `apps/domains/energy-consumption/src/components/echart/e-sankey.tsx` | `#fbb4ae`、`#b3cde3`、`#ccebc5`、`#decbe4`（`series.data[].itemStyle.color`） | 能流桑基图节点数据系列区分 | 图表序列 | 后续 `chartSeries*` | 能耗领域负责人 | 2027-03-16 | 待领域复核 |
| `apps/domains/daily-inspection/src/views/inspect-config/inspect-map-config/inspect-map-runtime.ts` | AMap 底图及覆盖物颜色 | 第三方地图视觉与定位 | 地图/视频 | 底图不适用；覆盖物待评估 | 日常巡检领域负责人 | 2027-03-16 | 待领域复核 |
| `apps/page-libraries/generic-equipment-monitor/src/pages/configuration.tsx` | iframe 内容 | 外部组态页面 | 地图/视频 | 不适用；P5 处理消息桥接 | 设备监控领域负责人 | 2027-03-16 | 待领域复核 |

> 本登记册的文件路径和色值均为精确记录；它们可作为后续扫描工具的候选白名单输入，但在领域负责人复核前不得自动写入 CI 豁免配置。`roll-table.less` 等普通 UI 颜色不属于例外，P3/P4 必须迁移到主题 Token。

## 3. 不允许作为例外的常见情况

| 错误写法 | 正确做法 |
|---|---|
| 卡片 `background: #fff` | `background: var(--g2-color-surface-bg)` |
| 普通标题 `color: #333` | `color: var(--g2-color-text)` |
| 输入框 `border: 1px solid #d9d9d9` | 使用 `var(--g2-color-border)` |
| 按钮 `background: #1677ff` | 使用 `var(--g2-color-primary)` |
| 失败标签 `color: #ff4d4f` | 使用固定 `var(--g2-color-danger)` |

## 4. 变更记录

| 日期 | 变更 | 原因 | 执行者 |
|---|---|---|---|
| 2026-09-16 | 创建初始例外登记册 | P0 颜色扫描与 A5 审核结论 | Codex |
