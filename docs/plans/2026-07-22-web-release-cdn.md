# 发版 CDN（S3）+ 主站 nginx 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 ADR-0052：发版产物上传 S3 兼容发版 CDN、prod/dev 双注册表、壳运行时 fetch 已解析 Profile、本地 compose（MinIO + nginx）完整验证；发布 CLI 在 `@g2-tooling/release`。

**Architecture:** 发版选集 `deploy/release-sets/prod.yaml` 圈定上传成员；prod 注册表存相对 object key + `webReleaseBase`/`pcShell`；`resolveProfile` 拼绝对 `entry`；CLI 闭环 upload→point→resolve→壳反代片段；主站 nginx 反代壳与 `/release/`、托管 `/compositions/prod.resolved.json`、代理 `/api`。dev 注册表保留 localhost 绝对 URL 供 Vite 联调。

**Tech Stack:** Bun · Turborepo · Vite 8 · `@aws-sdk/client-s3` · MinIO · nginx · docker compose · 既有 `@g2-composition/*`

**决议：** [`docs/adr/0052-web-release-cdn-s3-main-site.md`](../adr/0052-web-release-cdn-s3-main-site.md) · 术语见 [`CONTEXT.md`](../../CONTEXT.md)

---

## File map

| 路径                                                   | 职责                                       |
| ------------------------------------------------------ | ------------------------------------------ |
| `compositions/prod.pc.yaml`                            | 由 `demo.pc.yaml` 升格，`env: prod`        |
| `compositions/registry/prod.registry.yaml`             | 相对 key + `webReleaseBase` / `pcShell` 等 |
| `compositions/registry/dev.registry.yaml`              | localhost 绝对 URL（Vite）                 |
| `compositions/.resolved/prod.pc.resolved.json`         | resolve 产出（gitignore 可保留生成）       |
| `deploy/release-sets/prod.yaml`                        | 全量发版选集                               |
| `deploy/docker-compose/*`                              | MinIO + mc + nginx                         |
| `deploy/nginx/*`                                       | 主站模板 + 生成的壳片段目录                |
| `tooling/release/*`                                    | `@g2-tooling/release` CLI                  |
| `packages/composition-registry/src/resolve-profile.ts` | 相对 key + `webReleaseBase` 拼接           |
| `apps/shells/pc/src/main.ts`                           | 运行时 fetch Profile                       |
| `apps/shells/pc/vite.config.ts`                        | 开发代理 `/compositions/*.resolved.json`   |

---

### Task 1: demo → prod 升格（Composition / 引用路径）

**Files:**

- Move/rename: `compositions/demo.pc.yaml` → `compositions/prod.pc.yaml`（`env: prod`）
- Move/rename: `compositions/registry/demo.registry.yaml` → 暂存后由 Task 3 拆成 prod/dev
- Modify: `apps/shells/pc/package.json` prebuild/predev 路径
- Modify: `package.json` `dev:full` 默认 profile
- Modify: `tooling/dev-filter/cli.ts` 默认路径
- Modify: `.gitlab-ci.yml` resolve 命令路径
- Modify: 凡引用 `demo.pc` / `demo.registry` 的测试与文档（除历史 plans 外的活文档）

- [ ] **Step 1: 升格源 Profile**

```yaml
# compositions/prod.pc.yaml
facade: pc
env: prod
platform:
  # …与原 demo.pc.yaml 相同成员…
```

- [ ] **Step 2: 批量改引用**

将 `compositions/demo.pc.yaml` / `demo.registry.yaml` / `demo.pc.resolved.json` 改为 `prod.*`（shell `package.json`、`dev:full`、dev-filter 默认、CI resolve、composition-schema 测试夹具若有）。

- [ ] **Step 3: 校验**

```bash
bun run validate:compositions
bun run --filter @g2-composition/schema resolve -- \
  --profile compositions/prod.pc.yaml \
  --registry compositions/registry/demo.registry.yaml \
  --out compositions/.resolved/prod.pc.resolved.json
```

（此时 registry 仍可能是绝对 URL；Task 3 再拆 prod/dev。）

- [ ] **Step 4: Commit**

```bash
git add compositions apps/shells/pc/package.json package.json tooling/dev-filter .gitlab-ci.yml
git commit -m "$(cat <<'EOF'
refactor(compositions): promote demo profile to prod full set

EOF
)"
```

