# G2 开发环境 133 门户替换部署计划

## 目的与边界

本计划在 **192.168.0.133 开发环境** 将现有 ghcloud 门户首页替换为 G2 PC Shell，并让 G2 当前已迁移的全部子应用由 Module Federation 装载。未迁移的业务应用继续沿用 ghcloud 的 qiankun 微应用清单和后端服务，不做一次性全量替换。

本计划不在 192.168.0.243 执行部署或修改；243 仅可能作为已有接口、OUAA 或旧环境配置的对照来源，是否访问须另行确认。

所有服务器密码、OAuth Secret、S3/CDN 凭据及 Token 均不得写入本文件、Git、命令历史或浏览器前端配置。它们只能存放在服务器受限权限的环境变量、密钥文件或既有凭据系统中。

## 当前进度

更新时间：2026-10-08

| 阶段                 | 状态                                   | 已完成                                                                                                                                                                       | 下一步                                                                                            |
| -------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 范围确认             | 完成                                   | 确认目标为 `.133`；首页直接替换；覆盖 G2 当前已迁移子应用；复用现有 CDN                                                                                                      | 服务器只读盘点                                                                                    |
| 服务器盘点与备份     | 完成                                   | 已完成只读盘点、创建并校验门户恢复副本、确认 MinIO S3 API 与浏览器 CORS 预检                                                                                                 | 准备最简 G2 发布配置                                                                              |
| 发布配置准备         | 完成                                   | 已创建独立 bucket、根权限私有发布配置和最简服务器目录；已实测匿名读取、CORS 与 MIME                                                                                          | 在固定 Git SHA 上构建并生成 G2 发布产物                                                           |
| G2 构建与发布        | 完成                                   | 工作区版本 `20261008.runtimecommon.d189ca2` 的 83 个 prod 成员及 MF Runtime 已上传；143/143 构建任务成功；产物扫描无本地 Runtime URL；关键对象 GET/CORS 检查通过             | 后续代码变更需使用新的不可变版本重新发布                                                          |
| 门户切换             | 完成                                   | 已备份 live nginx include 与 Profile；`common.conf` 和 resolved Profile 指向 `20261008.runtimecommon.d189ca2`；nginx 检查与 reload 成功；线上首页/Profile SHA 与发布文件一致 | 如发现故障按备份步骤回退                                                                          |
| 运行时验收与回退演练 | 按用户决定视为本次替换通过（部分验证） | 133 首页、Profile、新 Shell、关键 manifests、MF Runtime、旧 workbench qiankun 路由均通过 HTTP smoke/CORS 检查                                                                | 尚未做浏览器登录、所有已迁移 Domain 业务链路、未迁移 qiankun 交互及回退演练；需要完整证据时再补验 |

**当前结论：**`.133` 已切换到工作区发布版本 `20261008.runtimecommon.d189ca2`。版本标识中的 `d189ca2` 是构建时 HEAD；Runtime Common 整改尚未提交，因此该发布内容不等同于该 Git SHA 的干净 checkout。当前 G2 BFF、旧 ghcloud BFF 及其余 nginx upstream 未变。

### 2026-10-08 Runtime Common 工作区版本发布与 133 切换

- 版本：`20261008.runtimecommon.d189ca2`；基于 HEAD `d189ca2` 加当前工作区未提交改动生成，避免覆盖旧版本 `20261008.d189ca2`。
- 构建与门禁：完整 prod release set Turbo 任务 `143/143` 成功；Runtime Common profile 矩阵 53 remotes、2 page libraries、17 providers 通过；发布产物中 publishable 文件扫描未发现 `localhost:8081`。全仓 lint 仍有 49 个既有 error，均不在本轮变更文件中；本轮改动文件 lint 无 error（有 import-sort 警告）。
- 上传：83 个 release-set 成员及 `_mf/runtime/2.8.0/mf-runtime.js` 全部上传成功。Shell `index.html`、PC Chrome、工厂管理、考勤 manifests 与 MF Runtime HTTP GET 均为 200；代表性 manifest/Runtime 对门户 Origin `http://192.168.0.133:40201` 返回允许 CORS。
- 切换备份：`/home/dev-ops/backup/g2-runtimecommon-precutover-20261008-1800/`，包含切换前 live `common.conf`、门户 resolved Profile、registry、deploy resolved 与 shell location 配置及 SHA-256 清单。
- 切换动作：将 `/home/dev-ops/bimops/front-end/nginx/conf/other/g2/common.conf` 中四处 `20260921.65cdd51` 指针改为新版本；原子替换 `/home/dev-ops/data/front-end/apps/.g2/prod.resolved.json`；同步 `/home/dev-ops/g2/deploy-out/prod/` 中 registry/resolved/shell-location；`docker exec bimops-fe nginx -t` 成功后 reload。未重启或更改 `bimops-fe`、`g2-bff`、`ghcloud-bff` 容器。
- 线上 smoke：门户 `/`、`/compositions/prod.resolved.json`、`/apps-legacy/workbench-migrate/` 均 HTTP 200；门户首页响应 SHA-256 与新 CDN Shell 一致，Profile 响应 SHA-256 与安装文件一致；Profile 无 `localhost` 或 `127.0.0.1`，live include 不再包含旧版本指针。
- 验收边界：用户要求将本次作为验收通过，且据此完成切换；本轮没有通过浏览器完成登录、逐 Domain 核心业务路径、旧 qiankun 交互与回退演练，因此这些不作为已实际验证项。
- 回退：从上述备份恢复 `common.conf` 与 `portal-prod.resolved.json`，再执行 `docker exec bimops-fe nginx -t && docker exec bimops-fe nginx -s reload`；CDN 旧版本资源保留。

