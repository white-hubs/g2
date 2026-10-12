# G2 新环境首次部署与全量手动更新操作手册

> 适用范围：将 G2 当前生产发布选集部署到一个尚未接入 G2、但已有门户/旧子应用/后端服务的环境；也适用于之后对该环境执行 G2 全量静态资源更新。
> 重要：本文是操作手册，不代表目标环境已完成盘点、部署或验收。所有 `<...>` 均为执行前必须替换的目标环境参数；禁止照抄 133/243 的 IP、路径、端口、容器名、凭据或网络拓扑。
> 发布模型：静态发布选集（Shell + 生产 Profile 中的全部 Runtime Common/Domain/页面库等成员）上传到 S3 兼容对象存储/CDN；目标门户路由到 G2 Shell，并提供已解析生产 Profile。BFF、后端服务、数据库不属于这次静态发布，除非此次版本明确包含相应服务变更并单独完成兼容评估。

## 1. 先判断属于哪种操作

| 场景                            | 要做的事                                                                                                                  | 不要做的事                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 新环境从未接入 G2               | 环境盘点、备份旧门户、准备对象存储与浏览器可访问地址、部署完整产物、首次接入 Nginx/门户路由、保留旧应用兼容路由、全量验收 | 不要直接覆盖旧门户根目录；不要猜测或复用 133 的配置 |
| 环境已运行 G2，更新全部 G2 内容 | 固定代码版本、全量构建并上传新版本目录、检查 Profile、备份当前活动指针/路由配置、切换到新版本、验收；失败时恢复旧指针     | 不要删除旧版本静态资源；不要在上传完成前切流        |

每个发布版本必须使用唯一、不可变的版本号。新版本上传到新目录；切换只改变活动 Profile/路由，不覆盖旧版本对象。这样回退通常只需恢复旧 Profile/路由。

## 2. 发布边界与关键配置

生产发布选集由 [`deploy/release-sets/prod.yaml`](../../deploy/release-sets/prod.yaml) 定义（当前清单 83 个成员；以执行时仓库文件为准）。发布工具会为全选成员生成带版本号的对象 key，并生成 `registry.yaml`、`prod.resolved.json` 和 Shell Nginx 片段。生产地址模板 [`deploy/address-templates/prod.yaml`](../../deploy/address-templates/prod.yaml) 要求提供：

| 参数                 | 含义                                                                                 | 示例格式（仅格式示例，不可照抄）            |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------- |
| `webReleaseBase`     | 浏览器可直接访问的 G2 静态发布资源根地址；必须可取回 JS/CSS、manifest 和共享 Runtime | `https://<static-host>/<g2-release-bucket>` |
| `backendApi`         | 浏览器使用的主站 API 基址                                                            | `https://<portal-host>/api`                 |
| `staticResourceBase` | 静态业务资源基址                                                                     | `https://<portal-host>/resource`            |

`webReleaseBase` 不能是 localhost、容器内地址、MinIO Console 地址或只供服务器访问的私网地址。若对象存储需鉴权，由 CDN/反向代理向浏览器提供可读资源；不要把 S3 密钥编入前端产物。

浏览器入口、G2 静态资源、Profile、API、资源服务、BFF 路由及旧应用路由可能属于不同主机/路径，必须逐一确认。G2 Shell 作为首页入口，不意味着旧 `/apps`、`/apps-legacy`、认证、WebSocket、文件/资源或旧 BFF 路由可以删除。

## 3. 开始前：目标环境盘点（首次部署必做，升级也要复核差异）

由有目标环境权限的运维人员只读确认并记录以下信息；在变更前不要执行覆盖或重启：

- [ ] 目标环境标识、门户浏览器 Origin、DNS/TLS、可回滚维护窗口、业务负责人及验收账号。
- [ ] 门户容器/进程、宿主机与容器端口、Nginx 主配置/Include、配置挂载和实际生效入口；确认谁管理该配置（容器、主机或平台）。
- [ ] 旧门户首页与所有未迁移子应用的访问路径、静态资源路径、登录回调、API、BFF、WebSocket、文件/资源代理。保存变更前请求/路由清单。
- [ ] Docker 网络（如适用）、服务名、健康检查、重启策略；明确只需 reload Nginx 还是需要变更服务，不要无差别重启。
- [ ] 对象存储的 S3 API endpoint、bucket、region/path-style 要求、上传身份、浏览器读取方式、CORS、缓存策略。确认使用对象 API 端口而非管理 Console 端口。
- [ ] 当前生产组合/Profile、Shell 发布位置、活动版本、发布 registry、BFF 路由归属。确认旧 BFF 是否仍被门户或旧应用使用。
- [ ] 所需权限：仓库读、构建机、S3 上传、目标主机配置备份/发布、Nginx 校验/reload、浏览器验收。未具备权限时停在该步骤，申请最小必要权限。

