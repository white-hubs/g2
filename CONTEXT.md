# Cube Dual-Shell（g2）

Cube Web 前端以双门面组装业务域；本仓库为 greenfield 落地仓，旧仓仅作迁移源。

## Language

**新仓（g2）**：
从零搭建门面、契约与平台能力的目标仓库；是双门面架构的演进基线。
_Avoid_: 新壳仓（若指整仓）、升级仓

**旧仓（ghcloud）**：
存量 monorepo，仅作迁移源与对照实现；不作为新壳演进基线。
_Avoid_: 源仓（若暗示可继续叠新架构）、主仓

**门面（Shell）**：
PC、H5 或管理端等主应用宿主，负责鉴权状态机（token 生命周期/守卫/登出）、框架布局（挖洞位、路由表）与桥、按 Composition Profile 装载域与平台；具体的门面装饰（顶栏/菜单/皮肤等，见 Chrome）与登录页内容可来自 Platform，但鉴权状态机与路由表归属权始终在门面自己，不下放给 remote。包 scope 为 `@g2-shell/*`。
_Avoid_: 宿主（单独使用时易与旧 bimops 混淆）、主应用（若未区分入口）、mf-root

**PC 门面（cube-pc-shell）**：
桌面端门面；新仓内新建的 MF Host，不是 bimops 或 mf-root 的翻版。
_Avoid_: bimops、mf-root（作 Host）

**H5 门面（cube-h5-shell）**：
移动端门面；单域存活，鉴权与桥在壳内。骨架阶段不建设；目录/scope 预留，实现放到后续波次。
_Avoid_: H5 跳转表入口、万能壳

**现网 PC 门户（bimops）**：
旧仓生产在用的 PC 门户门面（`legacy/bimops-fe-web-migrate`），经 qiankun 加载一批接入 qiankun Vite 插件的微应用；迁移期主要切流对照对象之一。
_Avoid_: mf-root、唯一宿主（旧仓还有管理端等门面）、现网主应用（未点名时）

**现网管理端门户（admin）**：
旧仓管理端门面（`legacy/admin-migrate`），装载模式与 bimops 同类（qiankun + 微应用），产品面与 PC 门户不同。
_Avoid_: 把它并进 bimops、忽略为「非门面」

**微应用（旧仓 qiankun）**：
被门户门面通过 qiankun 运行时拉起的子应用；新仓对应物是域（Domain），契约与运行时改为 MF，不再沿用 qiankun 生命周期。
_Avoid_: 在新仓文档里继续把 Domain 叫微应用

**独立应用（Standalone App）**：
不走门户组装装载、可单独部署的应用（旧仓如 UE5、指挥调度及部分独立 H5；新仓落在 standalone 槽位）；可与域/平台共享库，但不是门面按 Profile 拉起的域。包 scope 为 `@g2-standalone/*`。
_Avoid_: 一律当成微应用/域、一律排除在仓库模型外

**客制（Customization）**：
在标品之上的增量能力（旧仓 `prod/customize` 等），形态可为微应用、独立应用或其他；目标是 remote + Profile 增量，而非长期分叉整仓。覆盖粒度按部署形态分层：私有化部署天然隔离（整套部署实例本身即服务单一客户，不需要运行时区分客制与标品）；SaaS 部署下目前只有系统级客制（同一环境内对所有租户统一生效），复用版本注册表的指针替换机制即可，不需要新概念；租户级细粒度客制（同一 SaaS 环境内只对部分租户生效）留作未来扩展，Composition Profile 暂不引入 tenant 维度。与「标准可拔插能力」不同：客制不是产品标准的一部分，只服务特定客户/项目。
_Avoid_: 定制包（若暗示改壳源码）、私有分支即架构、与「标准可拔插能力」混用、不加区分地统称「租户」（私有化部署的客户不是 SaaS 意义上的租户，见 Flagged ambiguities）

**标准可拔插能力（Standard pluggable capability）**：
产品标准功能的一部分，但按配置/Composition Profile 决定是否装载（如 RTC 通话、`pc-alarm-popup` 实时报警弹窗）；区别于客制——它不是租户/项目增量，是标品自身可选装的一部分，迁移/验收时必须做到真实可用，不能因为「暂不装」而被当作未完成。决议见 ADR-0029（通话）/ ADR-0062（报警弹窗）。
_Avoid_: 与客制混为一谈、当作可无限期搭桥的 stub、把报警弹窗继续算进 pc-rtc

**租户实时报警弹窗（Tenant realtime alarm popup）**：
本租户收到 `ALARM_NOTICE` 且载荷无跨市场 `marketTenant` 时，在门户顶层弹出的实时告警叠加层（队列、级别、属性/视频、进详情）；与报警记录页内的处理/指派/挂起弹窗不是同一概念。
_Avoid_: 与总部报警弹窗混称、与报警记录操作弹窗混称、笼统只说「报警弹窗」而不分租户/总部

**总部报警弹窗（Headquarters alarm popup）**：
`ALARM_NOTICE` 带跨市场 `marketTenant` 时的实时告警叠加层；旧仓按市场配置拉远端弹窗入口展示，与本租户弹窗分流。
_Avoid_: 与租户实时报警弹窗混称、当成普通通知 toast

**报警弹窗 Platform（Alarm popup platform）**：
承载租户/总部实时报警弹窗的标准可拔插 Platform：`@g2-platform/pc-alarm-popup`；订阅消息总线事件、消费报警与总部市场 Client、挂顶层叠加 UI；**不**并入 `pc-rtc`（融合通讯另册）。
_Avoid_: 包名 pc-alarm-modal（易与记录页操作 Modal 混）、把报警弹窗塞进 pc-rtc、当成某业务 Domain 的私有页

**总部市场配置 Client（Headquarters market client）**：
为总部报警弹窗等跨市场能力提供市场接入配置的服务 Client（约定 `@g2-client/headquarters-market`）；领域名是总部/市场，不是后端遗留路径名 `dataintegrate`。
_Avoid_: 包名 dataintegrate、塞进 alarm-center Client、与 SaaS「租户」混称 marketTenant 而不加「市场」限定

**报警弹窗双承载（Dual alarm-popup hosting）**：
同一 Platform 内两种承载并存——**租户实时报警弹窗**用本仓原生 TSX 叠加层；**总部报警弹窗**因跨市场远端入口（旧仓按市场配置拉 iframe）暂无等价本仓方案，继续保留 iframe 承载，直到总部链路另有决议。
_Avoid_: 强行用一种承载覆盖两种场景、把总部远端 iframe 误当成可删的过渡债而不交付

**菜单归属码（Menu-owning navigate codes）**：
Profile 上标识「该 OUAA 应用侧栏叶子改由某 MF Domain `menuContribution` 接管」的 code 集合（现有 `navigateCodes` 语义应收窄为此）；命中后丢弃 OUAA portal 叶子。
_Avoid_: 与 intent 可跳码混用同一张表、把凡能跳详情的业务码都当成已迁菜单归属

**Intent 可跳码（Intent-resolvable codes）**：
仅供 `navigate-intent` 把 OUAA/业务 `applicationCode` 解析到某 MF 宿主（如报警详情 `entry: alarmDetail`）的 code 集合；**不**触发侧栏菜单剥离。可与菜单归属码重叠，但权威分离。
_Avoid_: 用扩 navigateCodes 兼做 intent 而误剥多应用侧栏

