# 前端基线：Vue 3.5.x + Vite 8.x + TypeScript 6.x（Bun 运行时）

新仓采用进取线而非旧仓 Vite 4 主线：UI 框架锁定 **Vue 3.5.x**（与迁域源同代，降低摩擦）；构建锁定 **Vite 8.x**（对齐 MF 2.0 插件生态与旧仓 `vite-next` catalog 方向）；语言锁定 **TypeScript 6.x**。包管理/脚本运行时为 Bun（见 ADR-0002）。具体 patch 版本用 Bun catalog 冻结，升级单独 PR。不强制与 ghcloud 主线 Vite 4 或 TypeScript 5.9 对齐。