创建一份本次发布记录（可复制到变更单），填入：

```text
环境名称：<environment>
门户 Origin：<https://portal.example.invalid>
G2 webReleaseBase：<https://static.example.invalid/g2-release>
backendApi：<https://portal.example.invalid/api>
staticResourceBase：<https://portal.example.invalid/resource>
目标代码 commit：<git-sha>
RELEASE_VERSION：<unique-version>
发布操作者 / 时间 / 变更单：<...>
当前活动版本（升级时）：<old-version>
对象存储 endpoint/bucket（不含密钥）：<...>
服务器配置备份位置（受限权限）：<...>
回退负责人及维护窗口：<...>
```

密钥只由批准的密钥管理方式注入（secret manager、受限权限 env 文件或运维平台）；不得写入本文、仓库、命令行明文参数、工单截图或聊天记录。`OAUTH_CLIENT_SECRET` 是 OAuth/BFF 服务端密钥，不是 S3 上传密钥，也不是所有静态发布都必需的参数；只有配置/启动对应 BFF 时才按 BFF 部署手册安全配置。

## 4. 变更前备份与保护旧环境

### 首次部署

- [ ] 备份门户 Nginx 主配置及所有相关 Include、活动 Profile/alias、容器启动参数和挂载；备份仅存放在受限位置。
- [ ] 记录旧门户镜像/进程版本、容器网络、端口、健康状态和回退命令。
- [ ] 导出或截图记录旧首页、登录、至少一个旧子应用以及关键 API/认证/WebSocket 路由的当前状态。
- [ ] 确认旧静态文件和旧服务仍可用；不删除、不改名、不覆盖。

### G2 已上线环境升级

- [ ] 记录当前活动发布版本、正在使用的 `prod.resolved.json`、registry、Shell 路由片段及对象存储 key。
- [ ] 备份活动 Profile、Nginx Include/alias/配置映射；确认可以原子恢复。
- [ ] 确认旧版本对象仍在存储且可读。若旧版本缺失或无法回退，先补足回退能力再发布。

## 5. 本地准备、质量门禁与全量构建

1. 在仓库根目录确认本次目标 commit 和工作区状态。推荐从已 review 的干净 commit/固定 CI artifact 发布；若必须包含未提交改动，先经用户/变更流程确认，记录完整 diff，并用唯一版本号发布，不能把“当前工作区”误认为可复现版本。
2. 按改动范围运行测试、类型检查和 lint。至少执行生产组合与依赖门禁：

   ```bash
   bun run validate:compositions
   bun run check:deps
   bun ./tooling/runtime-common-check/src/cli.ts --profile
   bun ./tooling/runtime-common-check/src/cli.ts --changed-from=<reviewed-base-ref>
   ```

   如果工具 CLI/参数随仓库版本变化，以当前 `--help` 和 CI 配置为准；门禁失败不得继续发布。

3. 为所有生产发布成员清理/重建可发布产物。使用干净 checkout 或确认清理范围只覆盖生成的 release-member `dist`，不误删用户文件。注意旧 `dist` 可能留下未被本次构建重新生成的旧文件，造成版本目录混入陈旧内容。
4. 确认生产地址在构建前绑定，特别是 `webReleaseBase` 会作为共享 Module Federation Runtime 的运行时基址写入产物。可用 CLI 参数覆盖地址模板：

   ```bash
   RELEASE_VERSION=<unique-version> \
   bun tooling/release/src/cli.ts generate --set=prod \
     --out-dir=.deploy-out/prod \
     --env webReleaseBase=https://<static-host>/<bucket> \
     --env backendApi=https://<portal-host>/api \
     --env staticResourceBase=https://<portal-host>/resource
   ```

   命令会构建整个 prod release set，并生成部署配置。`<...>` 必须替换为实际、非空地址。若需从安全 env 文件载入，使用 `--env-file=<path>`；文件不要入 Git，权限应限制。发布号建议形如 `<date>.<commit>.<change-id>`，同一发布的 generate/upload 必须使用完全相同的 `RELEASE_VERSION`。

