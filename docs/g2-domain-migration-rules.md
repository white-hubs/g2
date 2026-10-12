# G2 领域应用迁移与代码规则

## 1. 目标与判定标准

Runtime Common 迁移是所有 production Domain / Page Library 新建与迁入的强制门槛，具体静态依赖禁令、加载顺序、失败策略、矩阵和产物验收见 [`Runtime Common 子应用迁移标准`](./runtime-common-migration-standard.md)。未通过该标准及自动检查，不得标记为已完成。

迁移的完成标准是：旧应用菜单、页面、交互、接口与权限在 G2 真实运行链路中可用且行为不退化。构建成功不是完成证据。

- 以旧仓页面、服务层、菜单配置为行为基线；先比对，再实现。
- 禁止只交付“可打开的简化页面”。旧页已有的筛选项、表格列、工具栏、树形结构、分页、操作、弹窗和消息规则都必须迁移或明确登记为产品确认的删减项。
- 页面问题必须在浏览器复现并回归验证；无法验证时不得宣称完成。

## 2. 迁移前必做盘点

1. 读取旧页面、旧 service、路由、菜单、权限控制和样式；记录接口的真实 URL、请求方法与参数名。
2. 读取新领域的 `package.json`、`domain.ts`、`domain-context.ts`、Client、路由和 Composition。
3. 制作页面对照清单：菜单顺序、页面标题、查询项、表格列、行操作、顶部工具栏、弹窗字段、分页、空状态与权限。
4. 使用 `rg` 检查待迁领域的 `compat/` 引用。领域代码不得新增 compat 中转层。

## 3. 微前端与按需启动规则

- Domain 与 Client 是独立正式发布单元：必须分别存在 manifest、端口、开发筛选映射和 Composition 声明。
- 新增领域后，同步核对：`deploy/compositions/prod.pc.yaml`、`deploy/compositions/registry/dev.registry.yaml`、`tooling/dev-filter` 与 Shell 的本地 Remote 映射。
- 仅启动 Shell + Domain 时，Client 可以走开发期 workspace fallback；这不允许进入 build、preview 或发布路径。
- legacy-compat 模式中，仅过滤当前本地启动 Domain 对应的旧 qiankun 注册名；禁止通过名称归一化猜测映射。
- 映射或 registry 变动后，已运行的 `bun dev:full` 不会自动拉起新 Remote，应提示开发者重启该命令，不得擅自停止用户进程。

### 3.1 `domain.ts` 隐藏路由与侧栏菜单高亮

编辑、详情、表单等不在侧栏展示的页面，跳转后左侧所属菜单必须仍保持高亮与展开；这是迁域默认交付项，不是可选 polish。

- 不进侧栏的路由必须同时声明：`meta.hideInMenu: true` 与非空 `meta.activeMenuPath`。
- `activeMenuPath` 必须等于本 Domain `menuContribution` 中已有菜单 `path`（通常是所属列表入口，例如 `` `${BASE}/inspect-task` ``），禁止指向另一个隐藏路由或不存在的 path。
- 示例：

```ts
{
  path: `${BASE}/inspect-task-info`,
  name: "inspect-task-info",
  meta: {
    title: "巡检任务详情",
    hideInMenu: true,
    activeMenuPath: `${BASE}/inspect-task`,
  },
  component: view("task-info"),
}
```

- 仓库契约 `assertDomainModule` 会校验：凡 `hideInMenu: true` 必须带有效 `activeMenuPath`，且该 path 出现在 `menuContribution` 中；迁域/新增详情路由时不得绕过或删掉该约束。
- 浏览器验收：从列表进入详情/编辑后，左侧所属菜单项仍高亮；直接深链打开隐藏路由时，也应落到正确应用分组并高亮所属菜单。

## 4. 公共组件使用规则

领域页面只能从 `@g2-platform/pc-ui` 使用 PC 组件；禁止直接引入 `ant-design-vue`、旧 `@ghcloud/cube-ui` 或复制 compat 包装。

