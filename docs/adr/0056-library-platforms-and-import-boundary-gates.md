# 库型 Platform 为运行时内部依赖归宿；import 分层用 dependency-cruiser，与声明白名单分立

运行时需独立热部署的内部能力（日期、日志、静态资源 URL、http 等）一律落成 **库型 Platform remote**（`@g2-platform/*` + Profile 逻辑名如 `datePlatform` / `httpPlatform`），经门面 URL 动态预装或 `ensurePlatform` / `loadPlatform` 幂等装载后全域共享；**退役 `@g2-shared/*` 静态包**，不另开 shared remote，也不靠扩大 ADR-0018 MF `shared` 白名单冒充发版边界。热修＝更换注册表指针后的**热部署**（下次加载生效），不要求无刷新 HMR。

Import 图边界（域不直依三方工具库 / 他域 / 未封装 UI / 非壳 qiankun；apps 不依赖 tooling 等）用 **dependency-cruiser** 门禁编码，与现有 `check:deps`（package.json 声明白名单，ADR-0041）分立；**不**为此引入 ESLint（ADR-0006）。死代码卫生用 Knip；禁止文件与生成目录误入库用独立文件门禁。三者均可进 CI 硬红。

## Considered Options

- **扩大 MF `shared` 或保留 `@g2-shared` 静态依赖**：能统一实例或薄封装，但不能单独热部署；否决为运行时内部依赖的长期形态（与 ADR-0039/0050 一致）。
- **「shared 也做成 remote」双通道**：与 Platform 装载模型重复；否决。
- **壳对 date/logger/resource 保留 workspace 静态例外**：实现简单但改库仍要重打壳；否决。改为壳启动序 URL 动态预装，仍计入同一已装集合。
- **用 ESLint import 规则做分层**：与 ADR-0006 冲突；否决，改 dependency-cruiser。