### 2026-10-08 本地静态产物上传（仅发布，不切换）

- 目标提交与版本：Git `d189ca2`，版本 `20261008.d189ca2`；prod release set 共 83 个成员，发布命令全部完成并返回成功。
- 构建：全量 Turbo 发布构建没有正常退出，停在 `@g2-platform/pc-auth` 与 `@g2-domain/energy-consumption` 两个子任务；两者随后分别以 `NODE_ENV=production`、`VITE_RESOLVED_PROFILE_URL=/compositions/prod.resolved.json`、`G2_MF_RUNTIME_BASE=http://192.168.0.133:9091/g2-web-release` 独立生产构建成功。其他成员在全量构建输出中已完成；上传前生成清单并核验本地 Git 工作区仍干净。
- 上传与远端校验：通过服务器 root-only 发布凭据和临时 SSH 转发上传；`pcShell/20261008.d189ca2/index.html`、`securityMonitor/20261008.d189ca2/mf-manifest.json`、`energyConsumption/20261008.d189ca2/mf-manifest.json`、`_mf/runtime/2.8.0/mf-runtime.js` 的 HTTP GET 均为 200。
- 未执行：未同步新的 `resolved.json`、`shell-location.conf`，未 reload nginx，未改动 BFF 或门户入口；新版本仍为待启用版本。运行时页面验收及切换前状态复核未完成。
- 凭据处理：发布凭据仅从服务器 root-only 环境文件经 SSH 通道注入进程，没有写入本地文件或计划文档；本次临时 SSH 转发已关闭。

### 2026-10-08 切换前置检查（未切换）

- 收到切换授权后，在服务器写入前执行 `bun run validate:compositions`，通过；执行 `bun run check:runtime-common -- --profile`，失败，包含 consumer matrix 缺项、业务 Domain 静态导入 `@g2-platform/pc-ui` 及未声明 `pcUi` Runtime Common 依赖等诊断。
- 根据 Runtime Common 静态迁移标准暂停切换；本轮未改写 `.133` 的 `resolved.json`、`shell-location.conf`、nginx 或门户路由。由于入口未切换，未进行线上浏览器验收。

### 2026-10-08 Runtime Common 门禁整改（本地，未发布）

- 为 `meetRoom`、`workReport`、`governmentManagement`、`consumptionManagement`、`personManagement`、`factoryManagement`、`smallEngineering`、`attendance` 增加 fail-closed `pcUi` 运行时代理；业务初始化前加载 Runtime Common，移除 Vite Federation 中对 `pc-ui` 的静态共享，并将 provider 包移至开发依赖。
- 考勤地图改为通过领域上下文运行时加载 `pcMap`；同步修正生产 consumer matrix（包括工厂管理实际加载的 `pcChart`）。
- 验证：全量 `--profile`（53 remotes、2 page libraries、17 providers）通过；8 个 Domain 的 typecheck/test、生产构建及逐包 Runtime Common 产物扫描通过；`validate:compositions` 与 `git diff --check` 通过。
- 未执行：未把整改后的产物上传至 `.133`，未切换线上门户入口；线上浏览器验收仍待完整发布与单独切换后执行。

### 本轮构建记录

