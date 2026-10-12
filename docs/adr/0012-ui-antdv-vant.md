# PC/H5 UI 基线采用 ant-design-vue 4.x 与 Vant 4.x

PC 侧组件库锁定 **ant-design-vue 4.x**，H5 侧锁定 **Vant 4.x**，与旧仓迁域源同代以降低摩擦。二者经 `@g2-platform/*`（如 platform-pc-ui / platform-h5-\*）暴露或封装，禁止打进各域 dist；域内不得私自再锁一套平行 UI 栈。骨架期可薄封装，视觉对齐后续迭代。具体 patch 进 Bun catalog。

装载形态（Profile / MF remote 动态装，禁止壳/域把 UI 基建静态打进产物）见 **ADR-0050**；本 ADR 只钉「用哪套 UI 库」与「经 platform 收敛」。