---

### Task 2: `resolveProfile` 支持相对 key + `webReleaseBase`

**Files:**

- Modify: `packages/composition-registry/src/resolve-profile.ts`
- Modify: `packages/composition-registry/src/resolve-profile.test.ts`
- Modify: `packages/composition-registry/src/types.ts`（若需导出 helper）
- Modify: `packages/composition-registry/src/index.ts`

规则：

- 若 registry 值已是绝对 URL（`http://` / `https://`），原样作为 `entry`（dev 注册表）。
- 否则视为相对 object key，要求存在非空 `webReleaseBase`，拼接为 `{base}/{key}`（去掉 base 尾 `/` 与 key 头 `/` 的重复）。
- `pcShell`、`webReleaseBase`、`backendApi`、`staticResourceBase` **不**进入 platform/remotes 的 missing 检查（仅 source 声明的 logicalName）。
- 可选导出 `resolveWebReleaseBaseFromRegistry`、`joinReleaseUrl(base, key)` 供发布工具复用。

- [ ] **Step 1: 写失败测试**

```ts
test("相对 key 经 webReleaseBase 拼成绝对 entry", () => {
  const source = {
    facade: "pc" as const,
    env: "prod",
    platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
    inline: [],
    remotes: [],
  };
  const resolved = resolveProfile(source, {
    webReleaseBase: "http://localhost:8080/release",
    pcAuth: "pcAuth/20260722.b32db5b/mf-manifest.json",
  });
  expect(resolved.platform[0]?.entry).toBe("http://localhost:8080/release/pcAuth/20260722.b32db5b/mf-manifest.json");
});

test("绝对 URL 不拼接 webReleaseBase", () => {
  const source = {
    facade: "pc" as const,
    env: "dev",
    platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
    inline: [],
    remotes: [],
  };
  const resolved = resolveProfile(source, {
    pcAuth: "http://localhost:5010/mf-manifest.json",
  });
  expect(resolved.platform[0]?.entry).toBe("http://localhost:5010/mf-manifest.json");
});

test("相对 key 缺少 webReleaseBase 时抛错", () => {
  const source = {
    facade: "pc" as const,
    env: "prod",
    platform: [{ name: "pcAuth", logicalName: "pcAuth" }],
    inline: [],
    remotes: [],
  };
  expect(() => resolveProfile(source, { pcAuth: "pcAuth/20260722.b32db5b/mf-manifest.json" })).toThrow(/webReleaseBase/);
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
bun test packages/composition-registry/src/resolve-profile.test.ts
```

- [ ] **Step 3: 实现拼接**

在 `resolve-profile.ts` 增加：

```ts
function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//u.test(value);
}

export function joinReleaseUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/u, "");
  const k = key.replace(/^\/+/u, "");
  return `${b}/${k}`;
}

export function resolveEntryFromRegistry(registry: Registry, logicalName: string): string | undefined {
  const raw = registry[logicalName];
  if (raw === undefined || raw === "") return undefined;
  if (isAbsoluteUrl(raw)) return raw;
  const base = registry.webReleaseBase;
  if (!base) {
    throw new Error(`registry entry "${logicalName}" is a relative key but webReleaseBase is missing`);
  }
  return joinReleaseUrl(base, raw);
}
```

platform/remotes map 改为使用 `resolveEntryFromRegistry`。

- [ ] **Step 4: 测试通过并 commit**

```bash
bun test packages/composition-registry/src/resolve-profile.test.ts
git add packages/composition-registry
git commit -m "$(cat <<'EOF'
feat(composition-registry): join relative release keys with webReleaseBase

EOF
)"
```

---

### Task 3: prod / dev 双注册表 + 发版选集

**Files:**

- Create: `compositions/registry/prod.registry.yaml`
- Create: `compositions/registry/dev.registry.yaml`
- Delete or stop using: `compositions/registry/demo.registry.yaml`
- Create: `deploy/release-sets/prod.yaml`

- [ ] **Step 1: `dev.registry.yaml`（绝对 URL，内容来自原 demo）**