- 发布版本：`20260921.65cdd51`（基于 Git `65cdd51`）；该版本按现有规则不区分工作区未提交改动。因此本次发布记录必须明确包含下列未提交皮肤相关文件：`apps/platforms/pc-chrome/src/skin-theme-vars.ts`、`skin-theme.ts`、`skin-theme.verify.vitest.ts`、`skin-theme.vitest.ts`、`apps/platforms/pc-ui/src/zh-config-provider.ts`、`zh-config-provider.test.ts`。
- 已通过：`bun run validate:compositions`、`bun run typecheck`、PC Chrome 与 PC UI 关联测试（共 53 个测试通过）、发布工具单元测试（31 个通过）、`git diff --check`。
- Lint：根命令未通过，报告了仓库既有的大量 warning，并包含上述文件的 import 排序等 warning；不把它作为通过项。
- 发现与处理：曾有两条早于本轮任务约 5 小时的遗留 Vite 构建进程（`command-dispatch`、`access-control`），导致全量 Turbo 构建停滞。经确认后已停止这两条本机构建进程；重新以默认并发度执行的全量构建通过（88/88）。为后续人工故障处理，发布工具支持可选 `G2_RELEASE_BUILD_CONCURRENCY` 环境变量，默认仍为 `4`。
- 发布证据：已上传所有 release-set 成员和 `_mf/runtime/2.8.0/mf-runtime.js` 至 `g2-web-release`；`pcShell/index.html` 返回 HTTP 200 与 `text/html`，`pcChrome/mf-manifest.json` 返回 HTTP 200 与 `application/json`，两者均允许门户来源跨域读取。
- 部署配置：`registry.yaml`、`resolved.json`、`shell-location.conf` 已同步到 `/home/dev-ops/g2/deploy-out/prod/`；服务器 SHA-256 与本机生成物完全一致。Profile 含 19 个平台、38 个客户端、1 个页面库和 24 个 G2 remotes，所有 entry 指向 `http://192.168.0.133:9091/g2-web-release` 的版本化资源，未发现 `localhost` 或 `127.0.0.1`。
- 安全清理：用于上传的临时本机凭据文件和 SSH 端口转发已清理；服务器原始 root-only 发布凭据未改动。
- BFF：固定 SHA 的 BFF 镜像 `g2-bff:20260921.65cdd51` 已在 `.133` 原生 Linux Docker 构建。由于该服务器默认 Docker Hub mirror 的 DNS 不可用，构建改用项目 Dockerfile 已声明的 `docker.m.daocloud.io/oven/bun:1.3.14` 镜像源；依赖安装成功。容器 `g2-bff` 已加入既有 `kaihe` Docker 网络并独立映射宿主机 `4030`；状态 `running/healthy`，`http://127.0.0.1:4030/health` 返回 HTTP 200 和 `@g2-server/bff` 服务标识。登录代理实测使用无效参数返回 OUAA 的 `401 CAPTCHA_ERROR`，证明 BFF 已注入配置并抵达上游；该请求未创建有效会话。它尚未接管 `/gw-bff`，旧 `ghcloud-bff` 未停止或修改。

### 2026-09-29 本地工作区静态产物上传（仅发布，不切换）

- 构建版本：`20260929.65cdd51`。发布选集覆盖 83 个成员；Turbo 任务 `89/89` 成功。构建期间发现 `apps/domains/security-monitor/src/views/patrol-pages.tsx` 重复声明 `CubePlayerComponent`/`CubePlayer`，删除重复声明后该包及完整 prod 构建通过。
- 地址与 Profile：`resolved.json` 中 entry 指向 `http://192.168.0.133:9091/g2-web-release`；对 `.deploy-out/prod/resolved.json`、`registry.yaml` 检查未发现 `localhost` 或 `127.0.0.1`。Runtime Common 产物检查通过；依赖矩阵检查通过（24 remotes、1 page library、17 Core Runtime providers）。
- 上传范围：通过 SSH 将 2,114 个对象（34.59 MiB）写入 `g2-web-release` 的 `20260929.65cdd51` 版本目录；已有 `_mf/runtime/2.8.0/mf-runtime.js` 与本地产物 MD5 一致，故未覆盖该共享对象。上传只增加新版本对象，不删除旧版本。
- 远端验收：`.133` 浏览器资源入口 GET `pcShell/index.html`、`pcUi/mf-manifest.json`、`genericEquipmentMonitorPages/mf-manifest.json`、`securityMonitor/mf-manifest.json` 均为 HTTP 200，MIME 正确且允许门户 origin 跨域读取；PC UI、通用设备监控页面库、安全监控的 `remoteEntry.js` 均为 HTTP 200；共享 MF Runtime GET 为 HTTP 200。
- 未执行：未上传/同步新 `resolved.json`、`shell-location.conf`，未 reload nginx，未修改 BFF 或门户入口；新版本尚未切换启用。
- 清理与留档：本机 73 MB 临时打包目录、服务器失败归档及解包暂存目录已清理；成功归档保留于 `/home/dev-ops/g2/release/g2-20260929.65cdd51-assets-linux.tar.gz`（约 11 MB），仅含静态资源，不含凭据。