**报警详情应用码匹配（Alarm-detail applicationCode match）**：
从实时报警弹窗进详情时，推送载荷里的业务 `applicationCode` 必须与目标 Domain 的应用码（Domain `config.applicationCode` / 该域所代表的业务应用）一致才允许进入；不匹配则中断或提示异常。禁止把未迁应用（如消防）改道进已迁宿主并覆盖 applicationCode 来制造「看起来能进详情」的假象。
_Avoid_: 详情页用意图参数覆盖宿主默认码以兼容未迁应用、跨应用借宿主装详情可用性

**门面装饰（Chrome）**：
围绕域内容本身的界面装饰层（顶栏/导航菜单/标签页/工作台皮肤等），区别于门面的框架布局（挖洞位）与域的业务内容；本仓库按独立发版节奏把它落成 Platform（如 `@g2-platform/pc-chrome`），偏离多数 MFE 教程「chrome 由门面自持」的默认做法，理由见 ADR。
_Avoid_: 布局（布局是门面自己的框架职责，chrome 是被挖洞进去的装饰内容）、皮肤（皮肤只是 chrome 的一种，不要等价）

**UI 组件形态（TSX）**：
本仓一切 Vue UI（Shell / Platform / Domain / 迁入的消息中心与业务微应用）必须用 `defineComponent` + **TSX**（`.tsx`）+ **CSS Modules**（`*.module.css`）实现；**禁止** `.vue` 单文件组件（SFC）。门禁见 `check:forbidden-files`（兼容别名 `check:no-vue`），决议见 ADR-0049 / ADR-0056。迁入本仓时必须按此标准适配，禁止旧仓 `.vue` 原样拷贝。PC 侧 `@g2-shell/pc` / `@g2-platform/pc-auth` / `@g2-platform/pc-chrome` 可额外使用 Tailwind utility（`prefix(tw)`、无 preflight）作焦点/过渡等高 ROI 样式，见 ADR-0051；不替代 CSS Modules，也不默认扩散到 Domain。
_Avoid_: Vue SFC、`.vue` 文件、为迁入物单独豁免 SFC、在 Domain 默认栈全量 Tailwind

**H5 Bridge**：
H5 跑在内部 App WebView（类小程序）时与原生互通的桥；鉴权/桥能力属门面或平台，不应散落在各域各自为政。
_Avoid_: 仅 URL 跳转表、把 Bridge 当成普通工具函数库

**域（Domain）**：
按业务边界划分的可装载模块，通过域契约暴露路由/安装能力，由门面按 Profile 组装；自身不拥有整站入口权。包 scope 为 `@g2-domain/*`。契约入口为 routes（必选）与 install（可选，`(app, DomainContext, config?)`）。**不**拥有后端/BFF 服务调用层——那是服务 Client 的归属（见下）；域只消费所需服务 Client。首个 prod 示范域为 **access-control**（`/d/access-control`，见 ADR-0023 / ADR-0058）。
_Avoid_: 微应用（讨论新仓时）、子应用、app（裸用）、把「谁先做 UI 谁拥有该服务的 client」当成域边界

**域路由前缀 `/d` 与 appRegistryCode**：
全站 MF Domain 挂载统一前缀为 `/d/{appRegistryCode}/…`（Profile `basePath`）。`appRegistryCode` 为稳定 kebab 域名（如 `access-control`），标识挂哪一套域入口；其后子路由由域自管（可含 `/:appCode` 等动态段）。**禁止** MF 域使用 `/portal`（qiankun 过渡专用）。跨域跳转经 `navigate-intent` 传 `{ code, params? }`（含 `entry` 等），由壳解析；**目标态不以 path 为契约**（迁移期兼容除外）。决议见 ADR-0058 / ADR-0059。
_Avoid_: 把 OUAA 应用数据码塞进第二段当 registry code、壳解析域内业务参数、迁完域后仍双轨 qiankun、跨应用写死 `/d/...` 或 `/portal/...` path

**应用域（组装用 Domain）**：
对外可导航的 Domain 组装单元：自持 `routes`、默认 `menuContribution`，以及挂载页面库时注入的能力码表与差异化 config。即使页面实现全部来自页面库 remote，仍须作为正常 Domain 组装进 Profile。不是旧仓 OUAA「应用」实体。
_Avoid_: 把应用域和页面库划等号、认为「全是 remote 就不用声明路由」、复活后端应用树当路由权威

**页面库（page library）**：
跨应用复用的业务页/组件 MF remote，纯 exposes；不拥有对外 URL，不持有 functionCode，不声明导航用 `menuContribution`。物理在 `apps/page-libraries/*`（`@g2-pages/*`），Composition Profile 槽位键 **`pageLibrary`**（无 basePath）。由应用域挂到自有 routes，并注入码表与 API 等差异。库内子页跳转只发 **pageKey** 事件，由宿主应用域译成本域路由或 `navigate-intent`。决议见 ADR-0059 / ADR-0060。
_Avoid_: 共享微应用独占公共 path、页面库自带可对外契约的 vue-router 树、在库内硬编码宿主权限 code

**pageKey**：
页面库内稳定的逻辑页名（如 `alarmDetail`），只用于库→宿主的导航事件，不是 URL path，也不是 functionCode。
_Avoid_: 把 pageKey 当 path、当权限码

**entry**：
应用域内路由主键，供菜单叶子与 `navigate-intent.params.entry` 解析到本域子路径；由该域自己的路由表定义，可与 path 段同形但语义上不是跨应用契约。
_Avoid_: 跨应用传递完整 path、把 entry 当成页面库公共 API

**能力码表**：
应用域持有的 `pageKey | actionKey → functionCode` 映射，挂载页面库时注入；页面库用其做显隐匹配，自身不持有 code。
_Avoid_: 共享页硬编码 functionCode、运行时 sniff 宿主应用名分支权限

**服务面（Service surface）**：
前端可调用的一组后端或 BFF 接口边界（如 message、ouaa、device-center），按服务契约切分，与 UI 上的 **域（Domain）** / **平台能力（Platform）** 不是同一概念。
_Avoid_: 服务域（易与 Domain 混淆）、把某个 Domain/Platform UI 包名当成服务面名

**服务 Client（Service Client）**：
面向某一 **服务面** 的前端调用模块（路径、解包、该服务的请求/响应类型），可被多个 Domain / Platform / Shell 轻量依赖；不跟「先用到该接口的 UI 包」搅在一起。包 scope 为 `@g2-client/<surface>`（一服务面一包）。实现上依赖 **服务契约** 与库型 Platform `@g2-platform/http`（`httpPlatform`）提供的传输，不在各服务 Client 内另起 HTTP 栈。交付不走 Nexus npm；运行时走 remote / 版本注册表（非消费者 `workspace:*` 静态打进）。Profile `client` 声明的逻辑名须在对应 **发版选集 members** 中有条目（与 platform/remote 同纪律）；契约包不进选集。实现与 MF remote **同包**落在 `apps/clients/<surface>`（`@g2-client/<surface>`；逻辑名如 `messageClient`）——不为 remote 再拆一层 packages 源包；契约在根级 `contracts/<surface>`。**禁止**业务 UI / 把 Vue 当 Client 的运行时依赖（调试用 `index.html` 壳可有，不进 exposes）；MF 不强制 `vue` shared。Composition Profile 用独立槽位键 **`client`**（单数键 + 数组，对齐 `platform` / `inline` / `remotes`；条目是服务 Client，不是 HttpClient）。运行时经 **ensureClient** 装载（实现落在 `@g2-composition/loader`，与 ensurePlatform 同层；壳只编排预装），不进 `@g2-platform/*` 语义。Client remote **自持传输编排**：MF 固定 expose **`./client`**，模块导出 `{ create(ctx) → Promise<Api> }`（或等价）；`ensureClient` 负责 `loadRemote(name, "client")` + 传入 **`PlatformContext`** 调用 `create` + 单例缓存。`create` 内幂等 `loadPlatform("httpPlatform")` 并构建 `HttpClient`；消费者不注入、不拼装 http。
_Avoid_: 分域 client（若暗示 client 住在 Domain/Platform UI 包内）、把 client 锚在 pc-messaging 等产品型 Platform、全局单体 SDK 把所有服务面揉成一包且禁止按服务拆包依赖、把服务 Client 当 npm 私仓发版物、把服务 Client 塞进 Profile `platform` 冒充库型 Platform、把 ensureClient 私藏在单一 Shell 包以致其它门面无法复用、让每个 UI 消费者自行 `createX(http)` 散落传输编排、把 Profile 键 `client` / API `ensureClient` 理解成 HttpClient 或浏览器客户

