# ADR-0059 应用域路由 / 页面库 / 菜单 overlay 落地计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 ADR-0059 从文档落到可运行骨架：应用域自持 routes + 默认菜单 + 能力码表；页面库纯 exposes；壳 intent 以 `code/entry` 为准；可选无 path 的菜单 overlay；再用一个最小示范（夹具或薄宿主）证明「两应用挂同一页面库」。

**Architecture:** 导航 Domain（应用域）继续走 Profile `remotes`/`inline` + `DomainModule`；共享页落独立 **page-library** MF remote（非 DomainModule）。宿主在自有 routes 挂载库页面并注入 `capabilityCodes` + `navigatePage` + API/config。Chrome 合并菜单：`default menuContribution ⊕ overlay(code) ⊕ functionCodes 过滤`。跨应用只发 `navigate-intent`（无 path）。

**Tech Stack:** Vue 3 + TSX、Module Federation（`@module-federation/vite`）、`@g2-composition/contract`、PC Shell / pc-chrome、bun test。

**规格来源:** `docs/adr/0059-app-owns-routes-page-library-menu-overlay.md`；关联 ADR-0036 / 0058；词条见 `CONTEXT.md`。

**刻意不做（本计划外）:** 完整迁入 `genericEquipmentMonitor` 业务页；改 OUAA 后端协议（overlay 可先用前端夹具/本地 JSON）；删除 qiankun 桥。

---

## 文件结构（落地后）

| 路径                                             | 职责                                                        |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `apps/page-libraries/<name>/`                    | 页面库 MF 包（新建角色目录；见 Task 0）                     |
| `packages/composition-contract/src/`             | overlay 类型、`entry` 菜单字段、（可选）page-nav 事件名常量 |
| `packages/composition-loader/` 或 shell 内纯函数 | `mergeMenuOverlay(default, overlay)`                        |
| `apps/shells/pc/src/navigate-intent-handler.ts`  | intent：code/entry 优先；path 标 deprecated                 |
| `apps/shells/pc/src/mf-domain-navigate.ts`       | entry → 子 path 解析强化                                    |
| `apps/platforms/pc-chrome/...`                   | 菜单渲染吃合并后的树；叶子用 entry/code 导航                |
| `apps/domains/<host>/`                           | 示范宿主：routes 挂页面库 + 能力码表                        |
| `deploy/compositions/`                           | Profile 增加 page-library remote 成员（若走独立 remote 槽） |
| `docs/adr/0004-...` 或短补丁 ADR-0060            | 仓库布局增加 `apps/page-libraries/*`                        |

**页面库 Profile 槽位（建议，Task 0 钉死其一）:**

- **推荐 R1:** Composition Profile 新增数组键 `pageLibrary`（与 `remotes`/`platform`/`client` 并列），壳不为其注册 `basePath`，仅发版/装载；宿主域 `loadRemote(name, expose)` 取页面。
- **备选 R2:** 暂挂 `platform` 槽（语义脏，仅过渡）。
- **否决:** 把页面库登记成带 `basePath` 的 domain remote。

---

## Phase 0 — 契约与仓布局

### Task 0: 页面库目录 + Profile 槽位决议

**Files:**

- Create: `apps/page-libraries/README.md`（角色说明，对齐 domains/platforms）
- Create: `docs/adr/0060-page-library-apps-slot.md`（或补丁 ADR-0004：增加 `apps/page-libraries/*` + Profile `pageLibrary`）
- Modify: `docs/adr/0004-repo-layout-apps-role-groups.md`（后续变更指针）
- Modify: `CONTEXT.md`（若槽位名需入词条）
- Modify: workspace / turbo / release-set 扫描 glob（按仓内现有 `apps/domains` 接入方式抄）

- [ ] **Step 1:** 写 ADR-0060（或 0004 补丁）：物理路径 `apps/page-libraries/<kebab>`，scope 建议 `@g2-pages/<name>` 或 `@g2-page-library/<name>`（与现有 scope 规则对齐后选定一种）；Profile 键 `pageLibrary`；**不**实现 `DomainModule`，**不**分配 `basePath`。
- [ ] **Step 2:** 落 `apps/page-libraries/README.md` + 空 glob / package 模板所需的根配置改动。
- [ ] **Step 3:** Commit：`docs(adr): add page-library apps slot and profile key`

### Task 1: composition-contract — menu entry + overlay 类型

**Files:**

- Modify: `packages/composition-contract/src/types.ts`
- Modify: `packages/composition-contract/src/assert-domain-module.ts`（及 test）
- Create: `packages/composition-contract/src/menu-overlay.ts`（类型 + 纯合并函数可先放此包或 `packages/composition-menu`——优先同包纯函数避免新包）
- Test: `packages/composition-contract/src/menu-overlay.test.ts`
- Test: `packages/composition-contract/src/assert-domain-module.test.ts`

