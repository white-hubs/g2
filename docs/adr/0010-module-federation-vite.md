# Module Federation 2.0 采用 @module-federation/vite

门面 Host 与 platform/domain remote 统一使用官方 **`@module-federation/vite`**（MF 2.0），与已锁 Vite 8.x 同栈。不在主路径引入 Rsbuild/Rspack MF，避免双构建心智；不采用 Native Federation 生产双轨（与双门面实施方案「明确不做」一致）。manifest / shared singleton 策略在骨架 PoC 中按 Composition Profile 落地，本 ADR 只钉插件族。

## Remote 包内的 `index.html`（构建入口壳，不是独立产品）

Platform / remote Domain 目录里的 `index.html` + 占位 `src/main.ts` **不是**可独立交付的站点，也**不是**热修或 Profile 装载路径的一部分。门面与其它消费者只读 `remoteEntry.js` / `mf-manifest.json`（及 exposes 产物）。

它存在的唯一原因：在本仓当前约定下（`vite.config` **不**另设 `build.rollupOptions.input`），Vite 8 客户端构建默认以根目录 `index.html` 为入口；`@module-federation/vite` 会额外 `emit` remote 容器，但**不会**取消 Vite 对默认入口的需求。删掉该文件且不改配置时，`vite build` 会以 `Cannot resolve entry module index.html` 失败——因此 **必须保留**，不得当作「多余文件」清理。

补充说明：

- 可选附带收益：本地 `vite` / `vite preview` 时可打开该页做极简自检；联调以 Host + Profile 为准，不依赖此页。
- 与「Host 的 `apps/shells/*/index.html`」不同：后者才是用户进入的 SPA。
- 实践约定见 `apps/platforms/README.md`。