**服务契约（Service contract / interfaces）**：
某一 **服务面** 的类型与 Gateway 接口定义（请求/响应/枚举等），以及该面 **服务 Client 门面类型**（供 `ensureClient<T>` 使用），是 BFF 实现与服务 Client 的共用契约源；改契约须同时核对 Client 与 BFF（及后续业务服务实现）。包 scope 为 `@g2-contract/<surface>`（一服务面一包）；物理在根级 `contracts/<surface>`。**不发 npm、不是 MF remote**；M1 为**纯类型**（UI 仅 `import type`，不进运行时、不挡 Client 热部署）。现阶段手写；OpenAPI/codegen 后置。
_Avoid_: 只在 UI 域里随手写 DTO、把契约当成「前端私有类型」、为「省包数」把所有服务面揉进单一 `@g2-contract`、以「先上 codegen」拖延纠正 UI 包内 client、把契约包做成 remote/热修通道、UI **值**引用契约或 `@g2-client/*`（type-only 除外）

**BFF（Backend for Frontend / Gateway）**：
本仓承担的体验侧服务端：实现服务契约中的 Gateway 接口，做认证透传、聚合/代理下游，经如 `/gw-bff` 暴露给门面与服务 Client。由前端演进仓持有（对齐旧仓 `cube-gateway-server`），**不是** Domain/Platform remote，也不是主站 nginx。包/进程 scope 为 `@g2-server/bff`，物理在根级 `bff/`（业务服务 `@g2-server/<name>` → `backends/`）；**不用** `apps/servers`。**M2 已进仓**（旧 gateway 1:1）。
_Avoid_: 把 BFF 塞进 `@g2-platform/*` MF、把主站 nginx「gateway」容器当成 BFF 业务进程、用「平台团队独占胖 BFF」否定本仓持有体验 BFF、把 BFF 塞进 `apps/servers`

**服务三层（interfaces / client / gateway）**：
旧仓 `cube-services` 的契约—Client—BFF 分层；新仓保留该模式：服务契约 + 按服务面拆的服务 Client + BFF，且预留后续在同仓扩展**业务服务**（非 BFF 的真实后端能力）时仍挂在同一服务体系下，而不是把调用层嵌进 UI 包。物理落点（方案 α）：契约在根级 `contracts/`（纯类型库）；服务 Client（实现+MF）在 `apps/clients/`（Profile 键 `client` + `ensureClient`）；BFF 在根级 `bff/`、业务服务在根级 `backends/`（可部署）；**不用** `apps/servers`。不进产品型 Platform / Domain UI 包。旧仓三层已按服务面全量迁入；对照门禁 `check:cube-services-parity`。决议见 ADR-0057（并部分修正 ADR-0004/0005/0045/0047）。
_Avoid_: 只迁 Client 丢契约与 BFF、把三层拆散到互不相认的仓而无契约源、把 BFF 或 Client 塞进产品型 Platform 包、用单一聚合 remote 捆死所有服务面 Client、试点趁机重做整套消息 API

**双轨债（dual-track `/api/*` vs `/gw-bff`）**：
过渡期壳登录等仍直连现网 `/api/ouaa|file|mdata|message2`，与 cube-services 的 `/gw-bff/*` 并存；代码标 `TODO(dual-track)`，须在 BFF/nginx 具备等价路由后尽快删直连，不作为长期架构。
_Avoid_: 把双轨当成最终形态、新接口继续加 `/api` 直连而不走契约+BFF

**业务服务（Backend service，后续）**：
相对 BFF 的下游或同仓内真实业务后端能力（领域逻辑/持久化），不是门面 MF Domain。物理落在根级 `backends/`。本阶段以 BFF + 代理/透传为主；扩展时仍应对齐服务契约，并由服务 Client 调用，不另开一套「域内私有 API 层」。
_Avoid_: 与 UI **域（Domain）** 混称、把业务服务实现塞进 Platform remote、把 backends 塞进 `apps/servers`

**应用（旧仓 OUAA 概念）**：
旧仓「应用分组→应用→菜单」由 `CubeOuaaService` 驱动的后端导航模型（含 path），在 g2 **不**作为路由权威迁入。口语里说的「应用」若指可导航组装单元，应使用 **应用域**。需要展示分组时用 Composition Profile 的分组展示元数据（纯文案/排序）。
_Avoid_: 把 OUAA 应用和 Domain 划等号、假设域必须向后端注册归属应用、用后端菜单 path 当路由表

**菜单贡献（menuContribution）**：
应用域契约里的可选字段，与 routes 对称，声明**默认**菜单树（label、icon key、顺序、可选 functionCode / 稳定 menuCode），是开发态静态声明；叶子经 code/entry 关联到本域路由，不靠后端 path。区别于旧仓 `menuVOS` 整树下发。
_Avoid_: 菜单权限（见 functionCode）、把 menuContribution 当成后端可改 path 的通道

**菜单 overlay**：
可选的后端/配置覆盖：仅按节点 code 调整默认菜单的层级、顺序、别名、显隐等展示态；**契约禁止 path** 及改 code→页面绑定。无覆盖时原样使用 `menuContribution`。决议见 ADR-0059。
_Avoid_: 用 overlay 新增默认可导航叶子、下发 path/url、复活整树 menuVOS

**功能权限（functionCode）**：
前后端唯一共享的权限契约：后端为每个用户下发一组平铺的 code 字符串（登录时一次性全量下发），前端用它对菜单项/按钮做 UX 级隐藏或禁用（体验层，不构成安全边界），后端在各域自己的业务接口上用同一套 code 做真实拦截（安全边界）。默认菜单的存在与结构由菜单贡献（及可选 overlay 的展示重组）声明——functionCode 只回答"这个已经存在的入口/按钮/接口，这个用户能不能用"，不回答"路由挂在哪个 path"。
_Avoid_: 权限（过于笼统，未区分功能级与菜单级）、用户菜单权限（旧仓 `functionCode`/`functions` 挂在菜单节点上按需查询的用法，g2 改为登录时一次性平铺下发）

同一套 code 集合也承担"同部署下按用户隐藏整个域入口"这种粗粒度可见性（约定形如 `domain:{domainName}:visible` 的 code），不为此单开一套后端数据结构；这与"装没装某个域"（部署级可见性，Profile 决定）是两层不同的可见性开关，不要混用。