| 场景      | 必须使用                                               | 关键规则                                                     |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 页面框架  | `PageLayout`                                           | 内容只放入命名插槽，不使用默认插槽承载页面主体。             |
| 查询区    | `usePcForm`                                            | Schema 声明筛选字段、placeholder、查询/重置行为和缓存策略。  |
| 列表表格  | `usePcTable`                                           | 指定 `rowKey`、`tableCode`、列宽/对齐、加载与选择状态。      |
| 分页      | `Page`                                                 | 放在 `footer-page`；显式声明 `cachePageQuery`。              |
| 确认操作  | `PopConfirm` / `Modal`                                 | 删除、批量删除等不可逆操作必须二次确认。                     |
| 表单/弹窗 | `Form`、`Modal`、`Textarea`、`DatePicker`、`Select` 等 | 文案、必填、字符数与旧页一致。                               |
| 上传/下载 | `Upload` + Client 方法                                 | 上传、模板下载和二维码下载必须有真实接口，不能只放静态按钮。 |

若公共组件缺少旧页必需能力，应先在 `pc-ui` 正式扩展（例如树表的 `childrenColumnName`），再由领域使用；不要在领域复制组件实现。

### 4.1 官方组件能力优先

- 公共组件对 Ant Design Vue 的能力以**透传真实契约**为先；不要为了调整一个页面的展示而重写组件的核心交互。
- 能通过 `childrenColumnName`、`rowKey`、`expandedRowKeys`、`onExpand`、`rowSelection`、`scroll` 等官方属性完成的，禁止另造展开按钮、手工拍平树、模拟选择状态或复制 Table 内部常量。
- 使用第三方组件的内部模块、私有常量、私有 class 或已废弃属性前，必须先查当前安装版本源码/类型和官方文档；不能跨模块导入内部常量再注入公共组件。
- 公共组件扩展必须有可复用的 props、中文注释和单元测试；领域页只声明业务数据字段与业务行为。不得把“某页面专用 CSS/DOM hack”伪装成公共能力。
- 先判定问题属于数据、调用方式、公共组件还是页面样式，再改代码；连续一次运行结果不符时，停止沿原方案继续叠加兼容层。

## 5. PageLayout 插槽与滚动规则

`PageLayout` 的默认插槽在 footer 之后渲染，因此禁止将业务主体写入默认插槽。

```tsx
const slots = {
  "layout-header": () => <HeaderActions />,
  "layout-content": () => (
    <>
      <PcForm />
      <PcTable />
    </>
  ),
  "footer-page": () => <Page /* ... */ />,
};

return () => <PageLayout title="页面标题" v-slots={slots} />;
```

- 列表页：查询区和表格在 `layout-content`，分页在 `footer-page`，使页脚固定、主体独立滚动。
- 编辑/详情页：表单或详情在 `layout-content`，保存/取消/返回在 `footer-page`。
- 无页脚页面必须显式 `showFooter={false}`。
- 禁止把分页或保存按钮放回主体滚动区来规避布局问题。

### 5.1 PageLayout / Shell 留白

- Shell `#main-content`（`.content`）必须使用四边 `padding: 16px` + 灰底 `#f5f7fa`，使白底 `PageLayout` 呈现为内嵌卡片；禁止让内容区白底顶满整块主区域。
- `PageLayout` 根节点 `#pc-layout-container` 使用**左右**留白：`padding: 0 16px`（`box-sizing: border-box`）。**禁止**给 `#pc-layout-container` / `#pc-layout-content` 加顶部（或四边）`padding: 16px`，避免标题/查询区与卡片顶边再空出一层。
- 全页路由（登录等 `fullPageContent`）必须重置为 `padding: 0`、透明背景，不得把业务页的 `#main-content` 16px 留白套到全屏页。
- 领域页面禁止用局部 CSS 清零上述公共留白来“贴边铺满”。

## 6. 查询表单与默认值规则

- Select、Cascader、TreeSelect、DatePicker 的“未选择”值必须是 `undefined` 或 `null`，不能是空字符串 `""`；空字符串会被组件视为已有值并隐藏 placeholder。
- 初始化值与“重置”值必须完全一致。
- placeholder 必须与旧页语义一致，例如“请选择风险源分类”“编码、名称、使用人、车牌号”，不能用泛化文本替代。
- 日期必须使用公共 `DatePicker`/`RangePicker`，不能用普通输入框模拟。
- 筛选条件较多时使用 `usePcForm` 的展开/收起能力，不得删除原有条件。
- 查询、重置、页码切换需要立即显示对应 loading，并防止过期响应覆盖新查询结果。

