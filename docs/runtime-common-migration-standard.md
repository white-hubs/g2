# Runtime Common 子应用迁移标准

本标准是所有新建、迁移、重构 production Domain 和 Page Library 的强制门槛。目标是让公共能力由 Shell 统一解析并按版本提供，业务消费者只在运行时依赖公共实现，不把可执行副本打进自己的产物。`shared.singleton` 不是 Runtime Common，也不能证明消费者没有本地 fallback。

## 必须满足

1. **先识别公共运行时依赖。** 检查业务源码和间接依赖，列出 `pcUi`、`pcMap`、图表、播放器、告警、SCADA、视觉 SDK 等 Runtime Common provider。不能只搜索页面直接 import；动态 import、barrel 导出和共享组件依赖也要追踪。
2. **运行时加载先于消费者初始化。** Domain `install` 必须通过 `loadRuntimeCommon(name, "index")` 加载它实际使用的公共能力，再初始化对应平台、注册路由或挂载业务模块。加载失败必须 fail closed；禁止 catch 后回退到领域 bundle、本地副本或旧全局对象。
3. **公共实现禁止静态打包。** production 消费者不得对 Runtime Common 包使用静态 import、动态 `import()` 或 re-export。需要类型时只允许 `import type` / `export type` 等编译期引用。运行时组件使用领域自己的 Runtime Common 代理；类型单独从公共包 type-only 引入。若为兼容旧源码而保留原包 specifier，只能由 Vite 精确 alias 到本地 fail-closed 代理，且产物扫描必须证明公共实现没有被打入消费者。
4. **Federation 与依赖声明。** 消费者的 `@g2-platform/*` Runtime Common 运行依赖应移入 `devDependencies`（只用于本地类型检查/开发），并从消费者 Federation `shared` 移除。例外必须写明原因和失效条件，经代码审查批准；不能因本地开发方便重新引入生产 fallback。
5. **生产矩阵同步。** 将实际调用的 provider 准确登记在 `deploy/runtime-common-dependencies.prod.json` 的 consumer 条目；provider 及其依赖必须在 composition/release set 中注册，确保加载顺序有效。不要添加无实际调用的依赖，也不要仅为让检查通过而伪造登记。
6. **构建证明没有 fallback。** 运行 Runtime Common 产物扫描，确认消费者产物不包含 provider 实现；检查 federation manifest 的 shared 列表不含 Runtime Common 包，仅保留框架等明确允许的依赖。
7. **验证并记录。** 完成相关 typecheck、测试、生产构建、Runtime Common profile/matrix 检查、产物扫描及 `git diff --check`。可运行时还须检查实际加载版本、Network 和 Console；不能以构建成功替代运行时验收。任何未通过项均需标明为阻塞/未验收。

## 合入门禁

- 所有生产消费者必须同时出现在 production composition、release set 与 Runtime Common dependency matrix；自动检查不得遗漏或多登记。
- CI 对本次变更涉及的 production consumers 执行增量 Runtime Common 门禁，并对完整生产 Profile 执行全量矩阵检查；生产 release set 构建后，对所有 Profile 中的 Domain / Page Library 产物执行 Runtime Common fallback 扫描。合入所需 CI 必须通过 Git 平台分支保护设为必需检查，否则门禁失败仍可能被绕过。
- 增量检查核对 consumer 矩阵与源码实际加载一致、运行时依赖不进入生产 dependencies、Federation `shared` 不包含公共 Remote，并扫描源码静态导入。全量 `--profile` 检查同步验证生产消费者/provider 与矩阵完整一致；纯类型导入不触发静态实现限制。精确 alias 到本地 Runtime Common 代理的消费者，须由 Vite 配置和产物扫描共同证明。
- 新增 consumer 若尚未完成公共依赖盘点、加载顺序、矩阵登记和产物扫描，不得作为 Runtime Common 已改造完成合入或发布。
- 执行入口：`bun ./tooling/runtime-common-check/src/cli.ts --profile`。全量生产产物扫描入口：`bun ./tooling/runtime-common-check/src/cli.ts --profile-artifacts`（要求先构建完整生产 release set）。单包产物入口：`bun ./tooling/runtime-common-check/src/cli.ts <dist-dir> <package-name> [<package-name> ...]`。
- CI 增量门禁入口：`bun ./tooling/runtime-common-check/src/cli.ts --changed-from=<git-ref>`。

## 迁移检查清单

- [ ] 源码及传递依赖公共能力盘点完成。
- [ ] Runtime Common 代理 fail-closed，且在业务模块初始化前加载。
- [ ] 源码无 Runtime Common 运行时静态导入 / 动态导入 / re-export。
- [ ] `@g2-platform/*` 仅保留 type-only 引用；包依赖为开发期依赖，不在 Federation `shared`。
- [ ] production composition、release set 和依赖矩阵一致。
- [ ] typecheck、相关测试、production build、profile check、产物扫描通过。
- [ ] 可运行环境完成浏览器与 Network/Console 验收；否则清楚记录阻塞证据。
