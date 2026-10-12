# AI 聊天助手拆成独立 Platform；pc-chrome 顶栏需要二级贡献点

`AssistantChatDrawer`（AI 聊天，按 `AI_ABILTY` 字典开关，标准可拔插能力，见 ADR-0029 的分类）不是 chrome 的一部分，落成独立的 `@g2-platform/pc-ai-assistant`，判断依据同 ADR-0027：AI 能力大概率需要脱离顶栏/门面自己的发版节奏迭代。

但它的入口图标物理上要出现在顶栏（`chrome.topBar`）里，和 `pc-chrome` 自己的图标（搜索、换肤、租户切换等）平铺在一排。这意味着 `pc-chrome` 的 `chrome.topBar` slot 不能是一个不透明的整块组件，需要再开一层**二级贡献点**（如 `chrome.topBar.actions`），允许其他 Platform（`pc-ai-assistant`，未来可能还有消息红点等）把自己的图标注册进去，而不是 `pc-chrome` 反过来 import 具体 Platform。贡献点的注册时机与去重规则留给实施阶段设计，但契约上要预留这个口子。

**后续澄清**：`chrome.topBar.actions` 语义上不是 ADR-0030 独占型 `slots` 的嵌套版本，而是允许多个 Platform 并存贡献的列表型聚合贡献点——冲突/去重规则已在 ADR-0034 中作为第三类扩展点语义补齐，实现时以 ADR-0034 为准。