## 7. 表格与树形数据规则

- 列顺序、名称、默认显隐、宽度、对齐、ellipsis 和自定义渲染按旧页逐项对齐。
- 不要给旧页未指定宽度的列强制均分；保持表格的原有自动布局策略。
- 树表必须传递旧数据的真实子节点字段，例如 `childrenColumnName: "nextList"`，让 Ant Design Vue 原生树表格生成展开列；禁止在业务列里手工绘制“+/-”替代原生树逻辑。
- 当后端以空数组、`null` 或缺失字段表示叶子节点时，公共表格可在不改变原始数据的前提下生成渲染副本，移除叶子节点的空 children 字段；这样叶子没有展开控件，而非叶子保持原生展开行为。
- 若产品要求独立展开列、序号列不被挤占，先验证当前 Ant Design Vue 版本的原生展开列配置；不得从 `vc-table` 等内部子模块复制/注入展开列常量。展开列和序号列间的视觉边界只能由公共表格样式统一处理。
- 受控树展开时，`expandedRowKeys`、`onExpand` 与 `rowKey` 必须成套传递；序号按**同一父节点下的可见兄弟节点**从 1 重新计算，不能继承父节点序号或使用已拍平数组索引。
- 表格空值统一由公共表格显示 `--`，保留 `0`、`false` 等有效值；业务列自定义渲染同样遵循该规则。
- 序号按旧页规则计算；分页表格应包含跨页偏移。
- 删除按钮使用危险色（`danger`），并以 `PopConfirm` 二次确认；确认/取消文案必须中文。
- 权限字段必须控制行操作可见性，不能仅在前端样式上隐藏。

## 8. 工具栏、弹窗与本地化规则

- 顶部工具栏需完整保留旧页操作，例如新增、下载二维码、下载模板、导入、批量删除；不得只保留“新增”。
- 弹窗打开应先同步展示，再异步加载详情；加载期间保持可关闭，使用请求 token 忽略迟到响应。
- 所有用户可见的按钮、确认框、校验提示、placeholder 和分页文本使用中文。对 `Modal`、`PopConfirm` 显式传递 `okText="确定"`、`cancelText="取消"`，避免 portal/上下文导致英文回退。
- 弹窗字段、Textarea、最大字数、必填规则和标题对齐旧页，不能将多行备注降级为单行输入框。

### 8.1 编辑、详情与动态表单

- 编辑与详情必须逐字段对照旧页：字段标签、顺序、分组、每行列数、控件类型、只读态、附件、动态子表和底部按钮都属于迁移范围。
- 异步详情数据必须在 `render`/`computed` 阶段读取响应式状态。禁止在 `setup` 阶段根据初始空对象预先创建详情 VNode，否则接口成功后页面仍显示 `--`。
- 表单 Tabs 的 Tab 栏与内容区必须分层：Tab 栏不随内容滚动，只有内容区滚动；底部保存栏由 `PageLayout` footer 固定。不得用空 div 撑高页面或让 footer 跟随表格/表单滚动。
- 动态明细（如配件）按旧页保留每行字段数、日期控件、保存/删除动作和即时校验；新增一行后应立即可编辑，保存动作只影响当前行。
- 详情、编辑、删除和下载操作使用真实记录 ID 与旧接口字段。提交前用旧 service/Network 对照请求体，禁止把展示字段、临时 UI 字段、`undefined` 值或错误数组结构直接提交。

### 8.2 Loading 与错误状态

- 页面、详情、弹窗、Tab、查询、分页和保存均遵循“先可见响应、后异步请求”：先打开/切换界面并设置 loading，再发请求；`finally` 清理 loading。
- 列表和详情 loading 使用公共居中蒙层或组件内置 loading；禁止把“加载中...”作为正文文字插入页面。
- 同一保存、删除、导入操作必须防重复提交；可切换的 Tab/详情查询需用请求版本号忽略迟到响应。

