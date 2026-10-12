# 服务三层按服务面落仓：根级 contracts/bff/backends + Client remote 槽位

保留旧仓 `cube-services` 的 **服务三层**（契约 / 服务 Client / BFF），但纠正 ADR-0045「分域 `*.client.ts`」易被读成「client 住在先用到它的 Domain/Platform UI 包」的漂移：调用层按 **服务面** 拆包归属，不跟 UI Domain/产品型 Platform 搅在一起。传输仍用库型 Platform `@g2-platform/http`（`httpPlatform`）；解包与路径仍在各服务 Client 内（ADR-0045 的响应契约下沉结论不变，仅所有权与落点改正）。

物理摆法对齐方案 α：**根级** `contracts/`、`bff/`、`backends/`（与 `apps/` / `deploy/` 并列）；服务 Client remote 可落在 `apps/clients/`（实现与 MF 同包）。**不**使用 `apps/servers`。

| 层          | scope / 路径                                                            | 交付                                                                                                                                                                                                          |
| ----------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 服务契约    | `@g2-contract/<surface>` → `contracts/<surface>`                        | 一服务面一包；含 DTO + Client 门面类型（供 `ensureClient<T>`）；**纯类型、非 remote、不发 npm**；现阶段手写                                                                                                   |
| 服务 Client | `@g2-client/<surface>` → `apps/clients/<surface>`（**实现与 MF 同包**） | 逻辑名如 `messageClient`；Composition Profile 独立槽位键 **`client`**；经壳侧 **`ensureClient`** 幂等装载；经 **`PlatformContext.ensureClient`** 注入给 Platform；`ensureClient<T>` 的 `T` 来自契约包门面类型 |
| BFF         | `@g2-server/bff` → 根级 `bff/`                                          | 可部署进程；**M2 已进仓**（自旧 `cube-gateway-server` 1:1 迁入，`@dangao/bun-server`）                                                                                                                        |
| 业务服务    | `@g2-server/<name>` → 根级 `backends/<name>`                            | 初期可空；`fetch-service` 另波                                                                                                                                                                                |

M1 曾试点服务面 **message** 并对现网 `/gw-bff`；**M2** 已落本仓 `@g2-server/bff`，旧 `cube-services` interfaces/client/gateway 按服务面拆包全量迁入。壳侧仍保留部分 `/api/*` 直连（**双轨债**，见 CONTEXT；代码标 `TODO(dual-track)`，须尽快收敛）。OpenAPI/codegen 后置。对照门禁：`bun run check:cube-services-parity`。

部分修正 ADR-0004（根级服务端面 + `apps/clients`）、ADR-0005（`@g2-contract` / `@g2-client` / `@g2-server`）、ADR-0045 / ADR-0047（「分域 client」改为 **服务 Client**）。

## Considered Options

- **Client 锚在先用到的 Domain/Platform（现状漂移）**：短期省包，长期所有权错位；否决。
- **物理路径用 `packages/*` + `apps/servers`（grilling 误记为 A）**：与方案 α 根级四带不一致；**纠正为**根级 `contracts/`、`bff/`、`backends/`；Client remote 可保留 `apps/clients/`。
- **Client 复用 Profile `platform` + ensurePlatform（R2）**：否决，改平行槽位键 `client`。
- **Client 再拆 packages 源包 + apps 薄 remote（S1）**：改 **S2** 实现与 MF 同属 `apps/clients/<surface>`。
- **Client 取 ctx**：MF 暴露 **`create(ctx)`**（X1）。
- **Client 带 UI / 默认 vue shared**：否决，**U1** 纯逻辑。
- **MF expose**：固定 **`./client`** + `{ create }`（E1）。
- **发版**：Profile `client` 与 release-set `members` 对齐；契约不进选集。
- **message 试点 API**：方法/路径/解包 **1:1**；门面类型名 `MessageClient`（F1）。
- **Domain 取 Client**：本波仅 **`PlatformContext.ensureClient`（D1）**。
- **同波进仓 BFF（M2）**：先 **M1**（契约+Client 对现网）；**已升级为 M2**（本仓 `bff/` 进仓，cube-services 1:1）。
- **首波即 OpenAPI codegen**：选手写 **G1**，codegen 后置。
- **壳 `/api/*` 与 cube-services `/gw-bff`**：过渡期双轨并存，标 `TODO(dual-track)`，不作为长期形态。
