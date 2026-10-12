# 发版产物走 S3 兼容发版 CDN + 主站 nginx；壳运行时拉取已解析 Profile

发版产物（门面 SPA、Platform、远程域的完整 `dist/`）上传到发版 CDN（桶默认 `g2-web-release`；公开域如 `c.kaiheai.com`），与静态资源 CDN（`r.kaiheai.com` / `staticResourceBase`）及 Nexus npm 私仓分立。对象存储只走 **S3 兼容 API**（本地 MinIO、生产七牛 Kodo S3 网关同一套客户端，非必要不上原生 Kodo/私有协议）。本地 compose 的 MinIO **钉死** `minio/minio:RELEASE.2022-07-17T15-43-14Z`（多架构含 arm64；配套 `minio/mc:RELEASE.2022-07-15T09-20-55Z`）；其后社区版能力不足，禁止改用 `latest` 或更新标签。同日 `.fips` 仅 amd64，本地开发用非 FIPS 构建即可。主站 nginx 反代当前壳版本（含 SPA fallback）、托管已解析 Profile、代理 `/api`；`webReleaseBase` 指向**独立 CDN 域**（本地 compose 另起轻量 nginx 边车模拟，默认 `:8081`，对象在 URL 根；禁止再用主站 `/release/` 冒充 CDN）。本阶段不做 CDN 回源。

版本注册表拆成 **prod 生成物**（相对发版 object key + `webReleaseBase` / `pcShell` 等，由 CLI `generate` 写入 `.deploy-out/<set>/`，见 ADR-0055）与 **dev**（localhost 绝对 URL，供 Vite 多端口联调，仍可入库）。object key 形态为 `{logicalName}/{YYYYMMDD.<gitShortSha>}/…`；注册表指针：壳 → `…/index.html`，platform/remote → `…/mf-manifest.json`（上传仍是整包 `dist`）。已解析 Profile 由主站提供路径 `/compositions/{set}.resolved.json`（全量选集 `prod`），门面**运行时 fetch**，禁止再构建期内嵌。发版选集权威文件在 `deploy/release-sets/`（引用地址模版，非生成注册表）；当前默认且唯一拆分为全量 `prod`。发布 CLI 在 `@g2-tooling/release`：`generate`（可开关 build）产出三件套；`upload` 分发产物；`publish`＝二者串联；不自动 commit 生成物。本地用 docker compose（MinIO + mc 建桶 + nginx，挂载 `.deploy-out`）与生产同构验证。

## Considered Options

- **壳留在主站本地静态根、仅 remote 进 CDN**：与「`/api` 同域 + 壳也独立发版」诉求不符；否决，壳进发版 CDN，主站只反代。
- **整页 302 到 CDN 域名**：地址栏离开主站，Cookie/`/api` 跨站成本高；否决，用 nginx 反代。
- **已解析 Profile 构建期内嵌壳包**：改注册表指针必须重编并重传 `pcShell`，破坏热修；否决，改为运行时 fetch。
- **发版选集从 Composition Profile 派生**：装载范围与上传范围搅成一份权威；否决，独立 `release-sets/*.yaml`（当前仅 `prod`）。
- **MinIO + 七牛原生 Kodo 双驱动**：发版只需 Put/Head/List，七牛 S3 兼容已覆盖；否决双驱动，非必要不上私有协议。
- **MinIO 跟 `latest` / 更新社区版**：2022-07-17 之后的社区版能力不足；钉死 `RELEASE.2022-07-17T15-43-14Z`（多架构），否决升级。同日 `.fips` 仅 amd64，本地 arm64 不用 FIPS 标签。
- **nginx 运行时读 shell 指针 JSON（方案 1）**：需 openresty/动态逻辑；本阶段用发布工具生成壳反代片段并 reload（方案 2）。
- **web 制品用 package.json semver + 发 Nexus**：发版身份在 object key / 注册表；非 Nexus 必要包保持 `0.0.0` + `private: true`。

## Consequences

- `resolveProfile` 须把 prod 注册表中的相对 key 与 `webReleaseBase` 拼成绝对 `entry`；dev 注册表可继续直接存绝对 URL。
- 壳 `prebuild` 不再把已解析 Profile `import ?raw` 打进产物；开发态 Vite 代理 `/compositions/prod.resolved.json`（或 dev 对应路径）到仓库 resolve 产出。
- 主站壳版本与 remote 指针必须同批从注册表派生（已解析 Profile + 壳反代片段），避免双权威。
- 根脚本拆开命名：`web-release:*` 只管本机 compose 验收栈（up/down/reload/rebuild）；`release:*` 是发版 CLI（generate/upload/publish），本地与生产共用、靠 `RELEASE_S3_*` / 环境中的 `webReleaseBase` 区分目标。勿把本机栈叫成「dev」（Vite / dev 注册表另有含义）。
- object key 的 `version`＝`YYYYMMDD.<gitShortSha>`（`git rev-parse --short HEAD`）。未 commit 时重跑仍落同一前缀（幂等覆盖）；生成注册表指针字符串也可能不变，易被误判为「rebuild 无效」。本地联调即时反馈用 `dev:full`（dev 注册表 / Vite）；验发版路径用 `web-release:*`（见 README 对照表）。
