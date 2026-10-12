# 内部包按角色使用 @g2-\* scope

workspace 内包按目录角色使用独立 npm scope，便于检索与边界，不采用单一 `@g2/*` 扁平前缀：

| 角色                  | scope               | 示例                                                         |
| --------------------- | ------------------- | ------------------------------------------------------------ |
| 门面                  | `@g2-shell/*`       | `@g2-shell/pc`、`@g2-shell/h5`、`@g2-shell/admin`            |
| 域                    | `@g2-domain/*`      | `@g2-domain/fire-management`                                 |
| 平台                  | `@g2-platform/*`    | `@g2-platform/pc-ui`、`@g2-platform/h5-auth`                 |
| 独立应用              | `@g2-standalone/*`  | `@g2-standalone/ue5`                                         |
| 服务契约              | `@g2-contract/*`    | `@g2-contract/message`（根级 `contracts/*`，ADR-0057）       |
| 服务 Client           | `@g2-client/*`      | `@g2-client/message`（`apps/clients/*`，实现与 MF 同包）     |
| BFF / 业务服务进程    | `@g2-server/*`      | `@g2-server/bff` → `bff/`；`@g2-server/<name>` → `backends/` |
| 契约/组装库           | `@g2-composition/*` | `@g2-composition/schema`、`@g2-composition/contract`         |
| 静态 shared（已退役） | `@g2-shared/*`      | 见 ADR-0056；禁止再引用                                      |
| 工程配置              | `@g2-config/*`      | `@g2-config/ts`、`@g2-config/oxlint`                         |
| 脚手架/CLI            | `@g2-tooling/*`     | `@g2-tooling/create-domain`                                  |

`deploy/compositions/` 下的 Profile YAML/JSON 是组装清单数据，不是 npm 包，不占用 scope。服务契约 / 服务 Client / 本仓服务进程**不发 Nexus npm**，发版身份走版本注册表 / remote（与 Domain、库型 Platform 一致）。不沿用旧仓 `@ghcloud` / `@ghcloud-legacy`。曾考虑单一 `@g2/*` 或 `@cube/*`：前者不便按角色过滤，后者与仓库标识分叉，故否决。