```yaml
pcStub: "http://localhost:5001/mf-manifest.json"
pocRemotePc: "http://localhost:5002/mf-manifest.json"
pcAuth: "http://localhost:5010/mf-manifest.json"
pcChrome: "http://localhost:5011/mf-manifest.json"
pcMessaging: "http://localhost:5012/mf-manifest.json"
pcRtc: "http://localhost:5013/mf-manifest.json"
pcAiAssistant: "http://localhost:5014/mf-manifest.json"
httpPlatform: "http://localhost:5015/mf-manifest.json"
backendApi: ""
staticResourceBase: "https://r.kaiheai.com"
# 开发态可不写 webReleaseBase / pcShell
```

- [ ] **Step 2: `prod.registry.yaml`（相对 key；首次可用占位 version，publish 后改写）**

```yaml
webReleaseBase: "http://localhost:8080/release"
pcShell: "pcShell/00000000.local/index.html"
pcStub: "pcStub/00000000.local/mf-manifest.json"
pocRemotePc: "pocRemotePc/00000000.local/mf-manifest.json"
pcAuth: "pcAuth/00000000.local/mf-manifest.json"
pcChrome: "pcChrome/00000000.local/mf-manifest.json"
pcMessaging: "pcMessaging/00000000.local/mf-manifest.json"
pcRtc: "pcRtc/00000000.local/mf-manifest.json"
pcAiAssistant: "pcAiAssistant/00000000.local/mf-manifest.json"
httpPlatform: "httpPlatform/00000000.local/mf-manifest.json"
backendApi: ""
staticResourceBase: "https://r.kaiheai.com"
```

- [ ] **Step 3: `deploy/release-sets/prod.yaml`**

```yaml
name: prod
profile: compositions/prod.pc.yaml
registry: compositions/registry/prod.registry.yaml
members:
  - logicalName: pcShell
    package: "@g2-shell/pc"
    entryFile: index.html
  - logicalName: pcStub
    package: "@g2-platform/pc-stub"
    entryFile: mf-manifest.json
  - logicalName: httpPlatform
    package: "@g2-platform/http"
    entryFile: mf-manifest.json
  - logicalName: pcChrome
    package: "@g2-platform/pc-chrome"
    entryFile: mf-manifest.json
  - logicalName: pcAuth
    package: "@g2-platform/pc-auth"
    entryFile: mf-manifest.json
  - logicalName: pcMessaging
    package: "@g2-platform/pc-messaging"
    entryFile: mf-manifest.json
  - logicalName: pcRtc
    package: "@g2-platform/pc-rtc"
    entryFile: mf-manifest.json
  - logicalName: pcAiAssistant
    package: "@g2-platform/pc-ai-assistant"
    entryFile: mf-manifest.json
  - logicalName: pocRemotePc
    package: "@g2-domain/poc-remote-pc"
    entryFile: mf-manifest.json
```

- [ ] **Step 4: Shell / CI 开发默认改走 dev 注册表；发版走 prod**

- `apps/shells/pc` 的 `predev`：resolve 使用 `dev.registry.yaml`，out 可为 `compositions/.resolved/prod.pc.resolved.json` **或** 开发专用 `dev.pc.resolved.json`——推荐 **开发 resolve 输出 `compositions/.resolved/dev.pc.resolved.json`**，发版输出 `prod.pc.resolved.json`，避免互相覆盖。
- 源 Profile 可共用 `prod.pc.yaml`（装载范围相同）；仅 registry 不同。

```json
"predev": "bun run --filter @g2-composition/schema resolve -- --profile compositions/prod.pc.yaml --registry compositions/registry/dev.registry.yaml --out compositions/.resolved/dev.pc.resolved.json"
```

（Task 5 壳改为 fetch 后，predev 仍生成文件供 Vite 代理读取。）

- [ ] **Step 5: Commit**

```bash
git add compositions/registry deploy/release-sets apps/shells/pc/package.json
git commit -m "$(cat <<'EOF'
feat(compositions): add prod/dev registries and prod release set

EOF
)"
```

---

### Task 4: `@g2-tooling/release` 骨架 + S3 上传

**Files:**