**平台能力（Platform）**：
独立发版的远程模块，由门面经 Profile 加载；禁止打进各域产物。拆分依据是**独立发版节奏**（不想跟着门面一起发版/需要单独热修），不要求「跨域复用」——即使当前只有一个门面消费，只要有独立发版诉求就应落 Platform（如 UI/Bridge/顶栏皮肤/消息与通话/日志）；判断依据不局限于业务功能，基础设施类库（如 logger、日期、静态资源 URL 解析）只要有「不想等消费者重新构建发布」的独立热修诉求，同样适用（见 ADR-0039）。例外：鉴权状态机（token 生命周期/守卫）业界惯例与本仓库决定都是留在门面自己，不下放给 Platform；门面可以从鉴权类 Platform 动态引入登录页内容组件，但路由表与状态机仍是门面自持。另有一类能力因 ADR-0041 须把三方库收敛在 `@g2-platform/*` 背后（如 `@g2-platform/pc-ui` 收敛 `ant-design-vue`，见 ADR-0012），但其**正确装载形态仍是 Profile / MF remote 动态装**（ADR-0050），而不是消费方编译期静态打进产物——否则改 UI/公共基建仍会牵一发而动全身。MF shared singleton（ADR-0018 的 vue 三件套）只保证运行时单实例，不替代「独立发版边界」。运行时内部依赖的归宿是 Platform（含库型 Platform），不是可静态打进消费者的 `@g2-shared/*`。当前 chrome/auth 对 pc-ui 的 workspace 静态依赖是过渡债，不得再扩散到 Shell/Domain。
_Avoid_: basic（旧仓全量打入域的用法）、把 pc-ui 当永久静态基建、把 Platform 根目录 `index.html` 当成独立可运行产品（它只是 Vite 默认构建入口壳，见 ADR-0010 / `apps/platforms/README.md`）、公共库（若指被域打包的依赖）、用 `@g2-shared/*` 充当可热修运行时依赖、epp 与 cube-utils 双轨并存

**库型 Platform**：
以独立发版/热修为目的的基础设施类 **Platform**（如 http 客户端、日期、日志、静态资源 URL 解析）；与产品型 Platform（chrome/auth 等）共用 Profile 声明与 `ensurePlatform` / `loadPlatform` 装载模型——会话内幂等，已装则不重复加载。域与壳消费其能力时经装载入口取得模块，不得 workspace 静态打进产物。门面因始终会启动，可对硬依赖的库型 Platform 做启动序内的 **URL 动态预装**（读已解析 Profile / 注册表 entry，非 `workspace:*` 编译期打包）；预装完成后计入同一「已装」集合，供全域复用，不再重复加载。逻辑名与 MF `name` 取合法 JS 标识符 camelCase，库型惯用能力 + `Platform` 后缀（如 `httpPlatform`、`datePlatform`、`loggerPlatform`、`resourcePlatform`）；npm 包仍为 `@g2-platform/<kebab>`，与逻辑名分两套。
_Avoid_: 另开一套「shared remote」通道、把库型能力做成 MF shared singleton 冒充发版边界、与产品型 Platform 分裂成两套装载状态机、壳对库型 Platform 保留 workspace 静态依赖冒充「例外」、`platformHTTP` 一类角色前缀或非法 MF 标识符（kebab / `@scope/…`）

**热修**：
指 **热部署**：更换版本注册表指针并发布新的 remote/壳产物后，用户下次加载（含整页刷新）拿到新实现；不要求也不追求「替换后不刷新即在当前文档生效」的生产 HMR。
_Avoid_: 把热修当成无刷新热替换、用 HMR/HMR 体验定义发版边界是否成立

**@g2-shared（已退役）**：
曾把三方库薄封装成 workspace 静态包的过渡 scope；物理包已删除，`check:deps-graph` 禁止再引用。同等运行时能力走 `@g2-platform/*` 库型 Platform（`loadPlatform` / Profile）。不是 MF singleton 热修通道。
_Avoid_: 复活 `@g2-shared`、shared remote、把 shared 与 Platform 当可互换同义词

**Platform 启动必装集**：
门面在某一启动阶段必须完成装载的 Platform 子集；成员只含该阶段的硬依赖与产品认定的必要壳能力，不因「写在 Composition Profile 里」就启动即装。Profile 仍可声明全集；未进当前必装集的成员按需再装。当前约定：未登录（`/login` / `/verify-auth`）为 `pcAuth` + `httpPlatform`；切换到已登录必装集的信号是**已有 token**（不是裸看路由名）——冷启动有 token、或登录成功补装时，再加上 `pcChrome`、`pcMessaging`、`pcRtc`。`pcAiAssistant` 为交互按需：主壳先提供顶栏占位入口（Shell 经 chrome 总线注册，同 id 可被真 Platform 替换），**首次点击**后再装该 Platform。另有**延迟预加载**：登录成功（或冷启动已有 token）后非阻塞、可配置地提前 `ensure` 某些按需 Platform；本阶段预加载名单为空，只留机制。骨架期夹具 `pcStub` 不是产品能力：与同批从组装/发版清单移除并删除物理包 `apps/platforms/pc-stub`。决议见 ADR-0053。
_Avoid_: 把 Profile 的 platform 列表等同于启动即装全集、用「离开登录路由」代替「有 token」作为主壳必装信号、把按需能力塞进必装集或做成阻塞预装、把已废夹具 pcStub 留在仓库里装死代码

**Platform 延迟预加载**：
在已登录必装集完成之后，按配置在一段时间后非阻塞地 `ensure` 指定 Platform 的机制；不参与启动关键路径，失败不得阻断主壳。与「启动必装集」和「首次交互再装」并列：必装阻塞到可用，预加载只抢跑，交互仍可触发尚未预加载完的 ensure（须幂等）。装载策略（必装名单、预加载 delay/names、交互 ensure）由门面持有；Composition Profile 只声明可组装成员，不描述何时装。当前预加载名单为空，配置落在 Shell 常量。
_Avoid_: 把预加载当成第二套必装集、预加载失败打断登录/进主壳、与点击 ensure 各走互不协调的两套装载状态、把装载时机写进 Composition Profile

**ensureClient**：
门面/消费者对单个服务 Client 逻辑名的幂等装载入口（对齐 ensurePlatform 的「未装则加载、已装则复用」）；实现落在 `@g2-composition/loader`，与 Platform/Domain 装载同层，不进 Shell 私有实现。Profile 槽位键为 `client`（与 `platform` 平行）。装载时机默认**按需**：Profile 只声明可装成员，由**第一个消费者**（如产品型 Platform / Domain 的 install）调用 ensure；壳不把服务 Client 默认打进 Platform 必装集（多消费者冷启动硬依赖面可再升为壳预装例外）。对 Platform 暴露方式：写入 **`PlatformContext.ensureClient`**（壳注入，与 `loadPlatform` 对称），不靠 install `config` 塞闭包、不靠 `window`/模块全局旁路。返回值：**`Promise<T>` / `ensureClient<T>(name)`**（就绪业务 API 单例；loader 缓存）；`T` 来自对应 `@g2-contract/<surface>` 的门面类型（Y1+Y4），不是 `void`。**Domain 通道后置**：今日 `DomainInstall` 无 ctx；Domain 消费服务 Client 等 DomainContext（或等价注入）专题，不堵 message 试点。
_Avoid_: 在各 Domain 内各自 `import()` 旁路装载状态、把服务 Client 经 ensurePlatform 装进 `platform` 槽位、仅为单一消费者就把 Client 写进壳必装集与 Platform 名单缠死、把 `ensureClient` 当成创建 HttpClient 的工厂、只把 ensureClient 留在壳私有 composition 句柄而让 Platform 无法按需装 Client、ensure 后再强迫调用方走第二套 get/load 才能拿到 API、从 `@g2-client/*` 拉类型当 UI 的类型源、用壳全局/loader 包静态单例让 Domain 绕过 ctx 注入（D3/D3′）抢跑 Domain 契约设计