## 9. Client 与接口规则

- 领域业务接口按旧 service 的真实路径迁移。旧服务为 `/api` 时仍使用 `/api`；只有已有公共契约声明的能力才使用 `/gw-bff`。
- Client 的方法名表达业务意图，不让 Domain 拼接 URL。
- URL、HTTP method、分页字段、表单字段、Blob 下载与 FormData 上传必须与旧 service 一致。
- 每类非平凡路径补 Client 测试，断言实际请求 URL 和查询参数。
- 消息配置等按场景读取的数据，必须使用旧接口的真实区分参数（如 `label`），不能根据新字段名猜测；每个 Tab 只渲染本场景返回的规则。

## 10. 消息配置规则

- 每个 Tab 对应一个确定的 `sceneCode`/`label`，独立加载、独立维护列表。
- 空数据时只创建该场景的一条默认规则；不得把其他场景或全量接口数据重复填入每个 Tab。
- 保留旧页的规则新增/删除、通知条件、通知方式、通知内容、通知对象和场景校验。
- 保存时统一转换为后端约定的 `sceneConfigDTOS`、`noticeWays`、`noticeObjs` 结构；不得直接提交 UI 临时字段。

## 11. 代码质量规则

- 修改最小化：不因一个迁移问题顺带格式化、重构无关页面或改变生产发布边界。
- 禁止 `any`、`@ts-ignore`、吞错、延时轮询作为迁移修复手段。
- 异步操作必须设置 loading，使用 `try/finally` 清理；保存、删除、导入等重复操作必须加锁。
- 注释使用中文，解释业务兼容原因，不重复字面代码。
- 领域代码必须通过 `rg -n 'compat/' apps/domains/<domain>`，无 compat 引入。

## 12. 表格滚动与布局专项规则

- 表格横向滚动条必须始终在**当前可视的表格 body 底边**，由 `AliasTable` / 表格 body 原生 `overflow`（`scroll.x`）承担。
- 优先由 `usePcTable`/`AliasTable` 根据**实际容器高度**设置 Table body 的 `scroll.y`（默认 `autoScrollY`），让纵横滚动都在表格内部完成。
- **禁止**恢复或新写旧 Cube 的外置底栏横向滚动方案，包括但不限于：
  - `PageLayout` 渲染 `#pc-table-scroll-container` / `#pc-table-scroll-content`
  - 用空白 `scrollCaptureArea`（或任意空 div）撑高内容区，把滚动条“顶”到分页上方
  - 在 `pc-ui` 中重新实现可工作的 `useTableXScroll` 同步逻辑
  - 为配合假底栏而用 CSS 隐藏表格 body 横向滚动条（导致双横条或纵条错位）
- `PageLayout` **已删除** `showTableXScroll`：组件不声明、不读取。历史调用若仍传入，attrs 会被剔除且不写入 DOM；领域与 page-library **应去掉该传参**，新页面禁止再传。不得为了“兼容旧调用”重新加回有效行为。
- 高度计算必须基于容器 `getBoundingClientRect`、可用高度和查询区真实尺寸；查询区展开/收起需用 `ResizeObserver` 重新测量，不能靠固定减法、空白占位 div 或任意延时猜测。
- 页面、表格 body、消息规则区、编辑内容区在同一方向只能有一个主滚动容器；出现双纵向滚动条时，先检查 DOM 层级、`overflow`、`flex/min-height` 和计算高度，而不是追加 `overflow: hidden`。
- PageLayout footer、页签栏、查询操作栏不属于表格 body，不能被表格内部滚动带走。表格内部滚动不够高时应重新计算可用高度，不得牺牲查询区或创建第二条滚动条。
- 表格横向滚动的公共实现修改后，至少回归：无纵向滚动、有纵向滚动、查询区展开、分页存在、固定 footer、列过宽出现横条六个场景；并确认**只有表格底边一条横条**、无底栏假条、无中间大块空白。

## 13. 迁移高频失误与禁止项