### BFF 兼容性比对（2026-09-21）

对照目录：G2 的 `bff/src` 与 ghcloud 的 `prod/cube-services/gateway/src`。本轮仅进行本地源码只读比对，没有合并代码、变更服务器或变更 nginx。

- 结论：G2 BFF **尚未完整覆盖** ghcloud BFF，不能直接停止旧 BFF 或把 `/gw-bff` 切给当前 G2 BFF。
- 明确缺口：ghcloud 的 `POST /gw-bff/emergency/plan-ai/tasks/decompose` 在 G2 中不存在；其配套的应急预案 AI 控制器、业务服务、预案代理和知识文档解析代理共 8 个 TypeScript 源文件也不存在。
- 该能力依赖既有 `AI_APPLICATION_URL` 与 `EMERGENCY_URL`，并从字典读取任务拆解流程配置；G2 已具备前两个通用配置项，但没有该路由和实现。
- G2 已新增 ghcloud 没有的指挥调度、日常任务、文件、安全教育和安防监控等 BFF 能力；共同控制器的基础路由保持 `/gw-bff`，其中应急调度额外增加了疏散路线接口。
- 切换前阻塞项：以 ghcloud 源码为基准，将上述缺口迁入 G2（替换为 `@g2-contract` 对应契约或补齐最小契约），为旧路由增加集成测试，并以真实旧门户请求逐项验证。验证通过后，nginx 的 `/gw-bff` 只指向 G2 BFF；旧 `ghcloud-bff` 才可停止并保留镜像/配置用于回退。

### BFF 兼容代码合并（2026-09-21）

- 已在本地 G2 工作区合入 `POST /gw-bff/emergency/plan-ai/tasks/decompose` 及应急预案 AI 的控制器、流程调用、预案模板匹配、知识文档预览与文件下载元数据兼容实现。
- 新增纯类型契约包 `@g2-contract/emergency-plan-ai`；原 ghcloud 接口的请求、响应和错误结构保持不变。
- 验证通过：新增契约类型检查；BFF 全量测试 `44` 项通过，其中新增路由集成测试实际启动本地 BFF、请求旧路径并验证无效参数返回 `400`，预案内容解析测试 `3` 项通过。
- 未执行：未在 `.133` 构建新镜像、未替换容器、未改 nginx、未停旧 `ghcloud-bff`。尚需对真实上游（字典、AI Application、应急服务、文件服务）使用可用业务会话完成端到端验收后，才能进行单 BFF 切换。

### `.133` 单 BFF 替换准备（2026-09-22）

- 已复核：`/gw-bff` 仍由 `bimops-fe` 的 nginx 配置转发到 `ghcloud-bff:3000`；隔离验证用的旧版 `g2-bff` 仅监听宿主机 `4030`，尚未接流量。
- 已创建 root-only 回退备份：`/home/dev-ops/backup/g2-bff-precutover-20260922-0910`，包括旧 `ghcloud-bff` 容器与镜像检查记录、nginx `common.conf`、前端 Compose 文件和原 `g2-bff` 容器检查记录；备份校验清单已生成。
- 待执行：上传合并后的 BFF 源码到独立构建目录、构建新 G2 BFF 镜像、健康检查与真实上游验收、将 nginx `/gw-bff` 切至单一 G2 BFF、reload nginx、验证并停止旧容器。
- 已完成：SSH 恢复后，已上传合并源码至独立目录并构建 `g2-bff:20260922-compat`；候选容器经 health 和旧路径验证后提升为 `g2-bff`（宿主机 `4030`）。nginx `/gw-bff` 已持久化为 `proxy_pass http://g2-bff:3000`、语法检查并 reload 成功；门户入口的 `/gw-bff/auth/token` 与 `/gw-bff/emergency/plan-ai/tasks/decompose` 均返回预期的 `400`。CORS 预检返回 `204` 并允许门户 origin。
- 已停止旧容器：`ghcloud-bff` 状态为 `exited`，其镜像、容器配置和 nginx 原配置均保留在上述 root-only 备份中；`g2-bff` 为 `running/healthy`，重启策略为 `unless-stopped`。宿主机与容器内 nginx `common.conf` SHA-256 已一致。
- 未验证：尚未用真实业务会话覆盖 OAuth 成功登录、字典、AI Application、应急服务和文件服务的完整任务拆解链路；该项不阻塞基础路由切换，但仍是首页切换前验收项。

## 133 第一轮盘点结果

盘点时间：2026-09-21。执行方式：SSH 只读检查；没有执行写入、容器重启、nginx reload、上传或删除操作。