**ensurePlatform**：
门面对单个 Platform 逻辑名的幂等装载入口：未装则加载并 `install`，已装则立刻完成。启动必装集、交互按需、延迟预加载都必须经此（或经对其子集调用的批量包装），不得旁路出第二套装载状态。批量装载按 Composition Profile 书写顺序处理子集；Shell 不维护 Platform 依赖图，库型依赖由 Platform 经 `ctx.loadPlatform` 自拉；必装名单仍显式包含如 `httpPlatform` 等硬依赖成员。独占型 slots 冲突在「已装 ∪ 本批将装」上检测，冲突即失败（ADR-0034），不做后装覆盖；列表型顶栏 action 的占位→真入口同 id 替换是贡献点升级，不适用独占 slot 覆盖语义。登出不做「同会话复用已装 Platform」：在尚无完整 `uninstall` 契约前，门面执行登出时清持久化鉴权 → 发布 `auth:session-ended`（best-effort，不等待）→ `location.assign('/login')` 整页进入登录态，靠新文档清堆；`auth:logout-requested` 仍只表示「请求登出」。本批不引入 Platform `uninstall`。
_Avoid_: 为预加载/点击/启动各维护独立的「已装」集合、未 ensure 就假设 slot/总线副作用已就绪、在 Shell 再维护一份与 Profile 重复的依赖拓扑、用运行时后装覆盖独占 slot 冒充客制替换或热更新、登出后仅 `push('/login')` 复用已 ensure 的 Platform、把半套 uninstall 当成已解决 OOM

**Composition Profile**：
描述某套餐/环境下门面如何组装 platform、inline 域与 remote 域的清单；切流与回滚以 Profile 为单位。人写源为 YAML，落在 `deploy/compositions/`（部署资产侧，非 `apps/`），经 composition schema 校验，只圈选参与组装的范围与逻辑名，不直接写具体 entry 版本/地址——具体地址由版本注册表在部署时解析（见「已解析 Profile」）。
_Avoid_: 注册表（bimops/admin 硬编码；也不要与「版本注册表」混用，Profile 本身不是注册表）、套餐配置（若未指组装清单）、把 Profile 目录当成可部署 `apps` 包

**版本注册表（Manifest Registry）**：
按「环境 + 逻辑名」存放当前应解析到的具体 remote 版本/地址的**生成数据**（含相对发版 object key，以及 `backendApi`、`staticResourceBase`、`webReleaseBase`、`pcShell` 等地址类逻辑名）。由本仓发布 CLI 根据 Composition Profile、发版选集、地址模版与构建身份等输入一键生成；**本应用仓不规定也不关心其归档/分发形态**（工作区文件、CD 产物、对象存储、文件系统等均可，由后续流程扩展）。发新版本、回滚、系统级客制覆盖＝更换该数据中的指向并再解析出已解析 Profile。禁止在业务代码写死 CDN 域名；真实地址与带 hash 的指针均不应作为本仓须提交的源码真相。
_Avoid_: 服务发现、动态配置中心（若暗示运行时可绕开生成流水线随意改）、在业务代码里写死 CDN 域名、把每次生成的带 hash 注册表当作本仓必提交源文件、用一份注册表同时假装开发绝对 URL 与发版相对 key

**prod 注册表**：
面向发版形态的版本注册表实例：MF / `pcShell` 为**相对发版 object key**，`webReleaseBase` 等由地址模版与环境绑定在生成时填入，resolve 时拼成绝对 `entry`（壳 key 供生成壳反代片段）。全量环境名即 `prod`（由原 demo 升格）。属发布 CLI 生成物，默认写入仓根可统一忽略的 `.deploy-out/<set>/`（可用 `--out-dir` 改到任意路径）；不是本仓 git 权威。
_Avoid_: 在入库源码里写死生产真实 CDN/API、把 demo 当作与 prod 平行的第二正式环境、把本机验收生成的注册表 diff 默认当成必须合并的源码变更、继续把 `deploy/compositions/registry/prod.registry.yaml` 当作可提交的指针源文件、把生成物散落在 `deploy/compositions/` 源树或 `deploy/nginx/generated` 等当作默认

**dev 注册表**：
仅供本地 Vite 多端口联调的注册表：platform/remote 可继续写 **绝对 localhost URL**（如 `http://localhost:5010/mf-manifest.json`），不强制相对 key / `webReleaseBase` 发版形态。与 prod 生成注册表分立，不进入发版选集默认路径；可继续留在 `deploy/compositions/registry/dev.registry.yaml` 作为联调源。CI 在跑 `generate` 验 prod 路径之外，仍可用 dev 注册表做绝对 URL resolve 门禁。
_Avoid_: 把 dev 注册表当生产发布源、要求日常改 platform 必须先 upload MinIO、用 dev 注册表冒充 prod 生成物

**地址模版（Registry Address Template）**：
本仓入库的地址类逻辑名模版，YAML 为**空值 map**（键＝逻辑名，值必须为空/省略；禁止入库非空真实值），便于复制后按同名环境变量直接灌值。发布 CLI 按键名读同名环境变量写入生成的版本注册表（`--env KEY=VALUE` / `--env-file`）。**变量未设置则失败**；**变量存在但为空串则写入空串**（`backendApi` / `staticResourceBase` 等同源默认，见 ADR-0048）。权威路径在部署资产侧（如 `deploy/address-templates/prod.yaml`），由发版选集引用；不放在 `deploy/compositions/registry/`。MF/壳相对发版 object key 由生成器按选集与当前 `HEAD` version 填写，不进模版。旧的可提交 prod 指针注册表退役。
_Avoid_: 在地址模版里写非空真实 URL 或 `${…}` 占位、在模版里维护 object key 版本段、继续把 `deploy/compositions/registry/*.registry.yaml` 当作 prod 地址/指针权威、把「未设置变量」与「空串」混为同一错误、用纯 `keys:` 列表形态导致复制后无法当 map 直接用

**发版输出目录（deploy-out）**：
发布 CLI 一次生成的配置根目录；默认 `.deploy-out/<set>/`，可用 `--out-dir` 覆盖。目录内扁平约定文件名：`registry.yaml`（版本注册表）、`resolved.json`（已解析 Profile）、`shell-location.conf`（壳反代片段）。整棵 `.deploy-out/` 为生成物，gitignore。
_Avoid_: 把 deploy-out 当源码、在默认输出里沿用 `deploy/compositions/.resolved` / `deploy/nginx/generated` 双轨路径、为 set 再叠一层冗长文件名前缀

