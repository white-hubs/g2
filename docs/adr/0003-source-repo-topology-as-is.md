# 旧仓（ghcloud）现状拓扑澄清

迁移对照以本 ADR 为准，不以「单一门户 + 全量 qiankun」简化旧仓。旧仓是 Bun workspaces + catalog 的 monorepo；PC 门户门面为 `legacy/bimops-fe-web-migrate`（qiankun 加载接入 vite-plugin-qiankun 的微应用），管理端门面为 `legacy/admin-migrate`（同类模式）。另有非 qiankun 独立应用（如 ue5、command-dispatch 及部分独立 H5）、`prod/customize` 客制增量、H5 以 App WebView + Bridge 为主、格式化/lint 以 oxc/oxlint 规则为基。基础设施曾分裂（如 epp 与 cube-utils 共存）；末期 `cube-services`（interfaces/client/gateway）意在全局共用但未全量落地。新仓目录与工具链不照搬上述路径，但迁域波次与 Profile 设计须覆盖门面族、独立应用、客制与 H5 Bridge 等形态。