| 项目           | 已确认事实                                                                                                                                        | 对 G2 部署的影响                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 操作系统与容量 | Rocky Linux 9.8；根分区可用约 67 GB，`/home` 可用约 334 GB                                                                                        | 容量足够承载构建缓存、备份和新增 G2 发布对象；实际发布仍应避免在根分区堆积构建产物 |
| 当前门户       | Docker 容器 `bimops-fe`，镜像 `nginx:1.30.1-custom`，对外端口 `40201`                                                                             | 首页替换应修改该容器绑定的 nginx/静态目录配置，而不是新建无关入口                  |
| 门户挂载       | 前端应用目录挂载为 `/home/dev-ops/data/front-end/apps`；nginx 配置在 `/home/dev-ops/bimops/front-end/nginx/conf`；门户 `config.js` 是独立绑定文件 | 这些路径是阶段 2 的精确备份目标；修改前必须先做带时间戳的可验证副本                |
| 旧门户入口     | `40201` 的 root 是 `/apps/@ghcloud-legacy/bimops-fe-web-migrate`；首页、`/config.js` 和 `/apps-legacy/workbench-migrate/` 的 HTTP 检查均为 200    | 可保留旧首页目录作为回退源；G2 Shell 不应覆盖或删除该目录                          |
| 旧应用兼容     | `pc-config.js` 含完整 `microApps` 清单，旧应用分别位于 `/apps` 和 `/apps-legacy`                                                                  | G2 Shell 可读取该清单并仅排除已迁移 Domain 的显式映射，其他应用保持原路由          |
| API 与旧 BFF   | nginx 保持 `/api` -> `:3200`，`/gw-bff` -> 容器 `ghcloud-bff:3000`，`/resource` 当前走本地 `/static`，另有 `/file`、`/minio` 代理                 | 切换时这些旧代理不可整体替换；需要只为 G2 增加明确的 BFF 策略，并验证双轨请求      |
| nginx 健康     | 当前 `bimops-fe` 的 `nginx -t` 通过                                                                                                               | 变更后必须先跑同一语法检查，成功后才允许 reload                                    |
| MinIO          | 已有运行中的 `minio` 容器，数据目录 `/home/dev-ops/data/minio/data`；控制台映射 `9003`，S3 API 映射 `9091`                                        | **不新增 MinIO 容器**；复用该服务作为 G2 发布对象存储                              |
| 对象存储现状   | 已存在 `ghcloud-web-static` 等业务 bucket；现有 bucket 主要用于静态业务资源，未发现 G2 版本化发布目录                                             | G2 必须使用独立 bucket，例如 `g2-web-release`，避免与旧业务资源混用                |

### 已验证的 CDN 结论

现有 MinIO 具备 G2 发布工具所需的 S3 兼容 API，因此不需要新增 MinIO。后续应在当前 MinIO 中创建独立的 `g2-web-release` bucket，并为其配置：

1. 发布端的 S3 凭据与最小权限（bucket 创建、上传、列举及读取校验）。
2. 浏览器对发布对象的匿名只读或受控只读策略。
3. G2 Shell 所需的 CORS 规则、正确 MIME 类型和缓存策略。
4. 独立的 `webReleaseBase`。优先使用 MinIO S3 API 的独立浏览器可达 origin；若以门户 `/minio/` 路径提供，必须额外确认它不会与项目“Shell 主站与发布 CDN 分离”的约定冲突。

当前尚未读取或输出 MinIO 访问密钥，也尚未创建 bucket、设置策略或上传文件。这些属于后续写操作。

## 已完成的门户恢复基线

备份时间：2026-09-21 15:35 CST。

- 备份目录：`/home/dev-ops/backup/g2-portal-precutover-20260921-1535`
- 目录权限：仅 root 可读取。
- 已备份内容：门户 nginx 配置、`pc-config.js`、前端 compose 配置、当前 `bimops-fe-web-migrate` Shell 静态目录、容器状态和 nginx 语法检查结果。
- 已生成文件：`RESTORE.txt`（人工恢复步骤）、`SHA256SUMS`（关键配置校验）。
- 校验结果：`pc-config.js`、compose 文件和 `nginx.conf` 的 SHA-256 校验全部通过。
- 备份后基线检查：`http://127.0.0.1:40201/`、`/config.js`、`/apps-legacy/workbench-migrate/` 均返回 HTTP 200。

恢复方式刻意保持简单：把备份中的 nginx、`pc-config.js`、compose 和 Shell 目录复制回原路径，执行 `docker exec bimops-fe nginx -t`，成功后执行 `docker exec bimops-fe nginx -s reload`，再重测上述三个地址。不得删除旧 Shell 目录或备份目录。