5. 检查生成结果：

   - [ ] `.deploy-out/prod/registry.yaml` 包含所有选集成员且 key 指向本次唯一版本目录。
   - [ ] `.deploy-out/prod/prod.resolved.json` 是有效 JSON，所有 remote entry 均解析为正确的浏览器可访问地址。
   - [ ] `.deploy-out/prod/shell-location.conf` 指向本次 Shell key。
   - [ ] 输出中没有 `localhost`、开发域名、错误环境 IP、空地址、秘密值或未迁移页面的错误映射。
   - [ ] Shell HTML/JS 与 MF Runtime 里没有残留旧的 `localhost:8081` 等本机运行时基址。
   - [ ] 构建产物涵盖当前 `prod.yaml` 全部成员；manifest、入口和其引用的所有 JS/CSS/字体/图片文件齐全。

   若当前发布 CLI 对 registry 与构建产物的扫描命令有所变化，应先阅读 `bun tooling/release/src/cli.ts --help` 和 release 工具说明，再按输出清单核验；不要仅凭 build 成功判定可发布。

## 6. 上传完整生产静态发布

1. 准备到目标 S3 兼容存储的网络访问与最小权限上传身份。密钥通过安全环境注入；不要在命令参数中传密钥。
2. 确保 `RELEASE_VERSION` 与上一节完全一致，然后上传 prod 全集：

   ```bash
   RELEASE_VERSION=<unique-version> \
   bun tooling/release/src/cli.ts upload --set=prod
   ```

   CLI 的凭据/endpoint 配置依当前 release 工具的安全配置读取方式提供。不要假设 133 的 tunnel、服务名、端口或服务器私有 `release.env` 能在新环境复用。

3. 上传完成后，先对对象存储/CDN 做只读验证，不切门户流量：

   - [ ] 通过浏览器实际访问的 `webReleaseBase` 检查本次 Shell `index.html`、全部 manifests、共享 MF Runtime、入口 chunk 和 CSS 返回成功。
   - [ ] 检查浏览器 Origin 的 CORS、Content-Type、缓存控制正确；版本化 JS/CSS 可长期 immutable 缓存，registry/Profile 应短缓存或 revalidate。
   - [ ] 用 `prod.resolved.json` 中每个生产 entry URL 逐个 HTTP GET 验证，不只检查 bucket 内部文件。
   - [ ] 确认 URL 不会被重定向到 Console、登录页或 HTML 错误页；JS 响应 MIME 正确。
   - [ ] 保留旧版本对象；禁止为“清理空间”在本次切换时删除旧目录。

如果桶默认私有，应通过受控 CDN/门户 Nginx 对外提供只读资源访问；不要给浏览器或 G2 静态包暴露上传凭据。

## 7. 目标服务器接入与切流

### 首次部署额外步骤

- [ ] 在门户现有配置管理方式中准备独立 G2 路由 Include/资源映射和 `prod.resolved.json` 服务路径；先在临时/候选配置校验。
- [ ] 以最小差异接入 G2 Shell 首页和生产 Profile；保留旧门户子应用路径、`/api`、`/resource`、认证、WebSocket 及旧 BFF 的既有映射。
- [ ] 如果默认路由会让所有未迁移页面都落入 G2，先确认旧门户的 qiankun/兼容导航仍可达，且目标用户菜单配置完整。
- [ ] 不要以本手册的示例 Nginx 片段替代目标环境现有配置；按实际 Include 顺序、容器文件系统和挂载点合入。

### 每次升级共同步骤

1. 将本次 `.deploy-out/prod/prod.resolved.json` 与 Shell 路由片段复制到目标环境受控 staging 目录；不直接覆盖活动文件。
2. 核对文件权限、环境标识、版本号、资源基址以及全部 remote entry。
3. 备份活动文件后，将候选配置原子切换到活动位置；若 Nginx 指向的路径/Include 发生变化，先运行目标主机/容器内正确的配置校验（例如 `nginx -t`），成功后才 reload。
4. 仅在确实需要时 reload 目标门户 Nginx；不得无理由重启门户、BFF 或所有容器。确认 reload 成功和进程健康。
5. 记录活动版本切换时间与文件校验和。保留上一个活动 Profile 和 Nginx 配置以便立即回退。

**BFF 边界：** 本手册只发布 G2 静态 prod release set 与门户指向配置。若此次 G2 版本也要求更新 `g2-bff` 镜像、环境变量或认证配置，应另行盘点上游地址、OAuth client/secret、旧 BFF 共存和路由归属，按该环境的 BFF 专项变更计划重建/健康检查；单纯 `docker restart` 不会自动重读新的环境变量。不得为了部署静态包而覆盖旧 `ghcloud-bff` 或改变旧应用正在使用的 `/gw-bff`。

## 8. 本地/目标环境验收闭环

切流后使用真实测试账号，在目标环境浏览器打开门户（无缓存或强制重新加载），记录 Network、Console 和测试结果。至少完成：

### 入口与静态资源

