# 应用域自持路由与默认菜单；共享能力走页面库 remote；菜单 overlay 与跨域跳转均不带 path

旧仓「一应用菜单挂多个微应用 path」与「共享微应用独占 `/portal/genericEquipmentMonitor/*`」不能原样迁到 MF。本决定钉死：**对外可导航的组装单元仍是 Domain（应用域）**——它固定声明 `routes` 与默认 `menuContribution`，即使页面实现全部来自 remote 也必须作为正常应用组装；**共享业务页/组件是纯 exposes 页面库**，不拥有 URL、不持有 functionCode；**后端可选菜单 overlay 只按 code 改层级/别名/显隐，契约禁止 path**；**跨应用跳转只走 `navigate-intent`，目标态不再支持 path 载荷**。部分修正 ADR-0036（后端从「只下发扁平 functionCode」扩展为「扁平 codes + 可选无 path overlay」）与 ADR-0058（`path` 从「过渡/调试」收紧为迁移期兼容，新代码禁止）。

## 状态

Accepted

## 决策

1. **应用域拥有路由**  
   Profile 中每个可导航 Domain 的 `routes`（相对其 `basePath`）与默认 `menuContribution` 是开发态契约，**不**由后端下发路由表。叶子用稳定 **entry**（应用内路由主键，可与 path 段同形）关联到具体 route；菜单与跳转解析 `code/entry → 本域 path`，从不依赖后端 path 字符串。

2. **页面库（page library）remote**  
   跨应用复用的业务页/组件以 MF **纯 exposes** 交付（页面库），**不是**带独立 `basePath` / `menuContribution` 的导航 Domain。消费方应用域在自有 `routes` 里挂载这些页面，并注入差异化 `config`（含下行第 3 点）。页面库可单独发版热修；是否装入由消费方依赖与 Profile 决定。

3. **能力码表由应用域持有并注入**  
   functionCode（及按钮级 code）的权威映射表属于**应用域**：`pageKey | actionKey → functionCode`。挂载页面库组件时把该表（及 API/特性差异）传入；页面库只认稳定 **pageKey / actionKey**，用注入表做显隐匹配，**禁止**在库内硬编码宿主 code 或 sniff 宿主身份。表中缺键＝该应用未开放该能力。

4. **库内子页导航：只发 page 事件**  
   页面库不知道也不拼接 URL。库内「去详情 / 去配置」等只触发稳定载荷，例如 `{ page: pageKey, params? }`（经 props 回调、`DomainContext.bus` 或注入的 `navigatePage`）。应用域包装层把 `pageKey` 译成**本域** `router.push` 或（若目标在别的应用域）`navigate-intent`。需要进地址栏的状态（如详情 id）由**应用域路由**声明（如 `alarms/:id`），页面只收 props。

5. **跨应用跳转禁止 path 契约**  
   目标态载荷仅为 `{ code, params?: { appCode?, entry?, …业务参数 } }`。壳用索引把 `code` 解析到应用域 `basePath`，再按该域自己的 entry 表拼子路径。`NavigateIntentPayload.path` 仅迁移期兼容旧调用方，**新代码与页面库不得再发 path**；兼容层删除前不得作为公共契约写入文档或示例。

6. **菜单 overlay（可选，无 path）**  
   无覆盖配置时，直接使用应用域默认 `menuContribution`。若后端/配置下发 overlay，锚点为节点 **code**（与菜单叶子 functionCode / 稳定 menuCode 对齐），允许字段限于重组展示所需：如 `parentCode`、`order`、`alias`、`hidden`（具体字段名实现期定，本 ADR 钉语义）。**契约禁止** overlay 携带或修改 `path` / 组件绑定 / 跨域挂载目标。合并时不得因 overlay 新建「默认树不存在的可导航叶子」；未知 code 忽略或告警。登录平铺 `functionCodes` 仍只做 UX 过滤，不定义树结构。

7. **与「应用」旧词的关系**  
   旧仓 OUAA「应用分组→应用→菜单」整树下发模型仍不迁移。本 ADR 的「应用域」＝已有 Domain 组装单元（`appRegistryCode` + 自持 routes/菜单），不是复活后端应用实体。展示分组仍可用 Profile 元数据；权限与导航锚点仍是 functionCode / entry。

## 后果

- 旧共享微应用（如 `genericEquipmentMonitor`）迁入时优先做**页面库**，由各业务应用域自定挂载 path；不默认占用独立 `/d/generic-equipment-monitor` 作为多应用公共 URL（单域深链预览若需要可另开，不作为共享契约）。
- 壳侧须演进：intent 解析强化 `entry`；逐步去掉对 path 跳转的依赖；chrome 菜单合并支持 overlay。
- composition-contract / 文档须区分 Domain（导航）与页面库（非 DomainModule 导航契约）；页面库不强制实现 `DomainModule`。
- ADR-0036、ADR-0058 见文内「后续变更」指针；CONTEXT 词条同步「页面库 / pageKey / entry / 能力码表 / 菜单 overlay」。

## Considered Options

- **共享域独占 `/d/{shared}/…`，多应用 remap 深链**：否决为默认——与「路由由应用自己决定」冲突；地址栏丢失宿主应用语义。
- **页面库自带 vue-router 子树**：否决为公共契约——库不知宿主 basePath；子导航统一走 pageKey 事件。
- **后端继续下发完整菜单 path**：否决——路由所有权收回应用域；overlay 故意无 path。
- **共享页内硬编码 functionCode**：否决——多宿主 code 不同；改由应用域注入能力码表。