## 已验证的 MinIO 浏览器访问能力

对现有 `ghcloud-web-static` bucket 发起浏览器来源为 `http://192.168.0.133:40201` 的 GET 预检，MinIO 返回 `204`，并包含：

- `Access-Control-Allow-Origin: http://192.168.0.133:40201`
- `Access-Control-Allow-Methods: GET`
- `Access-Control-Allow-Credentials: true`

因此，现有 MinIO 已具备 G2 Module Federation 资源加载所需的基础跨域能力。创建 `g2-web-release` 后，仍须对新 bucket 做同样的对象读取和 CORS 实测，不能仅根据现有 bucket 推定策略完全继承。

## 已完成的 G2 发布基础配置

配置时间：2026-09-21 15:56 CST。

- 已创建独立 bucket：`g2-web-release`。
- 已配置：匿名下载；不会与 `ghcloud-web-static` 或其他业务 bucket 混用。
- 已创建 root-only 服务器目录：`/home/dev-ops/g2/`，其中包含 `release.env`、`deploy-out/prod/`、`release/` 与人工说明 `README.txt`。
- `release.env` 仅保存本机 MinIO endpoint、bucket、发布地址和 root-only S3 凭据；内容权限为 `0600`，本计划不记录凭据明文。
- 发布对象地址基线：`http://192.168.0.133:9091/g2-web-release`。
- 已上传并读取测试对象 `__g2-probe.txt`：HTTP 200、`Content-Type: text/plain`，并返回门户来源 `http://192.168.0.133:40201` 的允许跨域响应头。
- 配置后旧门户回归：`/`、`/config.js`、`/apps-legacy/workbench-migrate/` 均为 HTTP 200。

此阶段没有把 G2 文件挂入 `bimops-fe`，没有创建 nginx live include，也没有 reload 任何服务。下一阶段的真实发布会先在固定 Git SHA 上构建，并把生成的 `resolved.json` 与 `shell-location.conf` 写入 `/home/dev-ops/g2/deploy-out/prod/`，再进行独立文件审核。

## 现有项目依据

- `deploy/compositions/prod.pc.yaml` 是 PC 门户的组装源 Profile，列出 G2 需要发布、解析和装载的 Client、Platform、页面库及 Domain。
- `deploy/release-sets/prod.yaml` 圈定发布选集；发布命令据此构建并上传 Shell、MF 模块和 Client。
- `apps/shells/pc/src/filter-migrated-qiankun-apps.ts` 保存 G2 Domain 与 ghcloud qiankun 应用名的显式映射。G2 启用某 Domain 时只排除该 Domain 对应的旧应用，防止双重注册。
- `deploy/nginx/default.conf` 定义 G2 主站的必要代理边界：`/api/`、`/apps/`、`/apps-legacy/`、`/resource/`、`/third-auth/` 继续指向旧 upstream，`/gw-bff/` 指向 G2 BFF，Profile 由 `/compositions/prod.resolved.json` 提供。
- 发布系统按“构建 → 生成 registry/Profile/Shell 路由片段 → 上传 CDN → nginx reload”工作；具体约定见 ADR-0052 和 ADR-0055。

## 目标拓扑

```text
浏览器
  -> .133 现有 nginx / 门户入口
       -> G2 PC Shell（替换旧门户首页）
       -> /compositions/prod.resolved.json（G2 已解析 Profile）
       -> G2 发布 CDN（Shell、Platform、Client、Domain 的版本化资源）
       -> /gw-bff/* -> 单一 G2 BFF（兼容旧门户与 G2）
       -> /api、/apps、/apps-legacy、/resource、/third-auth -> 现有 ghcloud upstream
       -> 未迁移菜单 -> 旧 qiankun 应用
       -> 已迁移菜单 -> G2 MF Domain
```

其中“替换首页”仅替换门户 Shell 和已确认迁移完成的应用入口；旧 ghcloud API、旧资源服务及未迁移应用不得因本次变更被删除或停止。

## 阶段 1 只读盘点

### 目标

确定 `.133` 上 ghcloud 的真实运行方式及 G2 可以安全接入的位置。此阶段只读取，不写入、不重启、不 reload 服务。

### 检查项

