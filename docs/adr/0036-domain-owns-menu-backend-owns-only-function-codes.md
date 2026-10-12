# 域自持菜单/路由，后端收窄为功能权限（functionCode）平铺集合

菜单结构（存在性、层级、图标、路由）100% 收拢为域契约的一部分——`@g2-composition/contract` 在 `routes`（ADR-0021）之外新增可选的 `menuContribution`（递归 `children` 树，含 `label`/icon key/顺序/可选 `functionCode` 标签），由域开发者静态声明默认树，不再由后端按用户查询返回完整导航 path。旧仓「应用分组→应用→菜单」（`CubeOuaaService`）这套**整树 + path** 后端驱动模型不迁移；需要展示分组时用 Composition Profile 的分组展示元数据（纯文案/排序，不涉权限）。可导航组装单元仍是 Domain（见 ADR-0059「应用域」），不是复活 OUAA 应用实体。

后端基线职责：登录时一次性下发当前用户的 `functionCode` 平铺集合（不分域、不挂在菜单树节点上）。这一套 code 同时服务两个不同的用途——前端用来做菜单项/按钮的 UX 级隐藏或禁用（体验层，不构成安全边界），后端在各域自己的业务接口上用同一套 code 做真实拦截（安全边界）；也复用同一套集合表达"同一部署下按用户隐藏整个域入口"这种粗粒度可见性（约定形如 `domain:{domainName}:visible` 的 code），不为此单开一套数据结构。这与"装没装某个域"（部署级可见性，Composition Profile 决定，运营改配置即可）是两层不同的开关，不要混用。

MF 域挂载 path 形状（`/d/{appRegistryCode}`、跨域 `navigate-intent`）见 **ADR-0058** / **ADR-0059**。

**后续变更（ADR-0059）**：在「默认菜单仍属域契约、路由不由后端下发」不变的前提下，允许可选的**菜单 overlay**——仅按 code 重组层级/别名/显隐，**禁止** overlay 携带 path 或改 code→页面绑定；无 overlay 时用域默认 `menuContribution`。共享页面走页面库 remote，functionCode 由消费方应用域注入，不由共享库自持。

这偏离了行业里更常见的"navigation is authorization，菜单由后端按权限计算好再吐给前端"的默认做法（调研见 grill 记录），是权衡后的主动选择：换来的是菜单结构变成开发态契约、可测试、可类型检查，且新项目接入域时无需后端同步开发一套菜单/应用数据。安全边界始终在后端接口自己的 functionCode 校验上，不依赖前端隐藏与否。

## 一并解决：旧仓「一码多路由 / 多码复用一路由」

旧仓 `code` 字符串同时承担导航展示身份、路由查找 key、运行时差异化开关三种职责，是错位的根源。新契约拆成三个独立字段：路由查找＝域自己的 `basePath`（域自持、天然唯一，不需要反查任何 code）；导航展示身份＝Composition Profile 的 `label`/分组名（纯文案，允许同一域在不同 Profile 下换名字，也允许多个名字指向同一域）；运行时差异化＝Profile 显式传给域 `install` 的 `config` 参数（对称扩展 ADR-0030 已给 Platform 定的 config 机制），禁止域内部运行时 sniff 隐式 code 分支。若差异是代码级而非配置级，视为两个独立的域，由 Profile 按项目选装，而不是一个域自己判断环境。

## Status

`amended-by ADR-0059`（overlay / 页面库 / 应用域路由所有权）；本决定重开并收紧 ADR-0021「骨架期域契约仅 routes + 可选 install，不扩展菜单贡献」的边界——ADR-0021 成立于骨架期尚无真实业务域接菜单，本决定的触发条件（真实业务域迁移专项）已经出现。功能权限下发时机、菜单嵌套深度、粗粒度域可见性复用 functionCode 三点，已在本轮 grill 中一并确认；overlay 窄口见 ADR-0059。
