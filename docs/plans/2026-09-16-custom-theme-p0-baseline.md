# 自定义主题系统 P0：基线盘点与契约草案

> 状态：`已完成并冻结`
> 关联台账：[长期执行与验收台账](./2026-09-16-custom-theme-system-execution-plan.md)
> 扫描日期：2026-09-16
> 扫描范围：`apps/**/*.{css,less,scss,ts,tsx,vue}`；不含 `node_modules`、构建产物和文档原型。

## 1. 可复现基线

本次使用以下命令盘点颜色字面量：

```bash
rg --no-filename -o -i '#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)' \
  apps --glob '*.{css,less,scss,ts,tsx,vue}'
```

结果：**347 个文件、3,436 处颜色字面量**。该数字包含测试代码、图表调色板、Logo/SVG、业务告警色和普通 UI 色，因此不能将其直接作为“待替换数量”。后续静态规则应排除测试、生成物及经审核白名单项。

### 1.1 高频颜色与初始归类

| 色值 | 次数 | 初始归类 | 建议 Token | 是否需人工审核 |
|---|---:|---|---|---|
| `#fff` / `#ffffff` | 416 | 容器、输入框、表格行、弹窗、主色按钮文字混用 | `surfaceBg`、`elevatedBg`、`inputBg`、`tableRowBg`、`textOnPrimary` | 是，禁止全局替换 |
| `#1890ff` / `#1677ff` / `#1578ff` | 179 | 当前/历史主色、链接、焦点 | `primary`、`link`、`focusRing` | 否，按用途拆分 |
| `#edf0f5` / `#f0f0f0` / `#e5e7eb` | 191 | 页面浅底、表头、边框、分割线混用 | `pageBg`、`tableHeaderBg`、`borderSecondary`、`fillSecondary` | 是，按组件确认 |
| `#6b7280` / `#666` / `#999` / `#8c8c8c` | 190 | 次级文字、占位符、图表坐标文字混用 | `textSecondary`、`textTertiary`、`placeholder`、`chartText` | 是，图表独立 |
| `#1f2937` / `#111827` / `#333` | 122 | 主文字、标题、图编辑器文字混用 | `text`、`textHeading`、`graphText` | 是 |
| `#ff4d4f` / `#f53f3f` / `#ef4444` | 89 | 失败、删除、一级告警混用 | `danger`、`alarmLevel1` | 是，业务定义 |
| `#00ba8b` / `#52c41a` / `#10b981` | 58 | 成功、在线、正常状态混用 | `success`、`statusNormal` | 是，业务定义 |
| `#fa8c16` / `#fba33f` / `#d97706` | 47 | 警告、处理中、二级告警混用 | `warning`、`alarmLevel2` | 是，业务定义 |
| `#3662ec` / `#3b82f6` / `#5f95ff` | 78 | 信息色、图表、图编辑器元素混用 | `info`、`chartSeries*`、`graph*` | 是，不能归入主色 |
| `rgba(0, 0, 0, 0.85)` / `.88` / `.45` | 84 | 主文字、遮罩、弱文字混用 | `text`、`maskBg`、`textTertiary` | 是，按用途确认 |

### 1.2 优先迁移热点

按包含颜色字面量的文件数排序，首批全域迁移的热点为：

1. `energy-consumption`：39 个文件；图表较多，应在 P4 的特殊渲染工作流中处理。
2. `risk-graded-control`：33 个文件；包含地图/风险编辑器，需要独立白名单。
3. `generic-equipment-monitor`：28 个文件；属于 P3 试点范围。
4. `pc-graph-editor`：26 个文件；图形元素颜色不得机械主题化。
5. `workbench`：26 个文件；包含 SVG 图标和业务卡片。
6. `emergency-dispatch`：24 个文件；有地图相关样式。
7. `daily-inspection`：21 个文件；包含 AMap。

## 2. 现有能力盘点

### 2.1 已可复用

| 能力 | 当前实现 | 结论 |
|---|---|---|
| 主色预设 | `pc-chrome/src/skin-theme.ts` 的 4 个 `SKIN_PRESETS` | 可兼容迁移为内置 `UserTheme` 记录 |
| CSS 变量写入 | `buildSkinThemeCss()` 写入 `--g2-color-primary`、`--ant-*`、`--cube-theme-var--primary-*` | 可扩展为完整语义 Token |
| Ant Design 3 兼容 | `skin-theme-vars.ts` 生成完整 primary 色板及桥接样式 | 必须保留，不能只迁移 Ant Design 4 |
| Ant Design 4 主色 | `ZhConfigProvider` 订阅 `useSkinPrimaryColor()` 并写 `colorPrimary` | 需扩展为完整 AntD Token 映射 |
| 本地恢复 | `g2-pc-skin`、`skinColor` localStorage | 可作为 P1 首屏缓存回退 |
| MF 主色事件 | `mf-root-change-skin` 和事件总线 | 需替换/扩展为完整 `g2:theme-change` 主题对象 |

### 2.2 P1 必须补齐的缺口

- 当前 `SkinPreset` 仅保存主色；没有亮/暗基底、文字、表面、边框或状态色。
- `ZhConfigProvider` 目前只传入 `colorPrimary`，其余组件 Token 不随主题变化。
- 注入的兼容 CSS 含大量 `!important` 主色桥接；它应继续作为遗留兜底，而不是通用组件的长期主题实现。
- 当前 iframe 只取第一个 iframe，向 `"*"` 发送 `{ type: "clickSkin" }`；P5 前不得扩展此路径。

