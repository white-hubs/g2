# Platform 扩展点分两类：install 广播型不冲突，slots 独占型冲突即报错

`@g2-composition/schema` 校验 Composition Profile 时，对 Platform 契约（ADR-0030）的两种扩展点采用不同的冲突语义：

- **`install`（广播型）**：同一 Profile 里任意多个 Platform 都可以各自声明 `install`，全部执行，天然不冲突，不做任何校验。
- **`slots`（独占型）**：同一 Profile 里如果两个 Platform 声明了同一个 slot 名（如 `chrome.topBar`），校验直接失败，报错信息包含冲突的 slot 名与两个 Platform 的 `name`/`package`/`entry`。不采用「按声明顺序」「按版本号」「按字母序」等隐式规则悄悄选一个赢家——这几种规则都不携带作者真实意图，调研中多个插件系统的设计文档明确否定了这类隐式选择（详见 grill 记录里的调研报告）。

「客制替换」的实现方式因此很直接：租户 Profile 里只声明替换版 Platform（如 `pc-auth-tenant-x`），不与标准版（`pc-auth`）同时出现，天然不会触发独占冲突。

## 第三类：列表型聚合贡献点，不适用独占冲突语义

ADR-0033 要求的 `chrome.topBar.actions` 一类**嵌套二级贡献点**，语义上不是「一个坑位只能有一个赢家」的独占 `slots`，而是「多个 Platform 各自贡献一项，全部保留、按某种顺序平铺展示」的**列表型聚合**——效果上更接近 `install`（多方并存、不冲突），只是每项贡献带有可展示的内容（图标/组件）而非纯副作用。

因此列表型聚合贡献点采用第三种校验语义：贡献者以自己的 Platform `name` 为 key（如 `chrome.topBar.actions.pc-ai-assistant`），同一 key 重复声明才按 `slots` 的独占规则报错；不同 Platform 各自的 key 并存不冲突，去重与展示顺序留给 `pc-chrome` 的实现（可按 Profile 里 platform 声明顺序或显式 `order` 字段排列，具体留给实施阶段）。`@g2-composition/schema` 校验时按贡献点声明的类型（`slots` / `install` / 列表型聚合）分别应用对应语义，不把列表型聚合误判为独占 `slots`。