- [ ] 门户根地址返回预期 G2 Shell，而非旧首页、对象存储 Console 或错误页。
- [ ] 活动 `prod.resolved.json` 返回 200 且是正确版本；Shell JS/CSS 和 MF Runtime 均 200、MIME 正确。
- [ ] 所有生产 Profile remote manifest 与入口加载成功，无 CORS、Mixed Content、404、模块加载超时。
- [ ] 页面 Console 无新增相关 JS 错误、未处理 Promise rejection、Module Federation 警告。

### 登录、路由及新旧应用共存

- [ ] 登录、刷新/续期、退出流程正确；用户/租户切换按账号权限工作。
- [ ] 从导航逐个打开本次 prod Profile 中所有已启用 G2 应用，至少覆盖每个本次变更的 Domain 的关键页面/核心动作。
- [ ] 打开至少两个仍由旧门户承载的未迁移子应用，确认路由、返回导航、静态资源均正常。
- [ ] 在 Network 检查 `/api`、`/gw-bff`（如适用）、旧 `/apps`/`/apps-legacy`、`/resource`、`/third-auth`、WebSocket 的 URL、方法、状态码、请求参数和响应；没有错误地指向新环境之外的地址。
- [ ] 对保存/提交类动作使用批准的测试数据，确认服务端结果并清理测试数据（如流程要求）。

### 记录结果

| 检查项                       | 结果/证据链接 | 操作者/时间 |
| ---------------------------- | ------------- | ----------- |
| 页面入口与 Profile           |               |             |
| Shell、Runtime、remote 资源  |               |             |
| 登录与租户切换               |               |             |
| G2 已迁移应用抽检/变更域全测 |               |             |
| 旧子应用兼容                 |               |             |
| API/BFF/认证/资源/WebSocket  |               |             |
| Console 与网络错误           |               |             |
| 回退文件和旧版本可用         |               |             |

若验收出现持续 401/403/5xx、旧应用不可用、关键 remote 无法加载或 Console 中断性错误，立即停止扩大验证并回退；不能将“页面能打开”视为全量验收通过。

## 9. 回退流程

1. 停止后续发布和清理任务，记录故障时间、URL、Network 响应、Console 错误与当前版本。
2. 恢复发布前备份的活动 `prod.resolved.json`、Shell 路由片段/alias 与 Nginx Include（按该环境真实配置位置执行）。
3. 如果 Nginx 配置发生变化，先校验候选恢复配置，再 reload；不要直接重启所有服务。
4. 用无缓存浏览器重新登录/打开首页，确认旧活动 Shell、G2 应用和未迁移旧子应用恢复；检查关键 API/BFF 路由。
5. 不删除失败版本产物，便于排查；记录回退结果。待根因修复、重新构建新唯一版本并重新验收后再切换。

## 10. 常见失误与安全注意

- `webReleaseBase` 使用 localhost/开发地址：构建看似成功，但生产浏览器会从访问者自己的 localhost 请求 Runtime。必须在生成/构建时指定目标环境地址并扫描产物。
- 复用旧 `dist`：旧文件可能被一并上传到新版本目录。优先用干净 checkout；清理前确认目录均为生成物，再完整重建。
- 只上传 Shell：Module Federation remote 和共享 Runtime 也必须包含在 release set 中；本手册默认发布 `prod` 全集，不使用 `--only` 做全量更新。
- 只检查对象存储内部地址：浏览器访问的 CDN/反代可能有错误端口、权限、CORS 或 Content-Type；必须从目标浏览器 Origin 验证。
- 覆盖旧首页或删除旧路由：迁移未完成的子应用仍依赖旧门户路径。每次变更都要回归旧应用。
- 把 BFF 与静态资源发布混为一谈：静态包上传不等于 OAuth/BFF 配置完成；BFF 要独立部署、健康检查和路由验收。
- 把 133 环境特定的主机路径、私网端口、MinIO endpoint、容器名、Nginx include、凭据复制到新环境。133 只可作为案例参考，必须针对目标环境重新盘点。
- 将 `OAUTH_CLIENT_SECRET`、S3 access key/secret、SSH 密钥/密码写入仓库或本手册。发现密钥曾泄露时应立即轮换。

## 11. 参考资料

- [133 环境部署记录与已知拓扑](2026-09-21-g2-dev-server-133-deployment.md)（仅作案例，不作为新环境参数来源）
- [243 手动发布与验证清单](2026-09-22-g2-243-manual-release-checklist.md)（目标环境差异应重新核实）
- [Web Release CDN 设计与实现计划](2026-07-22-web-release-cdn.md)
- [Runtime Common 静态迁移标准](../runtime-common-migration-standard.md)
- [`prod` 发布选集](../../deploy/release-sets/prod.yaml)
- [`prod` 地址模板](../../deploy/address-templates/prod.yaml)