- Create: `tooling/release/package.json`（name `@g2-tooling/release`，依赖 `@aws-sdk/client-s3`、`yaml`、workspace composition 包）
- Create: `tooling/release/src/cli.ts`
- Create: `tooling/release/src/s3.ts`
- Create: `tooling/release/src/upload-dist.ts`
- Create: `tooling/release/src/version.ts`
- Create: `tooling/release/src/*.test.ts`
- Modify: 根 `package.json` workspaces 已含 `tooling/*`；加 script `"release": "bun run --filter @g2-tooling/release …"`

环境变量（`.env.example` 可放 `deploy/docker-compose/`）：

```
RELEASE_S3_ENDPOINT=http://127.0.0.1:9000
RELEASE_S3_REGION=us-east-1
RELEASE_S3_BUCKET=g2-web-release
RELEASE_S3_ACCESS_KEY=minioadmin
RELEASE_S3_SECRET_KEY=minioadmin
RELEASE_S3_FORCE_PATH_STYLE=true
```

- [ ] **Step 1: `version.ts` — `YYYYMMDD.<shortSha>`**

```ts
export function releaseVersion(now = new Date(), sha = gitShortSha()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}.${sha}`;
}

function gitShortSha(): string {
  const out = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { stdout: "pipe" });
  if (out.exitCode !== 0) throw new Error("git rev-parse failed");
  return new TextDecoder().decode(out.stdout).trim();
}
```

- [ ] **Step 2: `s3.ts` — 单客户端 Put/Head**

```ts
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export function createReleaseS3Client(env = Bun.env): S3Client {
  return new S3Client({
    endpoint: env.RELEASE_S3_ENDPOINT,
    region: env.RELEASE_S3_REGION ?? "us-east-1",
    forcePathStyle: env.RELEASE_S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: env.RELEASE_S3_ACCESS_KEY!,
      secretAccessKey: env.RELEASE_S3_SECRET_KEY!,
    },
  });
}

export async function putIfChanged(client: S3Client, bucket: string, key: string, body: Uint8Array, contentType: string) {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (head.ContentLength === body.byteLength) return { uploaded: false, key };
  } catch {
    /* miss → upload */
  }
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
  return { uploaded: true, key };
}
```

- [ ] **Step 3: `upload-dist.ts` — 递归上传 `dist/` 到 `{logicalName}/{version}/`**

跳过非文件；Content-Type 按扩展名（`.js` → `application/javascript`，`.json` → `application/json`，`.html` → `text/html`，`.css` → `text/css`，默认 `application/octet-stream`）。

- [ ] **Step 4: CLI 子命令 `upload`**

```bash
bun run --filter @g2-tooling/release cli -- upload --set=prod [--only=pcAuth,pcShell] [--dry-run]
```

读 `deploy/release-sets/prod.yaml`，对每个 member：定位 workspace 包 `dist/`（先假定已 build），上传，打印将写入的相对 key：`{logicalName}/{version}/{entryFile}`。

- [ ] **Step 5: 单元测试 version / join / content-type；commit**

```bash
bun test tooling/release
git add tooling/release package.json
git commit -m "$(cat <<'EOF'
feat(tooling-release): add S3 upload for web release artifacts

EOF
)"
```

---

### Task 5: point / resolve / 壳反代片段 / `publish` 编排

**Files:**

- Create: `tooling/release/src/load-release-set.ts`
- Create: `tooling/release/src/point-registry.ts`
- Create: `tooling/release/src/render-shell-nginx.ts`
- Create: `tooling/release/src/publish.ts`
- Create: `deploy/nginx/shell-location.conf.template`
- Create: `deploy/nginx/generated/.gitkeep`（生成物 `shell-location.conf` 可 gitignore 或提交本地占位）

- [ ] **Step 1: `point` — 写回 registry 中对应 logicalName 的相对 key**

不 git commit。YAML 读写保持其它键不变。

- [ ] **Step 2: 调用既有 resolve CLI**

```bash
bun run --filter @g2-composition/schema resolve -- \
  --profile compositions/prod.pc.yaml \
  --registry compositions/registry/prod.registry.yaml \
  --out compositions/.resolved/prod.pc.resolved.json
