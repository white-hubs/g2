# PC Shell / Auth / Chrome 试点引入 Tailwind CSS（无 preflight）

在 `@g2-shell/pc`、`@g2-platform/pc-auth`、`@g2-platform/pc-chrome` 试点引入 **Tailwind CSS v4**（`@tailwindcss/vite`），用于高 ROI 的焦点环、过渡/微交互与局部布局 utility。

约束：

- **不启用 preflight**，避免重置冲击 `ant-design-vue` 与 qiankun 遗留子应用样式
- 使用 **`prefix(tw)`**，与现有 CSS Modules / BEM 并存（ADR-0049 仍有效）
- 组件库基线仍是 ant-design-vue（ADR-0012）；Tailwind 不替代 antd，也不扩散到 Domain 默认栈
- H5 未来可基于同一套约定另开试点；本 ADR 只覆盖上述三个 PC 包

装载：各包 `src/styles/tailwind.css` + Vite 插件；样式仍可与 `*.module.css` 同文件并存。
