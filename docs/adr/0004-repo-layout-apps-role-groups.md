# 仓库顶层采用 apps 角色分组 + packages + deploy + tooling；服务端面根级并列

目录取 L1 分组变体：可部署 UI 按角色落在 `apps/shells/*`、`apps/domains/*`、`apps/platforms/*`，并预留 `apps/standalone/*`（非组装入口的独立应用）；**页面库**（纯 exposes、无 basePath）在 `apps/page-libraries/*`（见 ADR-0059 / ADR-0060）；**服务 Client**（实现 + MF remote 同包）在 `apps/clients/*`（见 ADR-0057）。**服务端面**与 `apps/` 并列于仓根：`contracts/*`（服务契约库）、`bff/`（体验 BFF 进程，后置）、`backends/*`（日后业务服务，可空）——对齐方案 α，**不**使用 `apps/servers`。库与工程配置在 `packages/*`（及必要的 `packages/config/*`）；**部署资产**在 `deploy/`（含发版选集、地址模版、compose/nginx，以及组装清单 `deploy/compositions/`——Composition Profile / dev 注册表等**数据**，非 workspace 包）；脚手架与扫描在 `tooling/*`。相对纯平铺 `apps/*`，分组表达门面/域/平台/独立应用/服务 Client remote 分离；服务契约与 BFF/backends 用根级带表达，避免与 UI 组装面混淆。组装清单不放在 `apps/`（避免与可部署包混淆），归入 `deploy/` 与发版/主站资产同侧。旧仓路径不映射进树；P0 可少填包，但 workspace glob 与命名槽位按此一次铺齐。分组目录本身不放 `package.json`，避免嵌套 package。

曾将 `compositions/` 作为仓根 L1；后迁入 `deploy/compositions/`，主站运行时 URL `/compositions/{set}.resolved.json` 不变（HTTP 路径 ≠ 仓内目录）。
