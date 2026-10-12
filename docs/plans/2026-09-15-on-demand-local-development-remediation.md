# 本地按需开发模式整改计划

> 目标保存路径：`docs/plans/2026-09-15-on-demand-local-development-remediation.md`
>
> 当前处于计划模式，尚未实际写入文件。切换到执行模式后，先将本计划原样保存到上述路径，再开始整改。新对话可直接引用该文件。

## 一、目标

在 `codex/on-demand-local-dev-only` 分支完成以下开发模式：

```text
本地 PC Shell
  ├─ 已启动的 Domain / Platform → 本地服务
  ├─ 未启动的业务应用           → 目标环境
  ├─ API、数据、权限            → 目标环境
  └─ Client                    → 前端实现按需加载，不启动独立后端
```

同时保证：

- 默认只需启动 Shell 和正在开发的 Domain。
- 本地 Domain 支持 HMR。
- 停止本地 Domain 后自动恢复目标环境版本。
- 测试环境没有 G2 resolved Profile 时也能正常登录、进入工作台。
- `host` 保持 `true`，浏览器和注册地址统一使用 `http://localhost:*`。
- 生产构建、发布清单和发布流程与 `origin/main` 保持一致。

## 二、当前问题与处理基线

当前分支状态：

- 分支：`codex/on-demand-local-dev-only`
- 远端基线：`origin/codex/on-demand-local-dev-only`，提交 `3565b40`
- 本地未推送提交：`8e4444c`
- 另有 6 个未提交的试验性修改。

已确认的根因：

1. 默认访问目标环境的 `/compositions/prod.resolved.json`，但当前测试环境返回 HTML，不是 G2 Profile，导致 Shell 启动失败。
2. 将 Profile 缩减为少量基础 Platform 会让 `ctx.loadPlatform()` 后续找不到 `pcUi`、`pcMap` 等能力。
3. 当前 `/index` 固定跳转 `/d/workbench`，本地工作台没有启动时无法回退目标环境工作台。
4. 仅依靠通用名称归一化匹配 qiankun 应用不可靠，可能错误过滤或漏掉环境应用。
5. 本地开发的“模块清单”“模块来源”“加载时机”混在了一起，导致未启动端口、环境回退和 Platform 装载相互影响。

整改时不直接保留当前临时方案中的：

- `LOCAL_RUNTIME_PLATFORM_NAMES` 白名单。
- 通用字符串归一化的应用匹配。
- 默认强制请求目标环境 G2 Profile。
- 无条件将 `/index` 重定向到本地 MF 工作台。

## 三、最终运行模型

### 3.1 两种环境模式

#### 默认：Legacy 兼容模式

未配置 `G2_DEV_PROFILE_URL` 时启用，适用于当前测试环境。

- 使用仓库生成的本地 Profile 作为完整 G2 模块清单。
- Platform 和 Client 不因为清单中的 localhost 地址而直接访问未启动端口。
- 已启动的本地 Domain/Platform 通过注册中心覆盖。
- 未启动的业务应用通过目标环境 `FRONTEND_CONFIG`、`homeEntry` 和 `microApps` 加载。
- API 请求代理到 `G2_DEV_API_TARGET`。
- 不访问目标环境不存在的 `/compositions/prod.resolved.json`。

#### G2 Profile 模式

显式配置有效的 `G2_DEV_PROFILE_URL` 时启用。

- 目标环境 resolved Profile 是完整基线。
- 本地已注册 Remote 只覆盖相同 `logicalName` 的 `entry`。
- 未启动的 Domain、Platform、Client 和 PageLibrary 保留目标环境地址。
- Profile 不可访问、不是 JSON 或结构非法时直接失败，不静默降级。

### 3.2 来源优先级

| 模块               | Legacy 兼容模式                         | G2 Profile 模式                  |
| ------------------ | --------------------------------------- | -------------------------------- |
| Shell              | 本地                                    | 本地                             |
| 已注册 Domain      | 本地 Remote                             | 本地 Remote                      |
| 未启动 Domain      | 目标环境 qiankun 应用                   | 目标环境 MF Remote               |
| 已注册 Platform    | 本地 Remote                             | 本地 Remote                      |
| 未启动 Platform    | 本地 workspace，按需加载                | 目标环境 MF Remote               |
| Domain 自有 Client | 本地 workspace，随 Domain 使用          | 本地 Domain 激活时使用 workspace |
| 跨域 Client        | 本地 workspace，按需加载                | 目标环境，除非显式本地覆盖       |
| PageLibrary        | 本地注册优先；必要时 workspace fallback | 本地注册优先，否则目标环境       |
| API、权限、数据    | 目标环境                                | 目标环境                         |
| 工作台             | 未启动时目标环境，启动时本地            | Profile 环境版本或本地覆盖       |

Legacy 模式下 Platform 使用 workspace 是必要兼容行为：当前测试环境没有可供加载的 G2 Platform manifests。它们只在代码实际调用时懒加载，不等于启动了全部 Platform 服务。

## 四、核心整改

### 4.1 Profile 与开发模式解析

