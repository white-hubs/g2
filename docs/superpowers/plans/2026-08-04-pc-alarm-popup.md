# PC 实时报警弹窗（pc-alarm-popup）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付标准可拔插 Platform `@g2-platform/pc-alarm-popup`：租户实时报警弹窗（原生 TSX 全量特例）+ 总部报警弹窗（market-config + 远端 iframe）；`pc-messaging` 入站发 bus；详情仅 `navigate-intent` code+entry 且应用码匹配；菜单归属码与 Intent 可跳码拆分。

**Architecture:** messaging 解析 `ALARM_NOTICE` → bus（`alarm-notice` / `headquarters-alarm`）→ `pc-alarm-popup` 订阅并展示。租户 UI 在 Platform 内 TSX 叠加，复用 `pc-player` / `pc-alarm-charts` / `alarm-center` Client。总部用 `@g2-client/headquarters-market` 取市场配置后 iframe 远端弹窗。`pc-rtc` 删除报警 handler，只留通话。壳拆分 `navigateCodes`（菜单归属）与 `intentCodes`（intent 解析）。

**Tech Stack:** Vue 3 TSX + CSS Modules、Composition Profile Platform、`@g2-platform/http`、Bun test、agent-browser 对照旧仓弹窗。

**规格来源:** ADR-0062、ADR-0029（修订）、CONTEXT 词条；金标准 `ghcloud/prod/cube/apps/alarm-center/alarm-modal` + bimops `cube-message-socket` / `globalState` 详情跳转。

---

## File map

| 路径                                          | 职责                                                                 |
| --------------------------------------------- | -------------------------------------------------------------------- |
| `contracts/headquarters-market/`              | `getMarketConfig` 等类型                                             |
| `apps/clients/headquarters-market/`           | Client 实现 → `/api/dataintegrate/market-config/...`                 |
| `apps/platforms/pc-alarm-popup/`              | Platform：`install` 订 bus、租户 TSX 弹窗、总部 iframe 壳            |
| `apps/platforms/pc-messaging/src/`            | `ALARM_NOTICE` → bus 归一（租户 / 总部分流）                         |
| `apps/platforms/pc-rtc/src/handlers.ts`       | 移除报警相关；只留 RTC                                               |
| `apps/shells/pc/src/mf-domain-navigate.ts` 等 | `intentCodes` 索引；菜单剥离仍只用菜单归属码                         |
| `deploy/compositions/prod.pc.yaml`            | 装载 `pcAlarmPopup` + `headquartersMarketClient`；门禁 `intentCodes` |
| `docs/adr/0062-*.md`                          | 已落地；实现中勿回漂 pc-rtc                                          |

---

### Task 0: 契约与 Client — headquarters-market

**Files:**

- Create: `contracts/headquarters-market/src/index.ts`
- Create: `apps/clients/headquarters-market/src/client.ts` + `client.test.ts` + package/vite
- Modify: `deploy/compositions/prod.pc.yaml`、`deploy/release-sets/prod.yaml`、bun workspace

- [ ] **Step 1:** 红灯：`getMarketConfig(id)` 期望打到 `/api/dataintegrate/market-config/:id`（注释标明遗留 path）
- [ ] **Step 2:** 实现 Client + contract；`bun test` 绿
- [ ] **Step 3:** Commit：`feat(client): add headquarters-market client for HQ alarm popup`

### Task 1: 壳 — 菜单归属码 vs Intent 可跳码

**Files:**

- Modify: `apps/shells/pc/src/mf-domain-navigate.ts` + tests
- Modify: `apps/shells/pc/src/ouaa-navigation.ts`（剥离只用菜单归属）
- Modify: `apps/shells/pc/src/main.ts` / navigate-intent 解析改走 intent 索引
- Modify: `deploy/compositions/prod.pc.yaml`（access-control：`navigateCodes` 保持门禁；`intentCodes` 同匹配集）

- [ ] **Step 1:** 红灯：同一 code 可只在 intent 索引、不触发侧栏剥离
- [ ] **Step 2:** 实现双索引；intent 无命中 → 不 portal 兜底
- [ ] **Step 3:** Commit：`feat(shell): split menu-owning navigateCodes from intentCodes`

### Task 2: pc-messaging — ALARM_NOTICE 归一

**Files:**

- Modify: `apps/platforms/pc-messaging/src/`（socket/handler 现网入口）
- Test: 有/无 `marketTenant` 分别发 `alarm-notice` / `headquarters-alarm`

- [ ] **Step 1:** 对齐旧 `message-socket` 分流；解析 `businessPrincipal`
- [ ] **Step 2:** 单测钉死事件名与载荷形状
- [ ] **Step 3:** Commit：`feat(pc-messaging): publish alarm-notice and headquarters-alarm on bus`

