# Module Federation runtime 经发版 CDN 单 URL 共享，禁止各 remote 重复打入

各 Platform / 远程域独立 Vite 构建时，`@module-federation/vite` 会把 **federation runtime**（约数十 KB，产物常见 `dist-*.js`）打进每一份 `dist`。浏览器按完整 URL 缓存，即使内容相同也会 N 次请求。本决策把该 runtime 抽成**固定绝对 URL** 上的单文件，由 remotes 以 Vite `external` 消费；成功判据以 **runtime 去重** 为主，**不做** preload helper 去重。

**身份与路径：** 产物不是 Composition Profile 成员，也不进版本注册表逻辑名。对象 key / 公开路径为 `{webReleaseBase}/_mf/runtime/{@module-federation/runtime 的 npm 版本}/mf-runtime.js`（与 ADR-0052 发版 CDN 同源；本地 Vite 联调由门面以同构路径 `/_mf/runtime/{ver}/mf-runtime.js` 提供）。升级 runtime npm 版本即换路径，旧 URL 可留桶内幂等并存。

**构建与开关：** `@g2-tooling/mf-vite` 的 `federation({ mfRuntime })`——host（`@g2-shell/pc`）emit + dev/preview middleware；remote 默认 `external`。`G2_MF_RUNTIME_MODE` / `G2_MF_RUNTIME_SLIM=0` 可回退为各包自带（`bundled`）。发版构建由 `release:publish` 注入 `G2_MF_RUNTIME_BASE=<webReleaseBase>`，使 remotes 的 external URL 指向 CDN 而非联调门面端口。

**上传：** `release:publish` / upload 顺带幂等 put 该单文件到桶根 key；门面 `dist/_mf/**` **不得**随 `pcShell/{sha}/` 成员树上传（避免挂错前缀）。单文件由 npm ESM 入口 `bun build` 成具名 `init` 导出（勿 minify 塌成 default-only；勿 resolve 到 `.cjs`）。

**与 shared / 按需装载的边界：**

- **不**靠 MF `shared` / `import:false` 去重 runtime——已证伪：声明不进 `usedShared`，各包仍打 `dist-*.js`。vue 三件套 singleton 仍见 ADR-0018。
- **不**重做 ADR-0053 的按需装载时机；本 ADR 只减重复下载的 runtime 字节。
- remoteEntry 控制码仍可各留一份；门面 host 自身可继续带一份 runtime，不以「壳也 external」为门槛。

## Considered Options

- **MF `shared` + `import:false` / 插件 capability：** 无法把 runtime 从各 remote 产物中抹掉；否决。
- **拷贝门面 hashed `dist-*.js` 当共享文件：** 压缩导出 + 相对依赖，remote 的 `import { init }` 对不上；否决。
- **打 npm ESM 入口为具名单文件 + Vite external 到绝对 URL：** 选定；CDN 路径钉 `_mf/runtime/{ver}/`，publish 顺带上传。
- **把 runtime 做成 Profile Platform remote：** 过重且混淆发版边界；否决，非 Profile 成员。

## Consequences

- 全部 `apps/platforms/*`、`poc-remote-pc`、`@g2-shell/pc` 经 `mfRuntime` 接入；联调默认打门面 `:5100` 同构路径，发版打 `webReleaseBase`。
- `@g2-tooling/release` 依赖 `@g2-tooling/mf-vite` 物化并上传；成员 `uploadDist` 排除 `_mf/**`。
- 回退：`G2_MF_RUNTIME_MODE=bundled`（或 `G2_MF_RUNTIME_SLIM=0`）恢复各包内联，无需改 CDN 拓扑。
