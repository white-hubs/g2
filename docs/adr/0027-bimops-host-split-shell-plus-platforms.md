# bimops 宿主拆分为 shell + 独立发版 Platform（pc-auth/pc-chrome/pc-messaging/pc-rtc）

迁移 `legacy/bimops-fe-web-migrate` 时，把顶栏/菜单/工作台皮肤（chrome）、登录/鉴权页面内容、消息总线、RTC 通话与报警弹窗拆成独立的 `@g2-platform/*` 包（`pc-chrome`、`pc-auth`、`pc-messaging`、`pc-rtc`），经 Composition Profile 加载，而不是留在 `@g2-shell/pc` 内部。判断标准是**独立发版节奏**（是否需要脱离门面发版周期单独热修/按项目调整），不是「是否已有第二个消费者」——即使当前只有 bimops 一个门面消费，这几块都有真实的按项目/租户单独调整证据（如登录方式定制、顶栏皮肤定制）。

这偏离了多数 MFE 实践里「chrome 由 shell 自持、保持门面瘦身」的默认做法（调研见 grill 记录），是权衡后的主动选择：换来的是不用为了改皮肤/登录方式重新发布整个门面。门面自身只保留框架布局（挖洞位）、鉴权状态机与路由表、装载编排。

**后续变更（ADR-0062）**：报警弹窗不再与 RTC 同包；独立为 `@g2-platform/pc-alarm-popup`。本 ADR 的「拆成独立发版 Platform」原则不变，清单以 ADR-0062 增补为准。