### Task 3: pc-rtc — 撕掉报警

**Files:**

- Modify: `apps/platforms/pc-rtc/src/handlers.ts` + tests
- Modify: 计划/文档中仍写「rtc 报警」的注释

- [ ] **Step 1:** 删除 `headquarters-alarm` → navigate-intent 报警路径
- [ ] **Step 2:** 测试只保留 RTC 事件
- [ ] **Step 3:** Commit：`refactor(pc-rtc): drop alarm popup handlers (ADR-0062)`

### Task 4: pc-alarm-popup 骨架

**Files:**

- Create: `apps/platforms/pc-alarm-popup/`（package、vite MF、`platform.ts`、`install`）
- Modify: Profile / release-set / platform-load-policy（若需 on-demand）

- [ ] **Step 1:** Platform `install` 订阅 `alarm-notice` / `headquarters-alarm`（先 no-op 或 log）
- [ ] **Step 2:** Profile 装载可发布
- [ ] **Step 3:** Commit：`feat(pc-alarm-popup): add platform skeleton and bus subscriptions`

### Task 5: 租户弹窗 UI — 主路径 + 特例

**Files:**

- Create: `apps/platforms/pc-alarm-popup/src/tenant-popup/**`（队列、级别皮、音效、属性 Tab、视频 Tab、详情、自动关）
- 复用: `pc-player`、`pc-alarm-charts`、`alarm-center` Client（详情补全 / 状态轮询）
- 金标准: `ghcloud/.../alarm-modal/src/views/alarm-modal.tsx`

- [ ] **Step 1:** 模型：队列、当前索引、级别样式、文案拼接（含储量监测等分支）
- [ ] **Step 2:** TSX 叠加层 1:1 主路径 + 旧仓特例分支
- [ ] **Step 3:** 定位按钮：发 `alarm-popup:locate-device`；无消费者时用 config 隐藏
- [ ] **Step 4:** 藏详情：Profile/宿主条件（对齐旧指挥调度等）
- [ ] **Step 5:** 单测模型 + agent-browser 对照截图
- [ ] **Step 6:** Commit：`feat(pc-alarm-popup): tenant realtime alarm popup TSX`

### Task 6: 详情跳转 — 应用码匹配

**Files:**

- Modify: popup「详情」→ `bus.publish('navigate-intent', { code, params: { entry: 'alarmDetail', id, businessKey, deviceId, … } })`
- Modify: 壳：intent 索引未命中或码与目标 Domain `applicationCode` 不匹配 → 提示/中断（可在 popup 内先校验再发）

- [ ] **Step 1:** 红灯：`DOORMANAGE` 可进门禁详情；`FIRECONTROL` 不进门禁、提示异常
- [ ] **Step 2:** 实现匹配（以 Domain config / intent 表登记的宿主应用码为准）
- [ ] **Step 3:** Commit：`feat(pc-alarm-popup): detail navigate-intent with applicationCode match`

### Task 7: 总部 iframe 1:1

**Files:**

- Create: `apps/platforms/pc-alarm-popup/src/headquarters-iframe.*`
- Use: `headquartersMarketClient.getMarketConfig`
- 对齐: bimops `cube-message-socket.vue` postMessage 协议

- [ ] **Step 1:** marketTenant → getMarketConfig → iframe URL（含旧 query 凭证；安全债另开 issue）
- [ ] **Step 2:** ready / push message / close 协议
- [ ] **Step 3:** 测试 + 手工/agent-browser 验收
- [ ] **Step 4:** Commit：`feat(pc-alarm-popup): headquarters iframe via headquarters-market`

### Task 8: 全量验收

- [ ] **Step 1:** Profile 含 `pcAlarmPopup` + clients；`publish --set=prod` + reload
- [ ] **Step 2:** 租户：推送/模拟 `ALARM_NOTICE` → 弹窗队列/Tab/详情（门禁码）
- [ ] **Step 3:** 不匹配码：详情中断提示
- [ ] **Step 4:** 总部：有 marketTenant 走 iframe
- [ ] **Step 5:** 确认 `pc-rtc` 无报警 UI；侧栏未因 intent 表误剥

**停机条件：** ADR-0062 行为全满足；agent-browser/对照旧仓主路径 + 特例清单勾完；相关 bun test 绿。

---

## 刻意不做（本计划外）

- 总部 iframe 凭证改短时 token（安全专项）
- UE5/地图消费 `alarm-popup:locate-device` 的真定位
- 把 `FIRECONTROL` 等未迁应用详情借门禁宿主「装可用」
- 线损/粮情等与弹窗无关的业务迁入
