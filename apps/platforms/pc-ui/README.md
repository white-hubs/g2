# @g2-platform/pc-ui

PC 侧 UI 组件库基础设施包，把 `ant-design-vue` 4.x（ADR-0012 锁定的 PC UI 基线）收敛在这一个包背后。消费方不得在自己 `package.json` 里再声明一份 `ant-design-vue`（ADR-0041 `exposedBy`）。

**目标装载形态（ADR-0050）：** 经 Composition Profile / MF `remoteEntry` **动态装载**，独立发版热修，避免改 UI 基建牵一发而动全身。MF shared singleton（vue 三件套）只保证运行时单实例，不替代本包的发版边界。

**过渡现状：** `pc-chrome` / `pc-auth` 仍 `workspace:*` 静态 import（债）；`vite.config.ts` 已暴露 `pcUi` remote，但 demo Profile 尚未挂载。Shell / Domain **不得**再新增对本包的静态依赖；跨边界 UI（如 toast）经 `ctx.bus` 由已装载的 chrome 展示。

## 用法（过渡：静态 import；目标：Profile remote / loadPlatform）

```ts
// 过渡期：platform 包内部（勿在 @g2-shell/* / @g2-domain/* 新增）
import { installPcUi } from "@g2-platform/pc-ui";
import "@g2-platform/pc-ui/style";

installPcUi(app); // 等价旧仓 src/main.js 的 app.use(Antd)
```

```ts
import { Button, Input, message } from "@g2-platform/pc-ui";
```

## 样式接入方式

ant-design-vue 4.x 用 `dist/reset.css` 取代了 2.x 时代的 `antd.less`（已实测核实 4.2.6 包内确实存在这个文件，见 [unpkg 目录](https://unpkg.com/ant-design-vue@4.2.6/dist/)，不是凭记忆假设的）。本包在 `src/style.ts` 里做了一次 `import "ant-design-vue/dist/reset.css"` 副作用导入：

- `src/index.ts`（包的默认导出入口，即 `import ... from "@g2-platform/pc-ui"`）顶部已经 `import "./style"`，所以只要消费方引入了组件/`installPcUi`，样式会自动带出，不需要额外操作。
- 如果消费方只想单独引入样式（例如只想要 reset 样式、不需要 JS 组件），可以显式 `import "@g2-platform/pc-ui/style"`。

两种方式引入的是同一份副作用模块，不会重复插入两次 `<style>`（ESM 模块缓存去重）。

## PlatformModule / Profile（目标 vs 过渡）

按 ADR-0050，本包**应当**被 Composition Profile 动态装载（独立热修）。当前尚未挂进 demo Profile、也未补最小 `PlatformModule`（可参照 `@g2-platform/http` 的 `label` + `loadPlatform`），属于待还的债；**不要**把「workspace 静态 import」当成长期设计。

拆掉 chrome/auth 静态绑、Profile 挂载 `pcUi`、运行时注入组件 API，另开任务，不在「工作台跳转」变更范围内完成。

## MF 暴露说明

`vite.config.ts` 已配置 `federation({ name: "pcUi", exposes: { "./index": "./src/index.ts" } })`，供 Profile remote 路径使用。过渡期内消费方仍可能走 workspace 静态依赖——新增消费方禁止再走这条路。

## 根目录 `index.html`（勿删）

仅为 Vite 默认构建入口壳 + 占位 `main.ts`，**不是**独立可运行项目，也不是 Profile/热修路径。当前约定下未配置 `rollupOptions.input` 时删除会导致 `vite build` 失败。详见 [`../README.md`](../README.md) 与 ADR-0010。

## 组件覆盖范围

当前只 re-export 了登录页与顶栏场景预期会用到的组件：`Button`、`Input`、`InputPassword`、`Form`、`FormItem`、`Checkbox`、`Modal`、`Dropdown`、`Menu`、`MenuItem`、`SubMenu`、`Tabs`、`TabPane`、`Avatar`、`message`、`ConfigProvider`。`installPcUi` 内部走 `app.use(Antd)` 全局注册整套组件库（等价旧仓行为），所以即使某个组件没有从这里 re-export，模板里用 `<a-xxx>` 标签的写法仍然可用；re-export 列表只是为了让 `<script setup>` 里可以按需 `import { Button } from "@g2-platform/pc-ui"` 而不必再触达 `ant-design-vue` 本身。后续需要更多组件时直接在 `src/index.ts` 补充 re-export 即可，不需要新开依赖声明。
