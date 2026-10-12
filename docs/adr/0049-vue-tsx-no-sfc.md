# UI 组件禁止 `.vue` SFC：统一 `defineComponent` + TSX + CSS Modules

PC/H5（及本仓一切 Vue UI）**禁止**使用 `.vue` 单文件组件（SFC）。组件必须用 **`defineComponent` + TSX**（`.tsx`）实现，样式用同目录 **CSS Modules**（`*.module.css`）。

理由：与 Shell 已有的 `defineComponent`/`h()` 渲染路径对齐并升级为可类型检查的 TSX；避免 SFC 变换管线与 MF/DTS 插件摩擦；迁入本仓的消息中心、业务微应用等一律按此标准适配，禁止旧仓 `.vue` 原样拷贝。

工具链：Vite/Vitest 使用 `@vitejs/plugin-vue-jsx`；门禁 `check:no-vue` 扫描 `apps/**`、`packages/**` 禁止再引入 `*.vue`。样式过渡期可用 `:global(.既有BEM类名)` 保住测试选择器与视觉对照，再逐步收到 hashed module class。

不引入 React；UI 库选型仍见 ADR-0012（ant-design-vue / Vant）。
