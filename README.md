# g2

Cube dual-shell greenfield monorepo. Capability-validation slice: PC shell + thin platform + POC domains.

## Stack

Bun workspaces + Turborepo · Vue 3.5 · Vite 8 · TypeScript 6 · Module Federation (`@module-federation/vite`) · oxlint/oxfmt · husky

## Commands

```bash
bun install
bun test
bun run validate:compositions
bunx turbo run build --filter=@g2-platform/http --filter=@g2-domain/poc-remote-pc --filter=@g2-shell/pc
```

Dev (example terminals):

```bash
bun run --filter @g2-platform/http dev
bun run --filter @g2-domain/poc-remote-pc dev
bun run --filter @g2-shell/pc dev
```

Open http://localhost:5100

按需开发只启动 Shell 和目标 Domain：`cd apps/shells/pc && bun dev`、`cd apps/domains/<domain> && bun dev`。完整说明见 [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md)。

本地全量联调使用 `bun run dev:full`。

Shell dev loads the resolved profile at runtime (see ADR-0052). Default URL is `/compositions/prod.resolved.json`（主站 HTTP 路径，不是仓内目录）；for local multi-port dev, copy `apps/shells/pc/.env.development.example` to `.env.development` (or set `VITE_RESOLVED_PROFILE_URL=/compositions/dev.resolved.json`). `predev` resolves `deploy/compositions/prod.pc.yaml` + `dev.registry.yaml` → `deploy/compositions/.resolved/dev.pc.resolved.json` for the Vite middleware.

### `dev:full` vs `web-release:rebuild`（勿混用）

|                | `bun run dev:full`                               | `bun run web-release:rebuild`                                                                 |
| -------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 打开哪里       | `http://localhost:5100`（Vite 壳）               | `http://localhost:8080`（compose 主站）                                                       |
| remote 从哪来  | 各包 Vite 端口（dev 注册表绝对 URL）             | MinIO/CDN：`http://localhost:8081/{logical}/{YYYYMMDD.<gitShortSha>}/…`（生成注册表相对 key） |
| 改代码何时生效 | 保存即 HMR / 冷刷新即可                          | **必须**再跑一遍 rebuild（generate→upload→nginx reload）                                      |
| 地址/指针      | `deploy/compositions/registry/dev.registry.yaml` | `deploy/address-templates`⊗env → `.deploy-out/prod/`（ADR-0055）                              |

**常见踩坑：看起来 rebuild「没更新」，其实是版本目录没变。**

- 发版 object key 的 `version`＝`YYYYMMDD.<git rev-parse --short HEAD>`（见 `@g2-tooling/release`）。**未 commit 时 HEAD 不变 → 仍写入同一前缀**；`.deploy-out/prod/registry.yaml` 里指针字符串也可能完全不变，容易误以为没发上去。
- 同 commit 重传是幂等覆盖同前缀；要确认是否吃到新 `dist`，看 publish 日志里的 `version=`，并对 CDN 上该前缀做硬刷新（或核对 `index.html` / `mf-manifest.json` 时间戳）。
- **改完代码想换新版本目录**：先 `git commit`，再 `web-release:rebuild`，然后看 `.deploy-out/prod/registry.yaml` 是否出现新的 short SHA；浏览器硬刷新 `http://localhost:8080`。（`.deploy-out/` 为本地生成物，不入库。）
- `dev:full` 里修好了 ≠ compose 栈已更新；两套栈互不共享热更新。

日常联调优先 `dev:full`。只有要验「发版产物 + 主站反代 + CDN」同构路径时才起 `web-release:*`。

## 本地发版验收栈（`web-release:*`）

本地 MinIO + **gateway 主站** + **cdn 边车**（模拟独立发版 CDN 域），验证 ADR-0052。**只服务本机验收**，不是上生产；也**不是** Vite 联调（见上节对照表）。MinIO 钉死 `RELEASE.2022-07-17T15-43-14Z`（多架构；其后社区版不用）：

```bash
cp deploy/docker-compose/.env.example deploy/docker-compose/.env   # 首次（含 webReleaseBase 等地址键）
bun run web-release:up
# release CLI 会读 deploy/docker-compose/.env 里的 RELEASE_S3_* / 地址键（指向本机 MinIO / CDN）
git commit   # 若要新的 YYYYMMDD.<sha> 目录；仅覆盖当前 HEAD 前缀可省略
bun run web-release:rebuild         # = release:publish（generate+upload）+ gateway nginx reload
open http://localhost:8080          # 主站（不要用 :5100 验这条栈）
# CDN：http://localhost:8081/<logical>/<ver>/mf-manifest.json
```

验收：主站 `/compositions/prod.resolved.json` → 200，且 `entry` 指向 CDN 域（默认 `http://localhost:8081/...`）；CDN 上对应 object → 200；主站 `/` → 壳 HTML（generate 前 stub 为 503 JSON）。主站**不再**提供 `/release/`。generate 后核对 `.deploy-out/prod/registry.yaml` 里的 short SHA 是否为当前 `git rev-parse --short HEAD`。

停止栈：`bun run web-release:down`

| 脚本                      | 用途                                        |
| ------------------------- | ------------------------------------------- |
| `web-release:up` / `down` | 起停本机 MinIO + gateway + cdn              |
| `web-release:reload`      | reload 本机 gateway nginx（壳反代片段生效） |
| `web-release:rebuild`     | generate + upload + reload                  |

## 发版 CLI（`release:*`，环境决定目标）

`@g2-tooling/release`（ADR-0055）：**`generate`** 写出 `.deploy-out/<set>/` 三件套（registry / resolved / shell-location；build 可 `--skip-build`）；**`upload`** 上传 dist；**`publish`**＝二者串联。地址类来自 `deploy/address-templates` + 同名环境变量（`--env KEY=VALUE`）。目标由 `RELEASE_S3_*` 与 `webReleaseBase` 决定。生成物不入库。

```bash
bun run release:generate -- --set=prod          # 只生成配置；可加 --skip-build
bun run release:publish -- --set=prod           # generate + upload
bun run release:upload / resolve                # 分步
```

生产上线（概要）：导出生产 `RELEASE_S3_*` 与地址 env → `bun run release:publish` → 把 `.deploy-out`（或 `--out-dir`）交给仓外归档/主站部署并 reload（**不要**对本机跑 `web-release:*`）。

发版选集引用**地址模版**；本地 Vite 联调使用 **dev 注册表**（localhost 绝对 URL）。

## Layout

See `docs/adr/0004-repo-layout-apps-role-groups.md` and `CONTEXT.md`.