- [ ] **Step 1:** 扩展 `MenuContributionNode`：增加可选 `entry?: string`（应用域内路由主键）；保留 `path?` 仅作域内默认拼装提示或过渡（文档写明：跨应用/overlay 不用 path）。
- [ ] **Step 2:** 定义 `MenuOverlayNode` / `MenuOverlay`：`code` 必填；允许 `parentCode?`、`order?`、`alias?`、`hidden?`；**类型层禁止 `path`**（若输入带 path，assert 失败或 strip + warn，测试钉死「有 path 则 reject」）。
- [ ] **Step 3:** 实现 `mergeMenuContribution(defaultTree, overlay | undefined): MenuContributionNode[]`——无 overlay 返回默认深拷贝；有则只搬已有 code 节点；未知 code 跳过；不得创造默认树没有的可导航叶子。
- [ ] **Step 4:** 单测覆盖：无 overlay、改 alias、改 parent/order、hidden、未知 code、非法 path。
- [ ] **Step 5:** Commit：`feat(composition-contract): menu entry field and pathless overlay merge`

---

## Phase 1 — 壳 navigate-intent（去 path 契约）

### Task 2: intent 解析：code + entry 为主路径

**Files:**

- Modify: `apps/shells/pc/src/navigate-intent-handler.ts`
- Modify: `apps/shells/pc/src/mf-domain-navigate.ts`
- Modify: `apps/shells/pc/src/navigate-intent-handler.test.ts`
- Modify: `apps/shells/pc/src/main.ts`（`resolvePathForAppCode` / 索引）
- Grep 清理：`publish("navigate-intent", { path:` 调用方标 `TODO(adr-0059)` 或改为 entry

- [ ] **Step 1:** 改 `resolveTargetPath` 顺序：**先** `code`（+ params.entry/appCode），**仅当**无 code 且存在 path 时才走 path（迁移兼容）；有 code 时**忽略** path（测试钉死）。
- [ ] **Step 2:** `mf-domain-navigate`：明确 `entry` → 拼 `/d/{registry}/{entry…}` 的规则（规范化去前导 `/`、禁止 `..`）；域可提供 `entry` 别名表（先硬编码在域导出或 shell 索引扩展点——最小：entry 即相对 path 段）。
- [ ] **Step 3:** 更新单测：`code+entry` 成功；`code+path` 忽略 path；仅 path 仍兼容并在注释标明 deprecated。
- [ ] **Step 4:** 仓内新代码示例（pc-auth 改密等）能改的改为 `code+entry`；改不动的加 TODO。
- [ ] **Step 5:** Commit：`feat(shell): prefer navigate-intent code/entry over path`

---

## Phase 2 — Chrome 菜单：默认树 ⊕ overlay ⊕ functionCodes

### Task 3: 菜单合并接入 chrome / shell 导航数据源

**Files:**

- 定位当前菜单组装（OUAA menuVOS vs domain `menuContribution`）——以 `apps/platforms/pc-chrome` + shell `ouaa-navigation` / 相关文件为准（实现时 `rg menuContribution|menuVOS`）
- Modify: 组装点，调用 `mergeMenuContribution`
- Create: overlay 获取口（先 **本地夹具** `getMenuOverlay(appRegistryCode): MenuOverlay | undefined`，返回 `undefined` 即默认树）
- Test: chrome 或 shell 侧纯函数测 + 必要 vitest

- [ ] **Step 1:** 画清现状数据流（注释或短段落写进 PR）：哪些应用仍吃 OUAA path，哪些已吃 `menuContribution`。
- [ ] **Step 2:** 对已走 `menuContribution` 的应用域：组装时 `merge(default, overlay?)`，再 `functionCodes` 过滤。
- [ ] **Step 3:** 叶子导航：优先 `entry` → intent/`router` 拼 path；无 entry 时才 fallback 域内 `path`（同域）。
- [ ] **Step 4:** 夹具 overlay：改一个 label/order，浏览器或单测可见；无夹具时行为与现网一致。
- [ ] **Step 5:** Commit：`feat(pc-chrome): merge pathless menu overlay onto domain defaults`

---

## Phase 3 — 页面库夹具 + 双宿主示范

### Task 4: 最小页面库 remote（夹具）

**Files:**

- Create: `apps/page-libraries/demo-shared-pages/`（名可调整）
  - `package.json`、`vite.config.ts`（MF exposes）
  - `src/pages/AlphaList.tsx`、`AlphaDetail.tsx`
  - `src/nav.ts`：导出类型 `PageNavigatePayload = { page: string; params?: Record<string, string> }`
  - `src/codes.ts`：只定义 **key 常量**（如 `PAGE_ALPHA_LIST`），**不**含 functionCode 字符串值
- Modify: Profile / release-set / dev 注册表，登记该 pageLibrary
- Test: 库内组件用注入 codes 显隐按钮的单元测