```

另将文件复制/同步到 nginx 可挂载路径（compose 直接挂 `compositions/.resolved`）。

- [ ] **Step 3: 渲染壳反代片段**

从 registry 读 `pcShell`（如 `pcShell/20260722.abc/index.html`），推出前缀 `pcShell/20260722.abc/`，渲染：

```nginx
# generated — do not edit
location / {
  # SPA fallback: try file under release prefix, else index.html
  set $shell_prefix "pcShell/20260722.abc";
  proxy_pass http://minio:9000/g2-web-release/$shell_prefix/;
  # 完整 SPA fallback 在 Task 6 的 nginx 主配置用 try_files / error_page 或单独 location 规则补全
}
```

更稳妥的主站配置（Task 6）：`/` 反代到 `http://minio:9000/g2-web-release/<prefix>/`，并对 `404` 回退请求 `.../index.html`。

- [ ] **Step 4: `publish` = build（turbo filter members）→ upload → point → resolve → render shell conf**

支持 `--dry-run`、`--no-point`、`--skip-build`。

根脚本：

```json
"release:publish": "bun run --filter @g2-tooling/release cli -- publish --set=prod"
```

- [ ] **Step 5: 测试 point YAML 更新；commit**

```bash
bun test tooling/release
git add tooling/release deploy/nginx
git commit -m "$(cat <<'EOF'
feat(tooling-release): point registry, resolve, and shell nginx snippet

EOF
)"
```

---

### Task 6: docker compose（MinIO + nginx）本地验证栈

**Files:**

- Create: `deploy/docker-compose/docker-compose.yaml`
- Create: `deploy/docker-compose/.env.example`
- Create: `deploy/nginx/default.conf.template`（或静态 `default.conf`）
- Create: 根 `package.json` scripts：`release:up` / `release:down`

服务（参考 cube-ai minio + mc-setup）：

1. `minio` — API 9000，console 9001
2. `minio-setup` — `mc mb local/g2-web-release`；设置匿名下载或仅内网（nginx 走容器网络拉）
3. `gateway`（nginx）— 8080
   - `/compositions/prod.resolved.json` → 挂载的 resolved 文件
   - `/release/` → `http://minio:9000/g2-web-release/`
   - `/` → include 生成的壳片段（反代当前 `pcShell` 前缀 + SPA fallback）
   - `/api` 等 → `${API_UPSTREAM}`（由本地 `.env` 配置，仓库仅占位默认）

- [ ] **Step 1: 写 compose 与 nginx 模板，文档化用法**

```bash
# 仓库根
docker compose -f deploy/docker-compose/docker-compose.yaml up -d
# 配置 RELEASE_S3_* 后
bun run release:publish -- --set=prod
docker compose -f deploy/docker-compose/docker-compose.yaml exec gateway nginx -s reload
# 浏览器打开 http://localhost:8080
```

- [ ] **Step 2: 手工验收清单**

- [ ] `GET http://localhost:8080/compositions/prod.resolved.json` → 200，entry 指向 `/release/...`
- [ ] `GET http://localhost:8080/release/<logical>/<ver>/mf-manifest.json` → 200
- [ ] `GET http://localhost:8080/` → 壳 HTML
- [ ] 壳能加载至少一个 platform remote

- [ ] **Step 3: Commit**

```bash
git add deploy/docker-compose deploy/nginx package.json
git commit -m "$(cat <<'EOF'
feat(deploy): add MinIO+nginx compose stack for web release verify

EOF
)"
```

---

### Task 7: 壳运行时 fetch 已解析 Profile

**Files:**

- Modify: `apps/shells/pc/src/main.ts` — 删除 `import …?raw`，改为 `fetch`
- Create: `apps/shells/pc/src/load-resolved-profile.ts` + 测试
- Modify: `apps/shells/pc/vite.config.ts` — proxy `/compositions` → 读本地文件或简单中间件
- Modify: `apps/shells/pc/package.json` — `prebuild` 不再为内嵌而 resolve；发版构建不依赖内嵌 JSON

约定：

- 默认 URL：`/compositions/prod.resolved.json`（可用 `import.meta.env.VITE_RESOLVED_PROFILE_URL` 覆盖；开发可指 `/compositions/dev.resolved.json`）
- Vite dev：proxy 或 plugin 把上述路径指到 `compositions/.resolved/*.json`

- [x] **Step 1: `loadResolvedProfile`**

