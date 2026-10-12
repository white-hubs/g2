# Shell 内置临时 qiankun 兼容桥，承接旧 microApps 清单

`@g2-shell/pc` 本轮引入一个**显式标记为兼容层**的临时 qiankun 桥，直接沿用旧 `window.config.microApps` 清单（`activeRule=/portal/{name}/`、`container=#appContainer`）把仍在用 qiankun 生命周期的业务微应用原样挂起来。这不是长期架构——新装载模型是 Composition Profile + MF（ADR-0010/0017），qiankun 桥只是为了在业务域尚未迁移（ADR-0024 波次靠后）期间保证双轨可用（ADR-0025：新旧并行，不钉切流单位）。

之所以现在就接，而不是等真正迁域时再接：这轮验收要求 host 有「子应用装载编排」能力对齐现网（见 handoff 验收标准第 4 条）。业务域迁移完成、旧 microApps 清单清空后，这个桥应当整体删除，不应演化为长期能力；新增/沿用它不需要走 ADR-0001（qiankun 是 npm 依赖，不是对旧仓 workspace 的路径依赖）。

## props 契约必须原样对齐

旧业务微应用通过 qiankun `props` 拿到五个字段，缺一个都会「装上了但功能是灰的」：`router`、`base`、`permissionConfig`（模块级**可变共享对象**，`beforeLoad`/`beforeMount` 时被就地改写，子应用按引用持有）、`routes`（当前应用展开后的扁平菜单）、`auth`（鉴权信息快照）。数据来源必须是 Shell 自己的门户编排 store（`useChildApplication` 一类）与 pc-auth 的鉴权状态机（ADR-0028），不能重新发明一套。