1. 主机与进程：操作系统、磁盘余量、Docker/Compose、systemd、pm2、nginx、监听端口及运行用户。
2. ghcloud 部署：项目目录、镜像或构建版本、静态目录、环境文件、启动方式、健康检查、日志位置。
3. nginx：实际生效配置、所有 `server`/`location`、默认门户首页、证书、反向代理 upstream、WebSocket 配置和 include 文件。
4. 前端兼容边界：现有 `config.js`、`window.config.microApps`、`/apps`、`/apps-legacy` 路径及 qiankun 子应用的真实入口地址。
5. API 边界：`/api`、`/resource`、`/third-auth` 的 upstream、Host/SNI、Cookie、跨域、WebSocket 和超时设置。
6. CDN：现有域名或服务、S3 兼容 endpoint、bucket、访问策略、已有发布目录结构、缓存规则和可用权限；不读取或输出 Secret 明文。
7. BFF 依赖：OAuth、OUAA、文件、设备、字典、风险管控、视频等实际测试地址，以及它们在 `.133` 网络内的可达性。

### 阶段通过条件

- 明确现有门户入口和不影响旧应用的接入点。
- 明确 G2 CDN、BFF 和 nginx 的落点。
- 输出“保留、替换、待验证”三类服务清单。
- 输出精确备份路径和可回退命令草案，但此阶段不执行回退。

## 阶段 2 备份与回退基线

### 目标

在任何写操作前，获得可验证的旧门户恢复点。

### 必须备份

1. nginx 生效配置、模板、include、证书引用方式和启动参数。
2. ghcloud 的 compose/systemd/pm2 配置、环境变量文件的安全副本、镜像标签或 Git SHA。
3. 当前门户静态目录、`config.js`、微应用清单和首页路由配置。
4. 当前 CDN 的 ghcloud/G2 相关前缀清单及发布版本指针。
5. 切换前的容器状态、端口监听、健康检查结果与关键日志时间点。

### 备份规则

- 备份目录必须位于 `.133` 上可用且权限受控的位置，名称包含时间与当前版本标识。
- 备份完成后随机校验 nginx 配置、首页文件、`config.js` 和运行配置可读取。
- 写清楚“恢复哪个文件、执行哪个 reload、如何确认旧门户恢复”。
- 未完成并验证备份，不得替换首页。

## 阶段 3 G2 测试环境配置与构建

### 人工维护约束

部署实现以“少文件、固定位置、可复制恢复”为准，不引入 Kubernetes、复杂 CI/CD 或自动化切流。后续所有 G2 服务器侧文件统一放在 `/home/dev-ops/g2/`，建议只保留以下可人工维护的内容：

```text
/home/dev-ops/g2/
  .env                 # 仅 root 可读，存放发布与 BFF 密钥
  docker-compose.yaml  # 仅包含 G2 BFF；不改动 ghcloud 容器定义
  deploy-out/prod/     # 生成的 resolved.json 与 shell-location.conf
  release/             # 必要时存放发布记录，不存放源码
```

门户 nginx 对 G2 的接入应使用一个独立 include 文件，例如 `nginx/conf/other/g2.conf`；首页切换只改一个明确的 include 或 root 指向。所有变更前都将该单文件复制进已有备份目录。这样手动回退只需恢复一个 include 文件并 reload nginx，而不需要理解整份 nginx 配置。

### 配置原则

1. 使用现有 CDN；`webReleaseBase` 必须是浏览器可访问的 CDN 根地址，而不是主站的 `/release/` 伪路径。
2. 发布地址、S3/CDN 凭据、OAuth Secret 与 BFF 下游地址仅保存在 `.133` 私有环境配置中。
3. `prod.pc.yaml` 中每个启用的逻辑名都必须存在于发布选集、生成 registry 和 CDN 产物中。
4. 对当前已迁移 Domain，逐项检查 `applicationCode`、`navigateCodes`、`intentCodes` 和旧 qiankun 名称映射；不以名称猜测替换关系。
5. 未迁移应用不能被错误加入 G2 的过滤范围，保证它们继续被 qiankun 注册。

### 构建与静态验证

在固定 Git SHA 的独立工作目录中执行：

1. 检查工作区 diff，排除与部署无关的本地修改。
2. Composition 校验。
3. Typecheck、Lint、相关测试和发布选集 Build。
4. 使用 `.133` 的私有发布环境变量执行 release generate，得到：
   - `registry.yaml`
   - `resolved.json`
   - `shell-location.conf`
5. 审核 `resolved.json`：每一个 `entry` 必须是目标 CDN 上的正确版本化地址；Shell 路由片段必须只指向同批 Shell 版本。

### 阶段通过条件

- 全部所需构建与校验通过。
- 生成物未包含 Secret。
- Profile 中无缺失模块、错误环境域名或本地开发 URL。
- 将要替换的 G2 Domain 与将保留的 qiankun 应用形成可审阅清单。

## 阶段 4 发布 CDN 与部署 BFF

