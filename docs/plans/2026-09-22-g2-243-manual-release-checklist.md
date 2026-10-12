# G2 在 243 测试环境的手动发布与验证清单

> 状态：待执行  
> 更新：2026-09-22  
> 目标：在不影响 ghcloud 未迁移子应用的前提下，将 G2 Shell、已迁移子应用及统一 BFF 发布到 243 测试环境。  
> 原则：每项变更均先备份、先验证候选配置；发生异常时按本文回退步骤恢复。

## 1. 发布前盘点与备份

- [ ] 确认 243 上的门户容器名称、Nginx 配置目录、应用根目录、Docker 网络及 MinIO 容器。
- [ ] 确认当前门户公开端口与 BFF 的容器名、镜像、端口映射、网络、重启策略。
- [ ] 确认 MinIO 的对象服务端口与 Console 端口。
  - 注意：G2 静态资源必须代理到 MinIO **对象服务**，不能使用 Console 端口。
  - 用 G2 Shell 的 `index.html` 验证，页面标题必须是 `G2 PC Shell`，而不是 `MinIO Console`。
- [ ] 备份以下内容，并限制备份文件权限：
  - `nginx.conf`
  - `common.conf`
  - `application.conf`
  - 门户运行时配置
  - BFF 环境文件 `bff.env`
  - 当前 BFF 容器的镜像、端口映射、网络、重启策略及启动命令
- [ ] 记录回退命令：恢复 Nginx 配置并 reload；按发布前的 BFF 镜像和启动参数重建容器。

## 2. 本地打包与 CDN 发布

- [ ] 确认本地未提交的皮肤改动已纳入本次构建。
- [ ] 执行与本次修改相关的测试、类型检查和构建。
- [ ] 生成生产环境组合清单 `prod.resolved.json`。
- [ ] 将 G2 Shell 与全部已迁移子应用产物上传至现有 MinIO/CDN。
- [ ] 记录本次 Shell 发布目录，例如 `pcShell/<发布版本号>`。
- [ ] 直接从 MinIO 对象服务验证：
  - [ ] Shell `index.html` 为 G2 页面。
  - [ ] `prod.resolved.json` 返回有效 JSON。
  - [ ] 所有已迁移子应用的 manifest 可访问。

## 3. BFF 环境变量

### 3.1 原则

243 的 `bff.env` 必须显式配置已迁移模块所用上游地址，不能依赖代码中的默认 `.243`、`.133` 或空地址。修改前先备份环境文件。

修改环境文件后，**仅执行 `docker restart` 不会重新读取 `bff.env`**。必须按原来的镜像、端口、网络和重启策略重建 `g2-bff` 容器。

### 3.2 必须核对的基础变量

```env
VIDEO_MONITOR_URL=
SECURITY_MONITOR_URL=
DEVICE_CENTER_URL=
DICTIONARY_URL=
METADATA_URL=
OUAA_URL=
SAFETY_PERSONNEL_URL=
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
OAUTH_CLIENT_MAP=
```

### 3.3 按已迁移模块核对的变量

```env
ACCESS_CONTROL_URL=
AI_APPLICATION_URL=
DAILY_INSPECTION_URL=
DAILY_TASK_URL=
EMERGENCY_URL=
FILE_SERVICE_URL=
FLOW_URL=
PERSONNEL_URL=
PROPERTY_URL=
RISK_CONTROL_URL=
SECURE_EDU_URL=
SECURITY_MANAGEMENT_URL=
WORK_PERMIT_URL=
```

### 3.4 BFF 发布后验证

- [ ] 新容器使用预期镜像、端口映射、Docker 网络和重启策略。
- [ ] 容器状态为 `running`，健康状态为 `healthy`。
- [ ] `SECURITY_MONITOR_URL` 已注入容器。
- [ ] 使用真实登录态验证安全监控、视频监控、文件、字典等 BFF 路由；检查不再出现异常 401/5xx。

## 4. Nginx 首页切换

- [ ] 保留旧 ghcloud 的 `/apps/...` 和 `/apps-legacy/...` 精确路由规则。
- [ ] `/gw-bff` 只指向 G2 BFF，不按路径同时分流到两个 BFF。
- [ ] 首页及 Shell 静态资源代理到 MinIO 对象服务的本次 Shell 发布目录。
- [ ] `/compositions/prod.resolved.json` 指向 G2 的生产组合清单。
- [ ] 生成候选 Nginx 配置，先执行语法校验：

```bash
nginx -t
```

- [ ] 候选配置通过后，替换生效配置并 reload：

```bash
nginx -s reload
```

## 5. 发布后验收

- [ ] `GET /` 返回 200，HTML 标题为 `G2 PC Shell`。
- [ ] `GET /compositions/prod.resolved.json` 返回 200，且可解析为 JSON。
- [ ] Shell 实际引用的 JavaScript、CSS 资源返回 200，类型正确。
- [ ] 旧应用路径（例如 `/apps-legacy/workbench-migrate/`）仍返回 200。
- [ ] 登录后检查：
  - [ ] 顶栏菜单与 OUAA 为该账号返回的分组一致。
  - [ ] 账号拥有多个内部或外部企业时，右上角头像下拉出现“组织切换”。
  - [ ] 已迁移 BFF 路由无异常 401/5xx。
- [ ] 浏览器 Console 无新增错误；Network 中关键请求参数、响应和状态正确。
- [ ] BFF 日志无新增认证、上游连接或配置错误。

## 6. 回退

以下任一情况立即回退：

- 首页不是 `G2 PC Shell`，或出现 `MinIO Console`。
- 组合清单或 Shell 静态资源无法加载。
- 旧子应用无法访问。
- 关键 BFF 路由持续 401/5xx。
- BFF 容器不健康。

回退顺序：

1. 恢复备份的 Nginx 配置并 reload。
2. 恢复备份的 `bff.env`。
3. 用发布前镜像和原启动参数重建旧 BFF。
4. 验证旧门户首页、旧子应用和旧 BFF 已恢复。

## 7. 当前进度记录

- 133 已完成 G2 首页、统一 BFF 与旧子应用兼容路径的部署验证。
- 133 已发现并修复安全监控代理缺少 `SECURITY_MONITOR_URL` 的问题。
- 243 已于 2026-09-22 完成只读盘点，未执行发布或配置变更：
  - 门户容器为 `bimops-fe`，公开端口为 `40201`；当前根目录为 `/apps/@ghcloud-legacy/bimops-fe-web-migrate`。
  - Nginx 配置位于 `/home/dev-ops/bimops/front-end/nginx/conf`；`/gw-bff` 目前仍指向 `ghcloud-bff:3000`。
  - 旧 BFF 容器为 `ghcloud-bff`，宿主端口 `4000 -> 3000`，镜像为 `dev.guhecloud.com:5000/ghcloud/bff-gateway:release-20260827`，重启策略为 `always`。
  - 门户与旧 BFF 都在 `kaihe` Docker 网络；部署 G2 BFF 时可复用该网络，但必须使用不同容器名和端口。
  - MinIO 映射为宿主 `9003 -> 9000`（Console）及 `9091 -> 9090`（对象服务）。
  - `g2-web-release/pcShell/` 当前返回 403，尚未完成 G2 静态产物上传或匿名读取策略配置。
  - 旧 BFF 已配置大部分上游变量，但缺少 `SECURITY_MONITOR_URL`、`DAILY_TASK_URL`、`SECURE_EDU_URL`、`WORK_PERMIT_URL` 等；G2 发布时须按本清单显式补齐实际启用模块的地址。
