# 实时报警弹窗独立为 `pc-alarm-popup`；与 RTC 拆开；详情须应用码匹配

旧仓「租户实时报警弹窗 / 总部报警弹窗」是门户顶层叠加能力，入站来自消息 `ALARM_NOTICE`，金标准 UI 在 `@ghcloud/cube-alarm-modal`；总部另走跨市场远端 iframe。ADR-0027/0029 曾因宿主拆分打包便利把报警弹窗与 RTC 通话塞进 `pc-rtc`，**不是领域归属**。本决定纠正包装：报警弹窗落标准可拔插 Platform `@g2-platform/pc-alarm-popup`；`pc-rtc` 只保留融合通讯。入站由 `pc-messaging` 归一后发 bus；弹窗 Platform 只订阅。租户弹窗用本仓原生 TSX（复用 `pc-player` / `pc-alarm-charts` 等）；总部弹窗本迭代仍 1:1 复刻 market-config + 远端 iframe（凭证进 URL 为旧债另项）。总部市场配置走独立服务 Client `@g2-client/headquarters-market`（HTTP 可仍打遗留 `dataintegrate` 路径，包名不跟路径走）。点「详情」只发 `navigate-intent` 的 `code` + `entry`（如 `alarmDetail`），**禁止** portal path 兜底；推送 `applicationCode` 必须与目标 Domain 应用码匹配，否则中断/提示——禁止把未迁应用（如消防）改道已迁宿主并覆盖码制造假可用。壳侧 **菜单归属码**（现有 `navigateCodes` 应收窄为此：触发侧栏剥 OUAA 叶子）与 **Intent 可跳码**（仅 intent 解析，不剥菜单）权威分离。

## 状态

Accepted

## Considered Options

- 继续放在 `pc-rtc`：否决——领域上报警实时触达 ≠ 融合通讯。
- 挂在 `pc-messaging`：否决——消息面过重，与「报警扩展」边界糊。
- 挂业务 Domain / page-library：否决——全局叠加层不能依赖某域是否装入；库不拥有生命周期。
- 详情双轨 portal 兜底 / 借门禁宿主覆盖 `applicationCode`：否决——制造未迁应用「看起来可用」的假象。

## Consequences

- 修订 ADR-0029：`pc-rtc` 不再承载报警弹窗；报警弹窗以本 ADR 为准。
- ADR-0027 列 Platform 清单时，报警弹窗应理解为后续独立 Platform，而非永久绑在 `pc-rtc`。
- Profile 需装载 `pc-alarm-popup` + `headquartersMarketClient`；壳需拆分菜单归属索引与 intent 索引。
- 词条见 CONTEXT：租户/总部实时报警弹窗、报警弹窗双承载、菜单归属码、Intent 可跳码、报警详情应用码匹配、总部市场配置 Client。