在 Shell 开发服务中建立明确的：

```ts
type LocalDevMode = "legacy-compat" | "g2-profile";
```

规则：

- 未配置 `G2_DEV_PROFILE_URL`：`legacy-compat`。
- 已配置：`g2-profile`。
- `legacy-compat` 使用 `deploy/compositions/.resolved/dev.pc.resolved.json`。
- Shell 启动器负责在启动前生成本地 Profile。
- `g2-profile` 启动前验证目标 Profile。
- 生产环境连接继续默认拒绝，只有 `G2_DEV_ALLOW_PRODUCTION=1` 才放行。

### 4.2 分离清单、来源和加载时机

整改为三个独立职责：

1. Profile Inventory：保留完整 Platform、Client 和可开发应用声明。
2. Source Resolver：决定使用 workspace、本地 Remote 还是目标环境。
3. Load Policy：由 `runPlatformInstalls()`、`ensurePlatform()`、`ensureClient()` 决定何时加载。

Legacy Profile 处理：

- `platform`、`client` 保持完整。
- `remotes` 只保留已注册的本地原生 Domain。
- `pageLibrary` 保留已注册项，并为必要的本地消费提供 workspace fallback。
- 不再通过删除 Platform 规避 localhost 请求。

来源优先级：

```text
已注册本地 Remote
    ↓
Legacy 模式所需 workspace fallback
    ↓
目标环境 Remote
```

本地 Remote 已注册时，workspace loader 必须让出优先级，确保实际测试的是该 Remote 及其 HMR。

### 4.3 工作台动态回退

启动时根据最终 Profile 判断 `workbench` 是否为可用原生 Domain。

本地工作台已注册或 G2 Profile 提供工作台时：

- `/index` 跳转 `/d/workbench`。
- 顶栏工作台入口指向 `/d/workbench`。
- 不注册目标环境 qiankun 工作台。

Legacy 模式且本地工作台未启动时：

- `/index` 保持为目标环境工作台路径。
- 使用目标环境 `window.config.homeEntry` 注册 qiankun 工作台。
- `#workbench-container` 正常显示。
- 不请求 `localhost:5078/mf-manifest.json`。

本地工作台启动或停止后，由注册 SSE 触发整页刷新，自动切换来源。

### 4.4 业务应用环境回退

恢复显式映射表：

```ts
Record<DomainLogicalName, readonly LegacyQiankunAppName[]>;
```

至少覆盖：

- accessControl
- dailyTask
- dailyInspection
- securityMonitor
- safetyDuty
- fireManagement
- emergencyManagement
- emergencyDispatch
- hazardGovernance
- riskGradedControl
- genericEquipmentMonitorPages
- energyConsumption

Legacy 模式只过滤“当前已启动本地 Domain”对应的目标环境应用。未启动应用完整保留。

工作台别名单独处理，不混入普通 `#appContainer` 应用列表，防止重复挂载。

### 4.5 Client 行为

Client 是前端接口调用实现，不是本地后端服务。

Legacy 模式：

- Client 声明完整保留。
- 实现从 workspace 按需加载。
- 不需要执行 Client 的 `bun dev`。
- Domain 调用 `ctx.ensureClient()` 时才创建 Client。
- 所有 HTTP 请求仍通过 Shell 代理到目标环境。

G2 Profile 模式：

- 本地已启动 Domain 对应的自有 Client 使用 workspace 实现。
- 未启动 Domain 和跨域 Client默认使用目标环境 Profile。
- 跨域 Client 有本地联调需求时再显式启动或覆盖。

因此，新增前端 Client 方法时只启动对应 Domain；但真实后端接口必须已经部署到目标环境。本次整改不自动启动本地 Java/BFF/后端服务。

### 4.6 HMR 与生命周期

保留当前分支已有的 Remote HMR 能力：

- Domain 源码变化触发活动 Domain 软重挂。
- 清理 Module Federation 模块缓存后重新加载。
- 保留当前路由和查询参数。
- Remote 注册、注销或心跳失效时整页刷新，用于切换本地/环境来源。
- Platform Remote 修改可触发刷新；workspace Platform 由 Shell Vite 监听。
- `Ctrl+C` 注销 Remote 并终止完整 Vite 进程组。
- 端口冲突自动选择新端口。
- 同一 `logicalName` 保持单活，避免两个服务竞争覆盖入口。

### 4.7 开发状态接口

保留现有本地接口，并让状态语义准确：

```ts
interface LocalDevStatus {
  mode: "legacy-compat" | "g2-profile";
  environmentName: string;
  profileUrl: string;
  apiTarget: string;
  remotes: LocalRemoteRegistration[];
  sources: Array<{
    logicalName: string;
    kind: "platform" | "client" | "pageLibrary" | "remote";
    source: "workspace" | "local-remote" | "target-environment";
    entry?: string;
  }>;
}
```

接口：

```text
GET    /__g2_dev/remotes
POST   /__g2_dev/remotes
DELETE /__g2_dev/remotes/:logicalName
GET    /__g2_dev/events
```

