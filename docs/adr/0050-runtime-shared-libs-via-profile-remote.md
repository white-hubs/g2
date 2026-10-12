# 需独立热修的运行时公共库经 Composition Profile 动态装，禁止打进壳/域产物

凡会被多个 shell / platform / domain 消费、且需要**独立发版或热修**的运行时公共能力，必须以 **Platform remote** 形态出现：由 Composition Profile（及版本注册表）决定装载与版本，经 MF `remoteEntry` 异步加载。禁止消费方用 workspace / npm **静态 import 把这类库打进自己的构建产物**——否则改一处底层仍要重打大量消费者，回到「牵一发而动全身」。

**边界（与 MF shared singleton 正交，深挖会话可修订措辞）：**

- **走本 ADR（Profile Platform remote）**：UI 基建（如 `@g2-platform/pc-ui`）、日志平台化目标（见 ADR-0039）、http 客户端等「改了不想等消费者重建」的能力。
- **仍走 ADR-0018 MF shared singleton**：`vue` / `vue-router` / `pinia`——解决的是全页单实例，不是发版边界。
- **构建链与类型包除外**：vite、typescript、仅类型的依赖不在此列。

**与 ADR-0012 / 0041 的关系：** 0012 只锁定 PC/H5 用哪套 UI 库、经 platform 收敛；0041 禁止消费方直接声明三方库。二者**不**授权「壳/域永久静态依赖 `@g2-platform/pc-ui`」。`pc-ui` 已具备 MF remote 形态；当前 chrome/auth 的 `workspace:*` 静态依赖视为**过渡债**，须后续拆掉，本 ADR 先扶正文档以免继续扩散。

**过渡期：** 在 chrome/auth 尚未改为运行时注入前，Shell 不得新增对 `pc-ui` 的静态依赖；跨边界提示（如跳转失败 toast）经 `ctx.bus` 由已 Profile 装载的 chrome 展示。

**打包形态备注：** Platform 根目录 `index.html` 仅为 Vite 默认构建入口壳（ADR-0010），不是独立可运行项目；热修与装载仍只认 remoteEntry / Profile 指针。