- [ ] **Step 1:** 搭 MF 包，expose 例如 `./AlphaList`、`./AlphaDetail`。
- [ ] **Step 2:** 页面 props：`codes: { page: Record<string,string>; action?: Record<string,string> }`、`functionCodes: Set<string> | string[]`、`onNavigatePage: (p) => void`、可选 `api`。
- [ ] **Step 3:** List 点「详情」只调用 `onNavigatePage({ page: 'alphaDetail', params: { id } })`，禁止 `router` / 禁止发带 path 的 intent。
- [ ] **Step 4:** Commit：`feat(page-library): add demo-shared-pages fixture remote`

### Task 5: 两个应用域宿主挂同一页面库

**Files:**

- Create 或扩展两个薄域（优先夹具域，避免污染 access-control）：
  - `apps/domains/demo-host-a/`
  - `apps/domains/demo-host-b/`
- 各域：`routes`（不同 path 前缀）、`menuContribution`（不同默认树/文案）、`capabilityCodes` 映射到**不同** functionCode、包装层把 `pageKey` → 本域 `router.push` 或 intent
- Modify: `deploy/compositions/*` 将两域 + pageLibrary 写入 Profile
- Test: 域测 routes/menu assert；包装导航单测

- [ ] **Step 1:** Host A：`/d/demo-host-a/shared/list|detail/:id`，codes `A_*`。
- [ ] **Step 2:** Host B：`/d/demo-host-b/lib/list|detail/:id`，codes `B_*`（证明码表在宿主）。
- [ ] **Step 3:** 包装组件 `loadRemote('demoSharedPages','./AlphaList')` + 注入。
- [ ] **Step 4:** 手动验收清单：两 URL 不同、同 UI；缺码表键则按钮隐藏；库内点详情只变宿主 URL。
- [ ] **Step 5:** Commit：`feat(domains): demo hosts mount shared page-library with own routes`

### Task 6: 跨宿主 intent（无 path）

**Files:**

- Modify: 示范页或 chrome 入口发 `navigate-intent` 到另一 host 的 list entry
- Test: `navigate-intent-handler` 已有测基础上补 host-b entry

- [ ] **Step 1:** 从 A 触发 `{ code: 'demo-host-b', params: { entry: 'lib/list' } }`（code 与索引一致）。
- [ ] **Step 2:** 确认不携带 path；落地 B 的 list。
- [ ] **Step 3:** Commit：`test(shell): cross-host intent uses entry only`

---

## Phase 4 — 门禁、文档、迁移债

### Task 7: 门禁与文档

**Files:**

- Modify: `CONTEXT.md`（若 Task 0 有槽位名）
- Modify: `apps/page-libraries/README.md`、domains README（若有）
- 可选：`check:*` 禁止页面库依赖 `vue-router` 的 `useRouter`（能做则做，做不到就文档约束 + code review）
- Modify: ADR-0059「后果」勾选实现进度（可选一句）

- [ ] **Step 1:** 文档写清：新跳转禁止 path；页面库禁止自持 code。
- [ ] **Step 2:** `rg 'navigate-intent' -g'*.ts*'` 扫一遍，列剩余 `path:` 调用清单进 ADR-0059 或 issue。
- [ ] **Step 3:** Commit：`docs: page-library landing notes and intent path debt list`

### Task 8: （后续波次，本计划仅列里程碑）GEM 真迁

**状态：完成（专项收口）** — 页面库 TSX + 宿主 16 entry + portal rewrite + 重依赖 platform/client 已进仓；对照旧站与 `release:publish` 按环境执行。

1. `generic-equipment-monitor` → `apps/page-libraries/generic-equipment-monitor`（页面库，TSX）。
2. 各业务应用域声明 routes + 能力码表 + `onNavigatePage` 映射。
3. 旧 `/portal/genericEquipmentMonitor/*`：壳一次性兼容 rewrite → 默认宿主 intent（有期限）。
4. qiankun 清单剔除该微应用名。
5. overlay 对接真实配置源（BFF/OUAA 收窄接口），替换夹具。

---

## 验收标准（Definition of Done）

| #   | 标准                                                                       |
| --- | -------------------------------------------------------------------------- |
| D1  | ADR-0060/0004：`apps/page-libraries` + Profile `pageLibrary` 有文档与 glob |
| D2  | `mergeMenuContribution` 单测绿；非法 path overlay 被拒                     |
| D3  | intent：有 code 时忽略 path；`code+entry` 可跳示范域                       |
| D4  | demo 两宿主不同 basePath，同页面库 expose；码表注入可测                    |
| D5  | 页面库源码无 `router.push`、无硬编码业务 functionCode                      |
| D6  | 无 overlay 时菜单与默认 `menuContribution` 一致                            |

---

## 建议执行顺序与停顿点

```
Phase 0 (Task 0–1) → 停顿：确认 Profile 键名与 package scope
Phase 1 (Task 2)     → 停顿：扫一遍 path 债是否可接受
Phase 2 (Task 3)     → 停顿：overlay 夹具是否够用
Phase 3 (Task 4–6)   → 演示双宿主
Phase 4 (Task 7)     → 收尾；Task 8 另开专项
```

每完成一个 Task 按上文 Commit 信息提交；不要把 Phase 3 与 GEM 真迁揉进同一 PR。
