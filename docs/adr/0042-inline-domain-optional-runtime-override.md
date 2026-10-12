# 内联域新增可选的运行时覆盖通道（inline override），默认关闭，失败即维持内置版本

为兼顾「标品同发同回」的默认稳定性与个别内联域偶发需要脱离门面发版节奏热修的诉求，Composition Profile 为 inline 条目新增可选字段 `allowOverride`（默认 `false`）。开启后，Profile 里同名的 remote 条目（其 `basePath` 须与该 inline 条目一致）成为该域的运行时来源；门面启动时先渐进渲染内置的 inline 版本（不等待网络），随后定时轮询 override remote 的 `mf-manifest.json` 里的 `metaData.buildInfo.buildVersion` 与已渲染版本比对，发现新版本只弹提示引导用户手动刷新，**不做运行时组件热替换**；override remote 加载或轮询失败时，直接维持已渲染的内置版本，不额外报错。关闭覆盖能力走 Composition Profile 重新发布/回滚（复用 ADR-0025 既有机制），不新增独立于 Profile 的运行时开关服务。

**与 ADR-0037 的边界**：ADR-0037 禁止的是生产 Shell 里「用户可控」的运行时改指向/装载详情暴露（如 URL query、localStorage 等页面访问者可篡改的入口）。本条目的 `allowOverride` 是部署侧能力——开关与覆盖目标完全由 Composition Profile（git + CI 管控）决定，不存在浏览器侧可篡改的入口，且轮询 manifest 只用于提示刷新、不做热替换、不暴露内部拓扑。因此不落入 ADR-0037 的禁止范围，属于其允许的例外，不修订该条禁令本身。

## Considered Options

- **运行时组件热替换**（检测到新版本后原地替换已渲染的组件树）：能做到真正无感更新，但组件/路由状态在替换瞬间有丢失风险，且实现成本高；否决，改为「提示刷新」。
- **显式 `overrides: <inline-name>` 字段绑定覆盖关系**：更直白，但与既有按 `name` 关联的 Profile 惯例不一致，新增字段收益不明显；否决，改用同名约定。
- **覆盖开关做成独立于 Profile 的运行时 feature flag 服务**：能做到秒级关闭，但引入了 Profile 之外的第二套发布/生效路径，与「切流回滚以 Profile 为单位」（ADR-0025）的既有约定冲突；否决，接受走 Profile 重新发布的生效延迟。
