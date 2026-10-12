# G2 本地按需开发模式说明

## 一、验收分支

```text
codex/on-demand-local-dev-only
```

该分支基于 `origin/main` 创建。本次改造只调整本地开发启动方式，不改变生产构建、发布产物和发布流程。

## 二、本地开发启动流程

### 1. 启动 PC Shell

```bash
cd apps/shells/pc
bun dev
```

也可以在仓库根目录执行：

```bash
bun dev
```

默认连接测试环境，Shell 默认地址为 `http://localhost:5100`。启动日志会显示当前环境、Profile 地址和 API 地址。

### 2. 启动需要调试的 Domain

例如调试隐患治理：

```bash
cd apps/domains/hazard-governance
bun dev
```

子应用启动后会自动选择可用端口、等待 `mf-manifest.json`、向本地 Shell 注册 Remote，并刷新浏览器切换到本地代码。日常开发只需要启动 Shell 和当前正在修改的 Domain，不需要启动全部应用。

### 3. 修改公共 UI

修改 `pc-ui` 时，通常只需要启动 PC Shell 和消费该组件的 Domain。开发模式会加载 workspace 中的 `pc-ui` 源码，不需要单独建设组件开发台。需要验证 `pc-ui` 自身 Remote HMR 时，也可以执行：

```bash
cd apps/platforms/pc-ui
bun dev
```

## 三、代码和资源来源

| 内容                        | 来源                                               |
| --------------------------- | -------------------------------------------------- |
| PC Shell                    | 本地源码                                           |
| 已启动的 Domain             | 本地源码                                           |
| 未启动的业务 Domain         | 目标环境 resolved Profile                          |
| 本地 `pc-ui` workspace 源码 | 本地源码                                           |
| API、数据、权限             | 目标环境                                           |
| 一对一业务 Client           | 随对应 Domain 加载                                 |
| 跨域 Client                 | 兼容模式下使用本地 workspace 实现或目标环境 Remote |

停止本地 Domain 后，Shell 会自动注销该 Remote，页面恢复使用环境版本。

## 四、切换目标环境

编辑以下文件：

```text
apps/shells/pc/.env.local
```

该文件不提交 Git。例如切换到 UAT：

```dotenv
G2_DEV_ENV_NAME=uat
G2_DEV_API_TARGET=https://cube-uat.guhecloud.com:3000
G2_DEV_PROFILE_URL=https://cube-uat.guhecloud.com:3000/compositions/prod.resolved.json
```

修改后重启 Shell：

```bash
cd apps/shells/pc
bun dev
```

其中 `G2_DEV_ENV_NAME` 是页面显示的环境名称，`G2_DEV_API_TARGET` 是接口、数据和权限请求地址；未设置 `G2_DEV_PROFILE_URL` 时，Shell 使用 `${G2_DEV_API_TARGET}/compositions/prod.resolved.json`。生产环境默认禁止连接，只有显式设置 `G2_DEV_ALLOW_PRODUCTION=1` 才允许。

需要用局域网 IP（例如另一台电脑打开 `http://192.168.x.x:5100/`）时，在 `.env.local` 增加：

```dotenv
G2_DEV_ALLOW_LAN=1
```

该开关只放行 `/__g2_dev` 的**只读**访问，并把已注册 Domain Remote 的 `localhost` 改写成当前访问 IP；注册/注销本地 Remote 仍只能在本机完成。Platform/Client 在局域网打开时优先走 Shell workspace，避免跨端口 CORS。修改后必须重启 Shell；若本机还起了 Domain/Platform Remote，也建议重启它们以带上 CORS 头与 `0.0.0.0` 监听。

目标环境必须提供有效的 resolved JSON Profile。若该地址返回 HTML 或无法访问，Shell 会在启动阶段失败并明确报错；不能回退到本地 localhost Profile，因为那会让未启动的 Remote 错误地指向本机。

## 五、端口和本地 Remote 管理

子应用优先使用推荐端口，端口被占用时自动选择空闲端口。Shell 会记录实际端口，子应用退出时自动注销；心跳超时后，失效注册也会被自动清理。

开发期 workspace shared（例如 `@g2-platform/pc-ui`）保持源码加载，不参与 Remote 的依赖预构建。这样 Vite 启动时只预构建第三方依赖，不会因 Module Federation 把整套 workspace UI 加入扫描入口而长期阻塞 `mf-manifest.json`。

查看当前本地 Remote：

```bash
curl http://localhost:5100/__g2_dev/remotes
```

查看 Shell 实际提供给浏览器的开发 Profile：

```bash
curl http://localhost:5100/compositions/dev.resolved.json
```

## 六、与 `origin/main` 原有开发模式的区别

原有方式通常通过 `dev:full` 一次启动 Shell、Domain、Platform 和 Client，存在启动时间长、固定端口冲突、修改单个 Domain 也要等待全量应用启动等问题。

当前模式改为：

```text
启动 PC Shell
        ↓
只启动正在开发的 Domain
        ↓
其他未启动应用使用目标环境
        ↓
本地 Domain 自动注册并覆盖同名 Remote
```

主要变化：从全量启动改为按需启动，从固定端口改为动态端口，支持连接测试或 UAT 环境数据，本地 Domain 停止后自动恢复环境版本；新增业务接口时不需要单独启动 Client 服务。`bun run dev:full` 仍然保留，用于全量本地回归。

## 七、发布流程兼容性

本次改造只作用于 `dev` 启动脚本和开发期 Vite 配置：

- `build` 脚本保持原有行为；
- 生产构建不会包含本地注册接口和开发期 workspace alias；
- `deploy` 配置和发布清单不改变；
- 独立 Client 的发布边界不改变；
- 原有生产发布流程和产物不受影响。

## 八、常见注意事项

1. 修改 `.env.local` 后必须重启 Shell。
2. 同一个 `logicalName` 只能启动一个本地实例。
3. 不要手动修改 `deploy/compositions/.resolved/dev.pc.resolved.json`，它会在 Shell 启动时重新生成。
4. `contracts/*` 是接口契约包，不需要启动服务。
5. 如果浏览器仍显示旧的启动错误，先停止占用 5100 端口的旧 Shell，再重新执行 `bun dev`。
6. `bun run dev:full` 仅用于全量回归，日常开发优先使用按需启动模式。
7. Domain 冷启动或 lockfile 变更后，Vite 可能长时间 `optimizeDeps`（预构建第三方依赖）。这段时间 `mf-manifest.json` 可能短暂超时，但本地进程仍在；`dev-link` 会继续向 Shell 心跳并保持注册，**不会**因此注销本地 Remote、也不会回退到测试环境 `/portal/*`。Domain 终端若出现 `manifest temporarily unreachable; keeping ...`，属于预期，等 `dependencies optimized` 后即可正常打开 `/d/{domain}/...`。
