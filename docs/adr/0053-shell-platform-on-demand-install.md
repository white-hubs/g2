# 门面按需装载 Platform：Profile 声明范围 ≠ 启动即装

Composition Profile 继续声明可组装的 Platform 全集，但 PC 门面不再在启动时对 `profile.platform` 无差别 `install` 并立刻拉 chrome slots。装载**时机**由 Shell 策略持有（必装集 / 幂等 `ensurePlatform` / 延迟预加载 / 交互按需），不写进 Composition Profile——Profile 只回答「有哪些成员」。目的：未登录 `/login` 少打 remote；已登录再装主壳必要能力；按需能力避免阻塞首屏。

**必装集与切换信号：** 未登录（`/login`、`/verify-auth`）只装硬依赖 `httpPlatform` + `pcAuth`。切换到已登录必装集以**已有 token**为准（不是裸看路由名）：再装 `pcChrome`、`pcMessaging`、`pcRtc`，并加载 chrome slots。批量装载按 Profile 书写顺序处理子集；Shell 不维护 Platform 依赖图，库型依赖仍由 Platform 经 `ctx.loadPlatform` 自拉，但必装名单须显式包含如 `httpPlatform` 等硬依赖成员。

**唯一装载原语：** `ensurePlatform(name)` 幂等（未装则 load + `install`，已装则立刻完成）。启动必装、交互按需、延迟预加载都经此（或对其子集的批量包装）。延迟预加载：已登录必装完成后非阻塞、可配置 delay/names；本阶段预加载名单为空，配置落 Shell 常量，失败不阻断主壳。

**AI 交互按需：** `pcAiAssistant` 不进必装集。Shell 在 chrome 已装后经 `chrome:register-top-bar-action` 挂占位入口；首次点击再 `ensurePlatform("pcAiAssistant")`。chrome 顶栏 action registry 对同 id 允许替换（占位→真入口）；此为列表型贡献点升级，不适用 ADR-0034 独占 slot 的「后装覆盖」。

**冲突与客制：** 独占型 slots 在「已装 ∪ 本批将装」上做 `detectStaticSlotConflicts`，冲突即失败（ADR-0034），不做运行时后装覆盖或 warn-继续。客制替换仍是 Profile 里只留替换版成员。

**登出：** 不做同会话复用已装 Platform（避免订阅/模块常驻的 OOM 隐患）。在尚无完整 `uninstall` 契约前：清持久化鉴权 → 发布 `auth:session-ended`（best-effort，不等待）→ `location.assign('/login')` 整页进入登录态。`auth:logout-requested` 仍只表示请求登出（ADR-0047）。本阶段不引入 Platform `uninstall`；半套卸载不能代替整页清堆。

**同批清理：** 骨架夹具 `pcStub` 不是产品能力——从组装/发版清单移除并删除物理包 `apps/platforms/pc-stub`，不再懒装留尸。

**明确不做（本决策范围）：** MF federation runtime CDN 去重（见 ADR-0054，另案落地）；无刷新强制热更新（不借 slot 覆盖或 ensure 冒充，域侧基线仍见 ADR-0042 提示刷新）；把装载时机写进 Composition Profile；登出仅 `push('/login')` 复用已 ensure 的 Platform。

## Considered Options

- **启动仍装 Profile 全集，只推迟 chrome slots：** 登录页仍会打齐 platform remoteEntry；否决，必装集必须 esp. 砍掉 messaging/rtc/ai/stub。
- **AI 主壳空闲预装 / 首次点击再装：** 空闲预装能早点出入口，但本批要求真·交互按需；选定占位 + 首次点击 ensure，预加载机制另留、名单暂空。
- **独占 slot 后装覆盖 + warn：** 与 ADR-0034「配错即失败、客制靠 Profile 只留替换版」冲突，且不能垫出无刷新热更；否决。列表型 action 同 id 替换单独允许。
- **登出同 SPA 复用已装 Platform / 先做完整 uninstall：** 复用易留总线订阅与模块常驻；完整 uninstall（disposer、registry、逆序、MF 堆）是独立切片。否决本批做卸载契约；选定 `auth:session-ended` + 整页 `assign('/login')`。
- **装载策略进 Composition Profile：** 与「Profile 管范围、门面管时机」边界混淆；否决，策略落 Shell 常量，日后若要按部署调预加载名单再议。

## Consequences

- `compose-from-profile` / `main.ts`：`runPlatformInstalls` 改为支持子集 + `ensurePlatform`；有 token 才装已登录必装集并拉 chrome slots；登录成功路径须补装后再进主壳。
- 顶栏 action registry 需支持同 id 替换；Shell 负责 AI 占位与点击 ensure。
- 登出路径从 `router.push('/login')` 改为 session-ended + `location.assign('/login')`。
- 删除 `pcStub` 后须改 Profile、注册表、发版选集、CI/dev-filter 与相关测试夹具。