## 3. 特殊运行时与安全风险清单

| 类别 | 已发现位置 | P0 分类 | 后续处理 |
|---|---|---|---|
| ECharts 平台封装 | `apps/platforms/pc-chart/src/chart.ts` | 图表运行时 | P3/P4 增加主题订阅和 option 重绘 |
| 领域 ECharts | `energy-consumption`、`hazard-governance`、`security-monitor` | 图表/业务调色板 | 常规文字/网格用 Token；序列和告警色须审核 |
| AMap | `daily-inspection` | 第三方地图 | 底图不主题化；覆盖物颜色纳入白名单审核 |
| SCADA iframe | `pc-scada` | iframe | P5 改为可信 origin + 完整主题消息 |
| 设备配置/SCADA iframe | `generic-equipment-monitor` | iframe | P5 盘点其来源和消息接收能力 |
| 告警弹窗 iframe | `pc-alarm-popup` | iframe | P5 合并来源校验方案 |

已发现使用 `postMessage(..., "*")` 的路径包括 `pc-chrome`、`pc-scada`、`pc-alarm-popup`。此项是安全审核门 A7 的明确输入，当前不得由主题功能自行扩大消息权限。

## 4. ThemeTokens v1 草案

以下为已冻结、将在 P1 实现的最小契约。

```ts
export interface ThemeTokensV1 {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primarySoft: string;
  primaryBorder: string;

  pageBg: string;
  surfaceBg: string;
  elevatedBg: string;
  inputBg: string;
  tableHeaderBg: string;
  tableRowBg: string;
  fillSecondary: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  placeholder: string;
  textOnPrimary: string;

  border: string;
  borderSecondary: string;
  focusRing: string;
  maskBg: string;

  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface UserThemeV1 {
  id: string;
  name: string;
  mode: "light" | "dark";
  version: 1;
  tokens: ThemeTokensV1;
  createdBy: string;
  updatedAt: string;
}
```

约束：`success`、`warning`、`danger` 以及 `alarmLevel*` 是平台/业务固定语义色，不进入用户可编辑 Token；`chartSeries*`、`graph*` 也暂不进入必填 `ThemeTokensV1`，避免主题意外改变业务识别。后续新增字段采用 `ThemeTokensV2` 等版本升级，保持 V1 子应用可读。

### 4.1 已冻结的派生与对比度规则

- 用户最小可编辑集：`primary`、`pageBg`、`surfaceBg`、`text`、`border` 和 `mode`。
- `primaryHover`、`primaryActive`、`primarySoft`、`primaryBorder`、`focusRing`、`textOnPrimary` 由主题内核派生；用户不直接编辑。
- 亮色基底默认使用浅页面背景和白色容器；暗色基底默认使用深蓝黑页面背景和较亮的深色容器。具体内置色值由 P1 的两个内置主题记录提供。
- `textOnPrimary` 自动在黑/白中选择对比度更高的颜色。
- 保存时，用户直接配置的 `text/pageBg`、`text/surfaceBg`、`placeholder/inputBg`、`border/surfaceBg` 等关键组合不满足对比度规则时拒绝保存；派生 Token 由系统自动修正。
- `success`、`warning`、`danger`、`info` 与 `alarmLevel*` 保持固定平台/业务色，不从 `primary` 派生。

## 5. 后端接口契约草案

P6 实现前需 A8 批准。接口使用完整版本化主题对象，避免只保存 `primaryColor`。

| 接口 | 请求/响应要点 | 审核依赖 |
|---|---|---|
| `GET /ui-themes` | 当前用户可见主题列表、租户默认主题 ID | A8 |
| `GET /ui-themes/current` | 当前用户生效的完整 `UserThemeV1` | A8 |
| `POST /ui-themes` | 创建用户主题；服务端重复颜色/对比度校验 | A6/A8 |
| `PUT /ui-themes/:id` | 更新用户自定义主题；乐观版本控制 | A8 |
| `DELETE /ui-themes/:id` | 仅允许删除可删除的用户主题 | A8 |
| `PUT /ui-themes/current` | 设置当前用户主题 | A8 |
| `PUT /tenant/ui-theme` | 设置租户默认主题，需要管理员权限 | A8/A9 |

前端 P1 不依赖这些接口：先使用内置主题和 localStorage，以便完成主题核心与试点验证。

## 6. P0 审核输入包

请在长期台账的“审核结论记录”中填入以下结论后，才能冻结 P0：

| 审核编号 | 需要明确的选择 |
|---|---|
| A1 | **已批准。** `ThemeTokensV1` 作为跨 MF 的最小长期契约；新增字段采用版本升级兼容。 |
| A3 | **已批准。** `success`、`warning`、`danger` 和 `alarmLevel*` 使用平台/业务固定色，永远不随主题改变。 |
| A4 | **已批准。** MVP 限定为 Chrome、`pc-ui`、`security-monitor`、`generic-equipment-monitor`。 |
| A5 | **已批准。** 采用逐文件、逐用途、可审计白名单，记录见 `2026-09-16-theme-color-exceptions.md`。 |
| A6 | **已批准。** 采用混合模式：系统派生前景色，关键用户 Token 不合格则拒绝保存。 |

## 7. 下一步

P0 已完成并冻结。下一项为 P1：实现主题契约、Schema、Token 派生、主题应用和事件订阅。
