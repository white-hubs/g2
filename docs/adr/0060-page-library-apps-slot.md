# 页面库落在 `apps/page-libraries/*`，Composition Profile 槽位键 `pageLibrary`

共享业务页/组件（ADR-0059）需要独立发版与 MF exposes，但不能占用 Domain 的 `basePath`。本决定：物理目录 `apps/page-libraries/<kebab>`，npm scope `@g2-pages/<kebab>`，MF 逻辑名 camelCase（如 `genericEquipmentMonitorPages`）；源 Profile / 已解析 Profile 增加数组键 **`pageLibrary`**（`name` + `logicalName`，解析后带 `entry`），**禁止 `basePath`**。壳不为页面库注册路由；应用域自持 routes 并经 workspace 或 `loadRemote` 挂载页面。部分扩展 ADR-0004 仓库布局与 ADR-0057 槽位并列模式。

## 状态

Accepted
