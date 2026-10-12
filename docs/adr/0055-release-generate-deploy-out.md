# 发版配置由 CLI generate 产出到 `.deploy-out`；本仓不再 git 托管 prod 指针注册表

ADR-0043 建立的「源 Profile + 版本注册表 + 已解析 Profile」拆分仍然成立，但**版本注册表不再作为本应用仓须提交的 git 权威**：改为发布 CLI **`generate`** 的生成物（默认 `.deploy-out/<set>/registry.yaml`，可 `--out-dir`），与同批的 `resolved.json`、`shell-location.conf` 一齐写出。本仓只入库 Composition Profile、发版选集，以及部署侧**地址模版**（`deploy/address-templates/*.yaml`：空值 map，键为地址类逻辑名；值来自同名环境变量——未设置失败、空串合法）。发版 object key 的 `version` 始终取当前 git `HEAD`（`YYYYMMDD.<shortSha>`）；回滚靠回到目标提交再 generate/构建，或替换仓外已发布存档。上传（`upload`）与生成解耦；`publish`＝`generate`+`upload`；废弃对外改写本仓源注册表的 `point`。本地 `web-release:rebuild`＝generate（含 build）+ 本机 MinIO upload + reload，主站挂载 `.deploy-out/<set>/`。指针归档/分发形态本仓不规定，由后续流程扩展。

部分修正 ADR-0043（「注册表数据本身走本仓 git 管控」）、ADR-0048（地址类随指针同走本仓 git 的表述——改为进生成注册表，源为地址模版⊗env）、ADR-0052（publish 闭环 point 本仓 registry、人审 commit 指针）中与本决策冲突的句子；Profile / resolve / 主站 fetch 已解析 Profile / 发版 CDN 等其余约定不变。

## Considered Options

- **继续把 `prod.registry.yaml` 当可提交指针源**：每次 rebuild 污染应用仓 diff，且本机 MinIO 版本对他人无意义；否决。
- **本仓规定指针必须进某部署仓或桶内 `current`**：过早锁定归档形态；否决，本仓只保证 generate。
- **地址模版用 `${VAR}` 或纯 keys 列表**：列表复制后不能当 map 直接灌值；否决，采用空值 map + 同名 env。
- **CLI 提供 `--version` 覆盖 HEAD**：回滚可 checkout 或换存档；否决额外并行身份参数。

## Consequences

- Release Set 引用 `addressTemplate`，不再引用生成注册表路径作源输入。
- CI prod 门禁改为 `generate --skip-build`（占位 env），不再 resolve 已退役的入库 prod 指针文件；dev 注册表 resolve 可保留。
- 生成物统一 `.deploy-out/`（gitignore）；不再默认写入 `deploy/compositions/registry/prod.registry.yaml` 或把壳片段当作本仓权威。
