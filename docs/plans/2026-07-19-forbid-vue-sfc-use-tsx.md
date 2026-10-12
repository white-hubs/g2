# 全仓禁止 .vue：迁移到 defineComponent + TSX + CSS Modules

> **状态（2026-07-19）**：已落地。ADR-0049、`check:no-vue`、Shell/Domain/Platform 组件均已改为 TSX + CSS Modules；`apps/`、`packages/` 下无 `.vue`。

## 已拍板决策

| 项        | 决定                                                               |
| --------- | ------------------------------------------------------------------ |
| 范围      | **全仓**：清掉全部 `.vue`，Shell/`h()` 视图一并改 `.tsx`，并加门禁 |
| 写法      | `defineComponent` + **TSX** + **CSS Modules**（`*.module.css`）    |
| Vite 插件 | `@vitejs/plugin-vue-jsx`（已移除 `@vitejs/plugin-vue`）            |

## 目标形态

```tsx
import { defineComponent } from "vue";
import styles from "./LoginPage.module.css";

export default defineComponent({
  name: "LoginPage",
  setup(props) {
    return () => (
      <div class={styles.root} data-testid="login-page">
        ...
      </div>
    );
  },
});
```

过渡期允许在 `.module.css` 里用 `:global(.既有BEM类名)` 保住测试选择器与视觉对照。

## 落地清单

1. **决议与门禁**
   - [`docs/adr/0049-vue-tsx-no-sfc.md`](../adr/0049-vue-tsx-no-sfc.md)
   - [`tooling/no-vue-sfc`](../../tooling/no-vue-sfc)：`bun run check:no-vue`
   - ADR-0013 表述已改为「Vue 组件 / JSX 管线」

2. **Shell + Domain**
   - `apps/shells/pc/src/App.tsx`、`HomeView.tsx`
   - `apps/domains/poc-inline-pc/.../poc-inline-view.tsx`
   - `apps/domains/poc-remote-pc/.../poc-remote-view.tsx`

3. **Platform**
   - `pc-auth`：登录相关组件全部 `.tsx` + `.module.css`
   - `pc-chrome`：顶栏/侧栏/标签等全部 `.tsx` + `.module.css`
   - `pc-ai-assistant`：`AiChatEntry.tsx`

4. **文档**
   - `CONTEXT.md` 增加「UI 组件形态（TSX）」
   - bimops 迁移计划顶部勘误指向本文

## 迁入本仓的强制适配原则

凡迁入本仓的代码（含消息中心、业务微应用、其它 Platform/Domain）一律必须适配本仓最标准做法，不得以「旧仓原样搬运」豁免：

- **组件形态**：`defineComponent` + TSX + CSS Modules（禁止 `.vue` SFC）
- **依赖治理**：ADR-0041 / `check:deps`
- **技术架构约定**：Composition Profile、MF shared singleton、Platform/Domain 契约、事件总线等

## 验收命令

```bash
find apps packages -name '*.vue'   # 应为空
bun run check:no-vue
bunx vitest run   # 在 pc-auth / pc-chrome / shells/pc 等包内
```
