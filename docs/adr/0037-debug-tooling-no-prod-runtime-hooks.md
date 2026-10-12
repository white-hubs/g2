# 生产态 Shell 不内嵌覆盖/诊断能力,调试与诊断走本地专用层 + MF 官方生态 + 独立外部工具

本地多包联调、跨包调试与线上问题排查这三类需求,常见 MFE 实践会在门面运行时里内置一个「覆盖开关」(如 URL query / localStorage 指定某个 remote 改指向本地或另一版本),同时可能再内置一个诊断面板显示当前装载状态。本仓库明确不这样做:`@g2-shell/pc` 的生产构建产物里不包含任何「运行时改指向」或「运行时暴露装载详情」的代码路径——这两类能力都可能被滥用为攻击面(前者可被用来让页面加载攻击者控制的远程模块,后者会把内部拓扑暴露给未预期的访问者),而收益(开发便利、故障定位)可以用不进生产包的方式拿到同样效果。

具体分工:

- **本地多包联调**:复用 Composition Profile 自身已有的「改 entry 指针即可热修」机制(ADR-0014 门禁②),仅在**本地开发态**追加一层 gitignore 的 `*.local.yaml` 覆盖(如 `deploy/compositions/prod.pc.local.yaml`),与主 Profile 同形态(`{name, entry}` 列表),按 `name` 覆盖对应条目的 `entry`;该文件不参与构建打包,只在本地 `dev` 启动脚本里被读取并与主 Profile 合并。
- **跨包调试体验、线上问题排查**(定位哪个 Platform 版本 / 哪个 Profile 生效):复用 Module Federation 官方 Chrome DevTools 插件——它基于标准 `mf-manifest.json` 与 runtime snapshot 工作,页面不需要额外配合任何暗号即可免费获得代理调试能力;新增的诊断需求(如「看当前部署到底装了哪个 Profile、各 Platform 什么版本」)交给一个独立的诊断工具,通过 fetch 部署产物里的静态清单来查,不在 `@g2-shell/pc` 里加诊断路由或运行时全局变量。

这偏离了不少 MFE 教程「host 自带 debug 开关/诊断面板」的默认做法,是权衡后的主动选择:换来的是生产 shell 零新增攻击面,代价是本地/线上调试要多学几个专用工具(本地 override 文件、MF 官方插件、独立诊断工具),不能「加个 URL 参数就地切换」。

## 与 ADR-0042 inline override 的边界

本 ADR 禁止的「运行时改指向」特指**用户可控**的覆盖入口(URL query / localStorage 等任何页面访问者能在浏览器侧临时篡改的信号)——这类入口的攻击面在于任何访问者都能诱导页面加载非预期的远程模块,且不留部署侧审计痕迹。

ADR-0042 为 inline 域新增的 `allowOverride` 不属于此列:它是**部署侧**能力,开关与覆盖目标(override remote 的 `basePath`)只能通过 Composition Profile 声明,走 git 提交 + CI 发布,不存在用户在浏览器侧临时改写的入口;轮询 `mf-manifest.json` 比对版本号也只用于弹出「有新版本,请手动刷新」提示,不做运行时组件热替换,不反向暴露内部拓扑给页面访问者。因此 ADR-0042 是本 ADR 允许范围内的例外,不需要、也不构成对本条禁令的修订。