接口继续只接受 loopback 写操作。页面不显示此前右上角的开发环境提示条，环境信息通过启动日志和状态接口查看。

### 4.8 环境配置和文档

修正 `apps/shells/pc/.env.development.example` 和 `LOCAL_DEVELOPMENT.md`。

默认测试环境：

```dotenv
G2_DEV_ENV_NAME=test
G2_DEV_API_TARGET=https://cube-test.guhecloud.com:3000
# 当前测试环境无 G2 Profile，不设置 G2_DEV_PROFILE_URL
```

切换到支持 G2 Profile 的环境：

```dotenv
G2_DEV_ENV_NAME=uat
G2_DEV_API_TARGET=https://cube-uat.guhecloud.com:3000
G2_DEV_PROFILE_URL=https://cube-uat.guhecloud.com:3000/compositions/prod.resolved.json
```

开发者覆盖文件固定为：

```text
apps/shells/pc/.env.local
```

该文件已被 Git 忽略，修改后需要重启 Shell。

启动命令：

```bash
# Shell
cd apps/shells/pc
bun dev

# 或仓库根目录
bun dev

# 需要调试的 Domain
cd apps/domains/hazard-governance
bun dev
```

Legacy 模式修改 `pc-ui` 时，通常只需 Shell 和消费 Domain；需要验证独立 MF 边界时再启动 `apps/platforms/pc-ui`。

## 五、发布隔离

所有新逻辑必须限制在 Vite `serve` 或 `import.meta.env.DEV`：

- `server.host` 保持 `true`。
- `server.origin` 和 Remote 注册 URL 使用 `localhost`。
- `build`、`preview` 和生产 Profile 的既有语义不修改。
- 不修改 `deploy/compositions/prod.pc.yaml`。
- 不修改 `deploy/release-sets/prod.yaml`。
- 不删除或改变现有 Client 发布成员。
- 不把开发注册接口、SSE、workspace resolver 打入生产运行路径。
- 不要求生产构建文件 hash 完全相同，但发布成员、入口、运行行为和发布命令必须与 `origin/main` 一致。

## 六、测试与验收

### 自动测试

补充并通过：

- Legacy 模式不请求目标 `/compositions/prod.resolved.json`。
- Legacy Profile 保留完整 Platform、Client。
- 未注册 Domain 不出现在 MF Profile。
- 已注册 Domain 正确覆盖本地 manifest。
- G2 Profile 模式保留全部环境 Remote，仅覆盖同名注册项。
- Platform 来源优先级测试。
- Client workspace/环境来源测试。
- 显式 legacy 应用别名映射测试。
- 工作台本地与环境两种路由测试。
- 注册、重复注册、心跳过期、注销测试。
- HMR 缓存清理及软重挂测试。

执行：

```bash
bun run validate:compositions
bun run check:deps
bun run check:deps-graph
bun run typecheck
bun test
bun run build
bun run lint
git diff --check
```

### 浏览器闭环

必须实际验证：

1. 只启动 Shell，可以打开登录页并成功登录。
2. 本地工作台未启动时，Network 加载目标环境 `homeEntry`，不请求 localhost 工作台 manifest。
3. 只启动隐患治理后，仅隐患治理切换到本地。
4. 修改隐患治理页面后 HMR 生效。
5. 停止隐患治理后，心跳失效并恢复目标环境应用。
6. 启动本地工作台后 `/index` 切换到 `/d/workbench`；停止后恢复环境工作台。
7. 修改 `pc-ui` 后消费页面能看到变化。
8. 切换 `.env.local` 后，API、FRONTEND_CONFIG、工作台和未启动应用同步切换环境。
9. 端口冲突时自动换端口并成功注册。
10. Console 无新增 MF、CORS、重复 Vue、HMR 和 Promise rejection 错误。
11. Network 中 API 请求全部指向所选目标环境代理。

### 发布回归

确认以下命令与配置仍和 `origin/main` 一致：

```bash
git diff origin/main -- \
  deploy/compositions/prod.pc.yaml \
  deploy/release-sets/prod.yaml \
  deploy/nginx
```

结果必须为空。生产构建产物中不得出现：

```text
/__g2_dev/
/__mf_hmr
G2_DEV_LOCAL_RUNTIME
localhost 的开发 Remote manifest
```

## 七、提交策略

当前 `8e4444c` 尚未推送，最终实现验证通过后，将其与 6 个未提交试验修改收敛为一个正确提交，不保留错误修复再追加补丁。

提交信息使用中文：

```text
fix(dev): 恢复本地按需加载与目标环境回退
```

由于远端仍停留在该提交的父节点，amend 后可以正常 fast-forward push，不需要强制推送。

## 八、明确不在本次范围内

- 不自动启动本地后端、Java 服务或 BFF。
- 不建设独立组件开发台。
- 不重构生产 Composition 架构。
- 不删除现有 Client 发布单元。
- 不要求所有目标环境立即发布 G2 resolved Profile。
- 不把 Legacy qiankun 兼容层扩展为长期生产协议。