1. 上传同一 Git SHA 的 Shell、Platform、Client、页面库与 Domain 构建产物至现有 CDN。
2. 对 Shell `index.html`、各模块 `mf-manifest.json` 及关键 JS/CSS 做 HTTP 校验：状态码、Content-Type、缓存头和资源引用必须正确。
3. 补齐并部署统一 G2 BFF，但暂不改门户首页路由；不得以长期双 BFF 路由作为交付方案。
4. 验证 BFF 健康检查、OAuth token 代理、ghcloud 旧门户 BFF 路由和至少一个已迁移服务接口；失败必须返回明确服务错误，不能返回 Shell HTML。
5. 发布 `resolved.json` 与 `shell-location.conf` 至 nginx 使用的受控目录，并在变更前后二次比较文件内容。

## 阶段 5 首页替换

### 前置审批门槛

在执行 nginx 或首页路由变更前，必须完成并记录：

- 阶段 1 至 4 的通过证据。
- 备份位置与恢复步骤。
- 变更文件清单、前后 diff、影响的端口和服务。
- 预计窗口和切换后验证路径。

### 执行步骤

1. 再次记录当前服务状态与 nginx 配置哈希。
2. 写入或启用 G2 Shell 路由片段及已解析 Profile。
3. 保持旧 `/api`、`/apps`、`/apps-legacy`、`/resource`、`/third-auth` upstream 不变；将 `/gw-bff` 一次性切至已通过兼容性验收的单一 G2 BFF。
4. 校验 nginx 配置语法后 reload；不重启无关 ghcloud 服务。
5. 使用无缓存浏览器访问门户首页，开始运行时验收。

## 阶段 6 运行时验收

### 必测链路

1. 首页、登录、刷新恢复会话、退出登录、租户切换和用户资料。
2. Profile、Shell、每个启用 MF manifest 与关键资源加载成功；Console 无新增相关错误。
3. G2 当前已迁移的每个子应用：菜单进入、首屏数据、查询或重置、分页和一项核心业务操作。
4. 至少两个未迁移 qiankun 子应用：菜单进入、登录态读取、菜单权限和关键页面可用。
5. Network：`/api`、`/gw-bff`、`/apps`、`/apps-legacy`、`/resource`、`/third-auth` 与 WebSocket 均指向预期 upstream，且无关键 404、CORS、MIME 或鉴权错误。
6. 回归：一个已迁移 Domain 的相邻菜单和一个旧 qiankun 菜单，确认 G2 的精确过滤未误伤旧应用。

### 验收记录模板

| 模块          | 装载方式 | 验收路径            | 结果   | Console | Network | 备注 |
| ------------- | -------- | ------------------- | ------ | ------- | ------- | ---- |
| PC Shell      | G2       | 登录和首页          | 待执行 | 待执行  | 待执行  |      |
| 已迁移 Domain | G2 MF    | 按 Profile 逐项填写 | 待执行 | 待执行  | 待执行  |      |
| 未迁移应用 A  | qiankun  | 菜单和核心页        | 待执行 | 待执行  | 待执行  |      |
| 未迁移应用 B  | qiankun  | 菜单和核心页        | 待执行 | 待执行  | 待执行  |      |
| BFF           | G2 服务  | health 和业务接口   | 待执行 | 不适用  | 待执行  |      |

## 回退方案

触发条件包括：首页不能打开、登录失败、任一关键未迁移 qiankun 应用失效、关键接口错误、WebSocket 中断、Profile/资源加载大量失败或验收未通过。

回退顺序：

1. 恢复阶段 2 备份的旧门户 nginx 路由或 Shell 配置。
2. 恢复旧 Profile/首页指针，reload nginx。
3. 验证旧门户首页、登录和一个旧 qiankun 应用恢复。
4. 保留 G2、BFF 和 nginx 日志；记录故障的 Profile 版本、Git SHA、请求 URL 和浏览器错误，禁止覆盖证据。

G2 CDN 已上传的版本化资源可保留，不需要通过删除资源实现回退。

## 尚待后续确认

当前不阻塞只读盘点，待实际发现缺口后再确认：

- `.133` 的实际 ghcloud 部署位置及运行方式。
- 现有 CDN 的 endpoint、bucket、发布前缀与权限接入方式。
- G2 BFF 的 OAuth 及下游服务安全配置来源。
- 浏览器验收账号、租户、权限范围和每个业务域的核心验收操作。
- 首页替换的具体维护窗口；在真正变更前单独确认。

## 进度更新规则

每次后续操作后更新“当前进度”表，并在对应阶段追加：操作时间、执行人、目标 Git SHA、变更文件、验证命令或浏览器路径、结果、日志位置、回退是否可用。任何未完成的验证必须明确标为“未验证”并说明阻塞原因；不得用构建成功代替运行时验收。