**发版 CDN 前缀（webReleaseBase）**：
版本注册表中的地址类逻辑名，表示发版 CDN 的公开前缀（生产如 `https://c.kaiheai.com`；本地 compose 为独立 CDN 边车，默认 `http://localhost:8081`，对象在 URL 根路径）；与 `staticResourceBase` 对称，**不是**主站同域路径。其值由地址模版列出后从同名环境变量读入生成注册表。resolve 时把各 **发版 object key**（platform/remote 的相对 key）拼成已解析 Profile 里的绝对 `entry`；`pcShell` 相对 key 供主站反代壳，不进入已解析 Profile 的 platform/remote 列表。门面运行时只读已解析绝对 `entry`，不再读此前缀。
_Avoid_: 把 webReleaseBase 挂到主站 `/release/`、与 staticResourceBase 混用、在 Shell 里再做一层发版 URL 改写、把 S3 API endpoint 当作 webReleaseBase

**已解析 Profile（Resolved Profile）**：
由源 Composition Profile（逻辑名范围声明）经版本注册表解析后生成的部署产物，包含所有 platform/remote 条目的具体绝对 `entry` 等；门面运行时只消费已解析结果，不再查版本注册表。可追溯性来自生成时的构建身份与当时注册表内容；回滚＝改用指向旧发版 object key 的注册表（或等价输入）再生成并发布一份已解析 Profile。部署上由**主站**提供，不进发版 CDN 桶；门面启动时**运行时 fetch** 主站约定路径——按发版选集名为 `/compositions/{set}.resolved.json`（全量即 `/compositions/prod.resolved.json`），**禁止**再构建期内嵌进壳 `dist`。
_Avoid_: 与「源 Profile」混用、把它当成发版 CDN 上的对象、把已解析 Profile 用 `import …?raw` 打进门面产物、用与选集无关的魔法单文件名当唯一入口

**发版产物（Web Release Artifact）**：
门面 SPA、Platform、远程域构建出的、上传到**发版 CDN** 的静态产物（门面为 `index.html` 与资产；Platform/域为 `remoteEntry.js`、`mf-manifest.json` 与 chunk 等）；不含已解析 Profile，也不含业务静态资源（`/resource/*`）。
_Avoid_: 资源包（若指业务静态资源或整仓离线包）、把已解析 Profile 或 `/resource/*` 算进发版产物、以为门面留在主站不进发版 CDN

**发版 CDN**：
承载全部发版产物（含门面 SPA）的对象存储与对外域名（如 `c.kaiheai.com`）；公开前缀由版本注册表逻辑名 `webReleaseBase` 配置。与**静态资源 CDN**（如 `r.kaiheai.com`，由 `staticResourceBase` 配置）分立。对象读写走 **S3 兼容 API**（本地 MinIO、生产七牛 Kodo S3 网关同一套客户端，只换 endpoint/region/bucket/凭证）；桶名默认 `g2-web-release`。非必要不引入七牛原生 Kodo 协议或其它私有上传协议。
_Avoid_: 与静态资源 CDN 混桶、把「发布 CDN」当成上传业务 `/resource/*`、以为只有 remote 进 CDN而门面例外、无必要上双驱动/私有协议

**发版存储（S3）**：
发版产物上传所用的 S3 兼容对象存储接入；驱动只有一套，MinIO 与七牛 S3 网关靠配置切换。本地 MinIO 钉死 `RELEASE.2022-07-17T15-43-14Z`（多架构含 arm64；其后社区版能力不足，不用更新标签）。S3 API endpoint 仅供发布工具写入/列举，**不是**浏览器使用的 `webReleaseBase`。
_Avoid_: 把 S3 endpoint 写进已解析 Profile 当公开读地址、为七牛单独维护一套上传实现（除非 S3 兼容无法覆盖的必要能力）、MinIO 跟 latest 或更新社区版、本地 arm64 强上仅 amd64 的 `.fips` 标签

**发版（release publish）**：
发布 CLI 以 **`generate`** 为主命令：按发版选集一键生成版本注册表、已解析 Profile、壳反代片段到 `--out-dir`（默认 `.deploy-out/<set>/`）；**构建（build）可开关**。地址类字段由**地址模版**声明的逻辑名从**同名环境变量**取值（`--env KEY=VALUE` / `-e` / 可选 `--env-file`；无 `${…}` 模版插值）。**`upload`** 负责把发版产物分发到 CDN/文件系统等，与生成解耦、可后扩；可选便利命令 **`publish`**＝`generate` + `upload`。不再把改写本仓源注册表的 `point` 当作对外流程。生成结果**不**自动 git commit。实现落在 `@g2-tooling/release`（根脚本 `release:generate` 等）。本地 compose 验收用 `web-release:*`：`web-release:rebuild`＝`generate`（默认含 build）+ `upload`（本机 MinIO）+ gateway `reload`，挂载 `.deploy-out/<set>/`；**不是**另一套发版语义。CI 对 prod 路径跑 `generate --skip-build`（为地址模版所列逻辑名提供同名占位 env）校验生成的 `registry.yaml` / `resolved.json`，并可另保留 dev 注册表 resolve。`deploy/` 放发版选集、compose、nginx 模版/stub、地址模版等。与业务静态资源同步、Nexus npm publish 不是同一条管线。
_Avoid_: 与 descriptor「发布 (publish)」混用（那是其它仓的草稿冻结语义）、以为发版包含把包打进 Nexus、发布工具默认代为 commit 注册表、把「配置生成」与「上传分发」绑死成不可拆步骤、把 build 做成不可关闭的隐式前提、用非标准的 `逻辑名:环境变量名` 冒充 `--env` 主语法、把生成物默认写回 `deploy/compositions/` 源码树、继续把 `point` 当成人审改本仓 registry 的主路径、CI 仍依赖已退役的入库 prod 指针注册表、把上传逻辑塞进根 scripts 或 compose 镜像业务代码、把 `web-release:*` 和 `release:*` 混称「dev」

**发版选集（Release Set）**：
按部署形态拆分的、一次发版要上传哪些发版产物（逻辑名 ↔ 包）的清单；类比 cube2 `packages/deploy/server-one/{name}/` 用 `SERVERS` 列表声明聚合单元，但前端不叫 server-one/ServOne。权威是独立选集文件（如 `deploy/release-sets/prod.yaml`），内含 `profile`、**地址模版**路径（如 `deploy/address-templates/prod.yaml`）与 `members`（`logicalName` ↔ `package`），不由 Composition Profile 派生——Profile 管运行时装载范围，选集管本次构建/生成（及后续上传）范围；不再把「已生成的版本注册表路径」当作选集的源输入。当前默认且唯一拆分名为 **`prod`（全量）**；原 `demo` Composition / 注册表正式升格为 `prod`（`env: prod`），不再保留平行的 demo 环境名。已解析 Profile 的主站 URL 为 `/compositions/{set}.resolved.json`。后续可按形态增删拆分，并由 CLI 管理。
_Avoid_: server-one / ServOne / ksop（后端或已废工具名）、把发版选集等同于源 Composition Profile、继续把全量环境叫 demo、假定永远只有隐式选集、在选集里把 gitignore 的生成注册表当作权威输入