| 高频失误 | 正确做法 |
| --- | --- |
| 应用启动后路由不可访问 | 先核对 Domain/Client 的 logicalName、manifest、dev-filter、Shell 本地注册和当前开发模式；不要只启动 Domain 就假定 Client/菜单会自动可用。 |
| 进入详情后左侧菜单不高亮 | 隐藏路由补齐 `hideInMenu: true` + `activeMenuPath` 指向所属列表菜单 path；用 `assertDomainModule` 校验。 |
| 页面主体落进 footer 或 footer 跟随滚动 | 使用 `layout-content` 与 `footer-page` 命名插槽，检查实际滚动容器。 |
| 表格出现双横向滚动条 / 底栏上方大块空白 | 不要开外置底栏横条；依赖 `AliasTable` 表格内滚动，删除 capture 空 div 与假滚动条。 |
| 内容区白底顶满、查询区贴边 | 保持 Shell `#main-content` 四边 `padding: 16px` + 灰底；`PageLayout` 仅 `padding: 0 16px`，禁止领域 CSS 清零公共 padding。 |
| `PageLayout` 顶部多出一截空白 | 不要给 `#pc-layout-container` 四边 padding；顶部间距由 `#main-content` 承担。 |
| 查询条件、工具栏、表格列被“简化” | 先完成旧页对照清单；未得到产品确认不得删减。 |
| Select placeholder 不显示 | 初始值和 reset 值使用 `undefined`/`null`，不用 `""`。 |
| 弹窗/确认框出现英文 | 显式提供中文动作文案，并核对公共 locale/portal 上下文。 |
| 表格展开按钮消失或卡顿 | 仅传递官方树表 props，检查 `childrenColumnName` 与真实响应字段；不要实现第二套展开状态机。 |
| 详情字段全为空 | 检查异步响应结构、字段映射和 VNode 是否在 render 时生成。 |
| 保存 400 | 在 Network 对照旧接口 URL、method 和 payload；按后端 DTO 组装提交体。 |
| 用 CSS 偶然“修好”滚动 | 先测量布局和滚动容器；将通用规则沉淀在 pc-ui，领域页面不复制。 |

## 14. 强制验证清单

### 静态验证

- Client：`test`、`typecheck`
- Domain：`test`、`typecheck`、`build`
- 涉及 Composition：Composition 校验、dev-filter 核对
- `git diff --check`

### 浏览器验证

1. 在已登录本地会话打开菜单顺序中的每个入口。
2. 检查 Console 无新增错误，首个列表请求在 Network 中为正确 URL、非 404 且响应结构正确。
3. 查询并重置一次，确认 placeholder、筛选参数和 loading 正确。
4. 验证分页固定在 footer，滚动主体不会带动 footer；列表页确认只有表格底边一条横条，无底栏假条与中间大白块。
5. 确认 Shell `#main-content` 有灰底四边 16px 边距；`PageLayout` 仅为左右 16px、顶部不额外再垫一层；查询区不贴壳层边缘。
6. 从列表进入至少一个详情/编辑页，确认左侧所属菜单仍高亮；必要时再深链打开该隐藏路由验证一次。
7. 验证一个邻近操作：树展开、编辑弹窗、删除确认、导入/下载或消息 Tab 切换。
8. 检查页面与旧页对照清单，没有未经确认的功能缺失。

### 真实运行链路验证

1. 按当前模式分别验证 Shell 未启动领域时的目标环境回退，以及启动目标 Domain 后的本地 Remote 加载；不要混淆 legacy-compat 与 g2-profile。
2. 只要修改了 Client、菜单、路由或按需启动，检查 Remote manifest/Client manifest 的加载结果与 Network 请求，而不是只看 Vite 控制台。
3. 只要修改了公共表格，至少用包含真实树数据的页面验证：有子节点可展开、叶子无可点击展开按钮、展开后子级数据和序号正确、Console 无警告。
4. 浏览器工具不能连接已登录会话时，记录具体 URL、重定向或连接错误；不得把 build/test 结果写成浏览器通过。

若浏览器、权限或后端环境阻塞验证，必须记录已完成项、未验证项、具体阻塞证据和解除阻塞后的下一步；禁止以“应当可用”作为结论。
