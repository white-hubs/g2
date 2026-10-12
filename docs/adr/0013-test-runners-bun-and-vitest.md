# 测试分轨：逻辑/AT/UT/部分 E2E 用 bun test；UI 等不可触达场景用 Vitest

默认测试运行时为 **`bun test`**：覆盖无 UI 的单元测（UT）、逻辑向验收/接口向测（AT）、以及不依赖真实浏览器 UI 的部分 E2E。  
**Vitest** 仅用于 bun test 难以可靠触达的场景，典型为 Vue 组件（`defineComponent` + TSX，见 ADR-0049）/ 组件库包装 / 需贴近 Vite 变换管线的 **UI test**。

禁止无边界地双写同一套用例；包内 README 或测试目录约定标明 runner（例如 `*.test.ts` → bun，`*.vitest.ts` / `vitest/` → Vitest）。CI 可分 job，本阶段仍以配置够用为准，真实验收可手工。不把 Vitest 当作全仓默认，也不幻想 bun test 完整替代 Vitest UI 能力。