**主站**：
与发版 CDN 配合的入口部署面（nginx）：托管已解析 Profile（`/compositions/{set}.resolved.json`）；按发布工具生成的 **壳反代片段**（由注册表 `pcShell` 相对 key 派生，含 SPA fallback 到该版本 `index.html`）把门面入口与壳资产反代到对象存储中的壳前缀；并把 `/api` 等后端接口代理到上游。浏览器地址栏保持主站域名；platform/remote 的 `entry` 指向**独立发版 CDN 域**（跨源加载）。不把门面 `dist` 当作主站本地静态根的权威来源，也不在主站再挂一层 `/release/` 冒充 CDN。本阶段不考虑 CDN 回源。本地 docker compose：MinIO + **gateway（主站）** + **cdn（轻量 nginx 边车，模拟 `c.kaiheai.com`）**；默认把生成目录 `.deploy-out/<set>/` 挂进主站以提供已解析 Profile 与壳反代片段，`publish`/生成后 reload 主站 nginx 使壳指针生效。
_Avoid_: 把主站当成门面产物的权威托管、把主站等同于发版 CDN、用主站 `/release/` 充当 webReleaseBase、假设必须回源、用 302 把用户赶到 CDN 源站域名、让壳在 CDN 源站域名直出导致 `/api` 跨站、手改壳反代片段当作权威（权威在版本注册表）、本地验收再默认挂载 `deploy/compositions/.resolved` 或 `deploy/nginx/generated` 作为生成物来源

**壳反代片段**：
由发版工具根据版本注册表中 `pcShell` 的相对 key 生成的 nginx 配置片段（部署派生文件，与已解析 Profile、版本注册表同批写入 `.deploy-out/<set>/`）；主站 reload 后按该片段反代当前壳版本，并对前端路由回退到对应 `index.html`。
_Avoid_: 把它当成与注册表并列的第二权威、桶内可变 current、运行时动态读 JSON 指针（本阶段用生成 conf，不用 openresty）

**发版 object key**：
发版产物在发版 CDN 桶内的路径，亦是版本注册表里 MF/壳条目的相对值。形态为 `{logicalName}/{version}/…`，其中 `version`＝`YYYYMMDD.<gitShortSha>`，**生成时始终取当前 git `HEAD`**（如 `pcAuth/20260722.b32db5b/mf-manifest.json`）。一次发版上传该逻辑名对应包的**完整 `dist/`** 到该前缀下；目录不可变，同 commit 重传须幂等。注册表指针只记入口文件：门面壳 `pcShell` → `…/index.html`；platform/remote → `…/mf-manifest.json`。回滚＝回到目标提交再生成/构建，或直接用此前已发布的配置存档替换；不在本仓用可变 `current` 当权威。
_Avoid_: 可变 `current` 当权威、按 git sha 整铺一层当唯一布局、壳与 remote 两套路径约定、把 package.json semver 当发版身份、壳指针写成 mf-manifest、以为壳只上传 index.html 不传资产、为本仓 CLI 再维护一套与 HEAD 并行的 version 覆盖参数（除非后续证明确有必要）

**workspace 包版本（非 Nexus 制品）**：
不进 Nexus 私仓、仅仓库内 `workspace:*` 或经发版 CDN 交付的包，`package.json` 固定 `version: "0.0.0"` 且 `private: true`；发版身份以发版 object key / 版本注册表为准，不靠 npm semver。仅当某包必须发布到 Nexus（真 npm 消费方）时才 bump semver 并解除 private。
_Avoid_: 为 web 热修去 bump 各 MF 包 semver、把 private 包发进 Nexus、用 package.json version 当 CDN 路径 version

**静态资源 CDN**：
承载业务静态资源（`/resource/*` 改写目标）的 CDN（如 `r.kaiheai.com`）；前缀由版本注册表逻辑名 `staticResourceBase` 配置；与发版 CDN 不是同一条发布管线。
_Avoid_: 发版 CDN、把 MF remote 产物放进静态资源 CDN

**内联域（inline）**：
与门面同构建产物纳入的域，适合标品同发同回；运行时来源默认固定为随门面打包的版本，可选开启内联覆盖，但这不改变其内联属性。骨架期含长期夹具域（如 poc-inline-pc），仅用于证明装载，不是业务域。
_Avoid_: 本地域、内置微应用

**内联覆盖（Inline Override）**：
内联域按需声明的运行时来源切换通道（Composition Profile 里的 `allowOverride`，默认关闭）；开启后，Profile 里同名的 remote 条目可作为该域的运行时来源，其 `basePath` 必须与该内联条目一致。门面始终先渐进渲染内置版本，定时轮询 override remote 的 `mf-manifest.json` 版本号，发现新版本只提示用户刷新，不做运行时组件热替换。关闭覆盖走 Composition Profile 重新发布，复用既有回滚机制，不引入独立于 Profile 的运行时开关服务。
_Avoid_: 客制替换（客制替换是 Platform 侧不同 package/entry 绑定同一 slot，服务特定租户，见 ADR-0034；内联覆盖是 Domain 侧同名 inline/remote 之间的运行时来源切换，服务同一个域的热修需求，二者机制与目的都不同）、热更新/热替换（本机制不做组件级热替换，只做提示刷新）

**远程域（remote）**：
独立构建与发版、运行时由门面加载的域，适合热修与客制插件。骨架期含长期夹具域（如 poc-remote-pc）。
_Avoid_: 外挂、CDN 应用（若未指 MF remote）

## Flagged ambiguities

**「宿主」**：旧仓至少有 bimops（PC 门户）与 admin（管理端）两类 qiankun 门面；另有大量独立应用。新仓说「门面」并点名（如 cube-pc-shell / cube-h5-shell / 未来 admin 壳）。

**「mf-root」**：旧仓中的实验/库形态产物，不是现网 PC 门户，也不是新仓 PC 门面的演进基线。

**「共用」**：旧仓存在 copy、Lib、以及 epp 与 cube-utils 等并存；`cube-services`（interfaces/client/gateway）是末期全局共用方向但未全量实施。新仓不得复制「多套基础库并存」；运行时横切基建收敛为 **库型 Platform**（Profile + 幂等装载）；**服务 Client** 按服务面拆包复用（对齐旧仓 client 分层，不跟 UI 搅在一起），三方依赖声明另走治理白名单；不以 `@g2-shared` 静态包充当长期共用层。

**「H5」**：旧仓并非单一 H5 壳，而是多独立 H5 + WebView/Bridge 模式，另有统一入口跳转表尝试。新仓目标是 H5 门面 + Profile，Bridge 进壳或平台。

**「租户」**：本仓库部署目标既有 SaaS（一套运行时实例服务多个客户）也有私有化部署（每个客户独立一套部署实例）。「租户」严格意义上只描述 SaaS 场景下共享运行时里的单个客户；私有化部署的客户不是「租户」，它天然通过独立部署实例隔离，不需要运行时区分。讨论客制覆盖粒度时先确认是哪种部署形态，避免把两者混说成「租户」。

**「pc-rtc 与报警弹窗」**：ADR-0027 / 0029 初版曾把 RTC 与报警弹窗打进同一 Platform，依据是发版打包而非领域归属。**已由 ADR-0062 纠正**：弹窗 → `@g2-platform/pc-alarm-popup`；`pc-rtc` 只保留融合通讯。

## Example dialogue