```ts
export async function loadResolvedProfile(url = defaultProfileUrl()): Promise<ResolvedProfile> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`failed to load resolved profile: ${res.status} ${url}`);
  return (await res.json()) as ResolvedProfile;
}

function defaultProfileUrl(): string {
  return import.meta.env.VITE_RESOLVED_PROFILE_URL ?? "/compositions/prod.resolved.json";
}
```

开发默认改为 `VITE_RESOLVED_PROFILE_URL=/compositions/dev.resolved.json`（在 `.env.development`）。

- [x] **Step 2: `bootstrap` 使用 await loadResolvedProfile()**

- [x] **Step 3: Vite 代理**

```ts
proxy: {
  "/compositions": {
    target: "http://127.0.0.1:5100",
    bypass(req) {
      // 更好：自定义插件 readFile sync 返回 JSON；或用 vite-plugin-static-copy
    },
  },
  // 保留既有 REMOTE_VERIFY_PROXY_PATHS
}
```

推荐实现：小插件 `configureServer`，对 `/compositions/dev.resolved.json` 与 `prod.resolved.json` `res.end(await Bun.file(path).text())`。

- [x] **Step 4: 测试 + 本地 `bun run --filter @g2-shell/pc dev` 冒烟；commit**

```bash
bun test apps/shells/pc
git add apps/shells/pc
git commit -m "$(cat <<'EOF'
feat(shell-pc): fetch resolved profile at runtime from main site path

EOF
)"
```

---

### Task 8: CI 与文档收尾

**Files:**

- Modify: `.gitlab-ci.yml` — resolve 使用 prod profile + **dev 或 prod registry**（CI 无 MinIO 时用 dev 绝对 URL 做 build 门禁即可）
- Modify: `README.md` — 发版验证步骤摘要
- 确认 `CONTEXT.md` 与 ADR-0052 一致（grill 已写，实施中若有漂移则改）

- [x] **Step 1: CI build 仍用绝对 URL registry（dev），避免 CI 依赖 MinIO**

```yaml
- bun run --filter @g2-composition/schema resolve -- \
  --profile compositions/prod.pc.yaml \
  --registry compositions/registry/dev.registry.yaml \
  --out compositions/.resolved/dev.pc.resolved.json
- bunx turbo run build --filter=...
```

- [x] **Step 2: README 增加「发版验证」小节**（compose up → publish → 打开 8080）

- [x] **Step 3: 全量验证**

```bash
bun test
bun run validate:compositions
bunx turbo run build --filter=@g2-shell/pc --filter=@g2-platform/pc-auth # …与 CI 同 filter
```

- [x] **Step 4: Commit**

```bash
git add .gitlab-ci.yml README.md CONTEXT.md docs/adr/0052-web-release-cdn-s3-main-site.md
git commit -m "$(cat <<'EOF'
docs: document web release CDN verify flow and align CI resolve paths

EOF
)"
```

---

## Spec coverage（自检）

| ADR-0052 要点                            | Task                   |
| ---------------------------------------- | ---------------------- |
| S3 单客户端 / MinIO+七牛配置切换         | 4                      |
| 桶 `g2-web-release`、object key 形态     | 4                      |
| `webReleaseBase` + 相对 key resolve      | 2、3                   |
| prod/dev 双注册表                        | 3                      |
| 发版选集 `prod`、demo→prod               | 1、3                   |
| 壳完整 dist、指针 index.html             | 3、4                   |
| 运行时 fetch Profile                     | 7                      |
| 壳反代片段 + SPA                         | 5、6                   |
| compose 完整验证                         | 6                      |
| CLI `@g2-tooling/release`、不自动 commit | 4、5                   |
| 不做 GitLab publish job                  | 8（CI 仅 verify）      |
| 非 Nexus 包 0.0.0 + private              | 无代码变更（已是现状） |

---

## 验收口令

```bash
docker compose -f deploy/docker-compose/docker-compose.yaml up -d
bun run release:publish -- --set=prod
docker compose -f deploy/docker-compose/docker-compose.yaml exec gateway nginx -s reload
open http://localhost:8080
```

生产：同一 CLI，设置七牛 S3 endpoint/region/bucket/凭证，并将 `prod.registry.yaml` 的 `webReleaseBase` 设为 `https://c.kaiheai.com`（或实际公开前缀）；主站 nginx 同构部署 resolved JSON + 壳片段。