Dev: 报警弹窗是不是就是报警记录里那个处理弹窗？  
Expert: 不是。租户实时报警弹窗 / 总部报警弹窗是消息推来的顶层叠加层；处理/指派/挂起是报警记录页内操作。  
Dev: 那弹窗是不是跟 RTC 一个 Platform？  
Expert: 不是。RTC 是融合通讯；报警弹窗是报警扩展 Platform，听总线事件触发，不进 pc-rtc。  
Dev: 消息是弹窗自己去拉 socket 吗？  
Expert: 不是。pc-messaging 入站归一后发 bus；弹窗 Platform 只订阅事件再展示。  
Dev: 租户和总部弹窗是不是同一套 UI 壳？  
Expert: 领域上都是实时报警弹窗，但承载不同：租户用本仓 TSX 叠加；总部暂时仍走跨市场 iframe，两种都要交付。  
Dev: 总部是不是先做个占位就行？  
Expert: 不行。本迭代要 1:1 复刻 market-config + 远端 iframe + postMessage；凭证进 URL 的旧债另开项。  
Dev: 弹窗点详情还能拼 /portal/... path 吗？  
Expert: 目标态不行。只发 navigate-intent 的 code + entry（如 alarmDetail）；壳解析不到已索引 MF 域就失败/提示，不靠旧 portal path 兜底。  
Dev: 那是不是把消防等码都写进门禁 navigateCodes？  
Expert: 不要混。菜单归属码只管侧栏接管；Intent 可跳码另表，详情可以宽、菜单剥离保持窄。  
Dev: 本迭代 intent 表要多宽？  
Expert: 只能指向「Domain 应用码与推送 code 一致」的宿主；未迁消防不要借门禁详情装可用。验收集不等于把 FIRECONTROL 改道进门禁。  
Dev: 消防弹窗还能出吗？  
Expert: 实时弹窗可以出（全局 Platform）；点详情若无匹配 Domain 就中断/提示，不装假详情。  
Dev: Intent 表还要不要写 FIRECONTROL→门禁？  
Expert: 不要。只能写与 Domain 应用码匹配的项；8/9 已按匹配原则修订。  
Dev: 租户弹窗本迭代要做多深？  
Expert: 全量旧仓特例也要：媒体/属性、定位、藏详情条件、特殊快照类型等与主路径同迭代，不先做薄壳。  
Dev: 定位是不是 PC 门面也要真飞到地图？  
Expert: 弹窗内分支与按钮协议要齐；定位只发 bus，3D/地图有消费者再接。PC 无消费者时可配置不展示按钮。  
Dev: 总部弹窗的市场配置 API 塞进 alarm-center 吗？  
Expert: 不。单独 `@g2-client/headquarters-market`；方法可叫 getMarketConfig，HTTP 仍可打旧 dataintegrate 路径。  
Dev: 弹窗 Platform 还叫 alarm-modal 吗？  
Expert: 不。叫 `@g2-platform/pc-alarm-popup`，避免和记录页 Modal 混。  
Dev: 这些决策写哪？  
Expert: ADR-0062 钉包装与匹配规则；修订 0029；实现按 `docs/superpowers/plans/2026-08-04-pc-alarm-popup.md`。  
Dev: 旧仓是不是只有 bimops 一个壳？  
Expert: 不是。PC 门户是 bimops，管理端还有 admin；另外还有 UE5、指挥调度等独立应用，以及 WebView 里的 H5。  
Dev: 客制是不是只能当微应用迁？  
Expert: 客制是增量形态，可能是微应用或独立应用；新仓用 remote + Profile 接，不靠长期分叉。  
Dev: H5 共用是不是继续 copy？  
Expert: 旧仓有 copy 也有 Lib；新仓应把 Bridge/鉴权收到门面或 Platform，业务进域，禁止再靠复制摊共用。  
Dev: cube-utils 和 epp 哪个算平台？  
Expert: 旧仓没统一好；新仓重新收敛，不把双轨并存搬进来。  
Dev: 骨架阶段要不要 PC 和 H5 一起证明双通道？  
Expert: 骨架只做 PC 三件套；H5 整段后置。  
Dev: 迁完域是不是马上按租户切流？  
Expert: 主规划是与旧站双轨平行；切流单位与导流机制不在主规划钉死，必要时装专项。兼容应用也走专项，不硬塞标准迁域。  
Dev: 发版是不是要把壳打进 Nexus？  
Expert: 不用。web 制品走发版 CDN，package.json 保持 0.0.0 + private；身份是 YYYYMMDD.sha 的发版 object key。  
Dev: 七牛要不要单独写一套上传？  
Expert: 非必要不上私有协议；MinIO 和七牛都走 S3 兼容，只换配置。  
Dev: 前端发版是不是也叫 server-one？  
Expert: 不叫。cube2 的 `packages/deploy/server-one/{name}` 是后端按形态聚合多服务；前端对等物是发版选集（当前默认拆分名 `prod`），圈定上传哪些壳/platform/remote，再改注册表并 resolve。  
Dev: 发版选集是不是从 Composition Profile 推出来的？  
Expert: 不是。Profile 管装载；选集管上传。两者应对齐，但是两份权威，按形态拆分维护。  
Dev: 本地 demo 和正式 prod 是两套吗？  
Expert: 不是。demo 升格为 prod，代表全量；发版选集默认只有 `prod` 这一个拆分。  
Dev: 本地怎么验发版？  
Expert: compose 起 MinIO + gateway 主站 + cdn 边车；`webReleaseBase` 指向 CDN 端口/域；浏览器地址栏打主站，remote 跨源打 CDN。  
Dev: 壳是不是只传一个 index.html？  
Expert: 指针是 index.html，上传仍是整个 dist；和 remote 指针是 mf-manifest、同前缀传齐 chunk 一样。  
Dev: 已解析 Profile 是不是打进壳包？  
Expert: 不是。主站托管，壳启动时 fetch；改注册表指针后 resolve 换文件即可，不必重传 pcShell。  
Dev: generate 完要不要把 `.deploy-out` 提交进本仓？  
Expert: 不要。生成物可忽略；归档/分发由仓外流程扩展。  
Dev: 壳从哪个 URL 拉已解析 Profile？  
Expert: `/compositions/prod.resolved.json`（按发版选集名）；本地主站挂载 `.deploy-out/<set>/resolved.json`。  
Dev: nginx 怎么知道反代哪版壳？  
Expert: generate 根据生成注册表里的 pcShell 写出壳反代片段并 reload；权威是该次生成的注册表，conf 只是派生文件，记得做 SPA fallback。  
Dev: 本地 vite 开发和 compose 发版能共用一张注册表吗？  
Expert: 不建议。prod 用相对 key；另留 dev 注册表写 localhost 绝对 URL，日常联调不用先上传 MinIO。  
Dev: `dev:full` 和 `web-release:rebuild` 有啥区别？  
Expert: 两套栈。`dev:full` 开 `:5100` + 各 Vite remote（dev 注册表），改代码即时热更新；`web-release:rebuild` 走 MinIO/CDN + 主站 `:8080`（读 `.deploy-out` 生成物），必须 generate+upload 后才吃到新产物。日常联调用前者，验发版同构用后者。  
Dev: 为什么 compose 栈改了代码 rebuild 却像没更新？  
Expert: 版本目录是 `YYYYMMDD.<gitShortSha>`，跟的是 **HEAD**。没 commit 则 sha 不变、生成注册表里的指针字符串也常不变，看起来像没发；同前缀是幂等覆盖，要新目录就先 commit 再 rebuild，并硬刷新 `:8080`。  
Dev: 发版命令写在哪？
Expert: `@g2-tooling/release`（`generate` / `upload` / 可选 `publish`）；地址模版与 release-sets、compose 放 `deploy/`；生成物默认 `.deploy-out/`。
