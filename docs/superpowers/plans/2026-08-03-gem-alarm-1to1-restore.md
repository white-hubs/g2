# GEM 门禁报警配置/记录 完整 1:1 还原 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将门禁 Domain 宿主下的报警配置（含 iot-center 规则编辑器）与报警记录（含详情/指派/挂起/处理）相对金标准 **完整 1:1** 还原：逻辑、UI、交互；`applicationCode` 仅来自 Domain props。

**Architecture:** 页面与编辑器分区落在 `@g2-pages/generic-equipment-monitor`；HTTP 走 `@g2-client/alarm-center` / `device-center` / `ouaa` / `file` / `dictionary`（按需）；Domain `@g2-domain/access-control` 只注入 client、能力码、`applicationCode`。金标准：消防 GEM 列表交互 + iot-center `generic-alarm-config` 编辑器 + 旧仓 `alarmRecord/*` 处理流。

**Tech Stack:** Vue 3 TSX、ant-design-vue（经 `@g2-platform/pc-ui`）、Bun test、agent-browser 对照 `localhost:8080` vs `192.168.0.243:40201`（临时 composition `FIRECONTROL` 取有数据页，验完改回 `DOORMANAGE`）。

**验收停机条件（全部满足才停 `/loop`）：**

1. 配置列表列/筛/行操作/禁用弹窗与消防 GEM 一致
2. 编辑器 7 分区 UI/交互与 iot-center 一致（含级联选择、弹窗、Collapse extra）
3. 保存载荷字段与 iot-center `put/addAlarmRule` 一致且可落库
4. 记录列表列/筛/批量/行操作与消防 GEM 一致
5. 指派=人员表格多选；处理=结果+原因字典+图片；挂起=说明弹窗
6. 详情页字段与操作流一致
7. URL 无 `applicationCode` query
8. 相关 bun test 绿；agent-browser 截图对照通过

---

## File map

| 职责                          | 路径                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| 编辑器 shell                  | `apps/page-libraries/generic-equipment-monitor/src/pages/alarm-configure-add.tsx`           |
| 编辑器 model                  | `.../components/alarm-config/alarm-config.model.ts` + `types.ts`                            |
| 规则/设备/指派/消息/物联/处置 | `.../components/alarm-config/alarm-*.tsx` + `select-notice.tsx` + `target-picker-modal.tsx` |
| 记录列表/详情                 | `.../pages/alarm-record.tsx` / `alarm-detail.tsx`                                           |
| 处理/挂起/指派弹窗            | `.../pages/components/alarm-handle-modal.tsx` 等                                            |
| Clients                       | `apps/clients/{alarm-center,device-center,ouaa,file,dictionary}/`                           |
| Domain 注入                   | `apps/domains/access-control/src/{domain,mount-gem-page,capability-codes}.ts`               |
| Composition                   | `deploy/compositions/prod.pc.yaml`（验收时临时 FIRECONTROL）                                |

金标准源码：

- React 编辑器：`/Users/dg/work-ghy/ghcloud/prod/cube/apps/iot-center/app/src/pages/generic-alarm-config/`
- Vue 记录：`/Users/dg/work-ghy/ghcloud/legacy/generic-equipment-monitor-migrate/src/views/pages/alarmRecord/`

---

### Task 1: 报警规则级联（AlarmRuleDevice / Attr）

**Files:**

- Modify: `alarm-rule.tsx`；新增 `alarm-rule-device.tsx` / `alarm-rule-attr.tsx`（从 iot-center 迁）
- Modify: `apps/clients/device-center/src/client.ts`（缺的 genre/model/event/attr/condition API）
- Test: `alarm-config.model.test.ts` + device-center client test

- [ ] **Step 1:** 对照 iot-center `alarm-rule.tsx` / `alarm-rule-device.tsx` / `alarm-rule-attr.tsx` 列出必调 API 与 UI 控件
- [ ] **Step 2:** TDD 补齐 device-center client 方法
- [ ] **Step 3:** 实现品类→产品→条件类型→事件/属性表达式级联 + 时段（ALL/WEEK/MONTH/TIME）
- [ ] **Step 4:** 详情只读态与 iot-center ReadonlyDescriptions 对齐
- [ ] **Step 5:** bun test + 本地编辑页 agent-browser 点选级联

### Task 2: 指定设备弹窗 1:1

**Files:** `alarm-device.tsx`；对照 `iot-center/.../alarm-device.tsx` + energy-modal

- [ ] 区域 Cascader、关键字、产品/标签筛选、分页多选、勾选导入当前页/全部（与旧仓能力对齐的部分）
- [ ] 表格列：序号/名称/区域/产品/启用/删除
- [ ] 顶部「指定设备」Switch + 添加/批量删除 extra

### Task 3: 指派处理 + 消息通知 1:1

**Files:** `alarm-assign.tsx` / `alarm-message.tsx` / `select-notice.tsx` / `target-picker-modal.tsx`

- [ ] 场景通知渠道：`getSatMsgChannels` + `getSatMsgSceneReceive` 过滤（已有 model helper）
- [ ] 对象类型 DEPARTMENT/ROLE/USER + ModalTable 多选（ouaa listUsers/getRoles/getOrganizations）
- [ ] 当班人员（dutyUser）+ 有考勤应用检测（ouaa productApplications，若门禁无则隐藏与旧仓一致）
- [ ] 消息：及时/超时、时长单位、多规则增删、Collapse extra 开关

### Task 4: 物联联动 1:1

**Files:** `alarm-iot.tsx`；对照 `alarm-iot-rule.tsx`

- [ ] 品类 Cascader、设备实例弹窗、属性/指令、设定值、执行方式 AUTOMATIC/MANUAL
- [ ] enabled Switch + 添加按钮（extra）

### Task 5: 处置配置 + 编辑器壳交互

**Files:** `alarm-dispose.tsx` / `alarm-configure-add.tsx`

- [ ] 恢复 Collapse（或视觉等价折叠面板）+ header extra 开关/按钮，交互对齐 iot-center
- [ ] 处置：研判时限、系统自动处理、enabled 控制面板显隐
- [ ] load/save 仍走 `parseEmergencyRuleFromApi` / `buildEmergencyRulePayload`
- [ ] 禁止 URL `applicationCode`

### Task 6: 报警记录指派人员表格

**Files:** `alarm-record.tsx`；新增 `alarm-assign-users-modal.tsx` 重写为表格选择

- [ ] 对照旧仓 `modal-table` + `tenantUserList`：职位/组织筛、checkbox、返回 `assignUsers[{userId,userName,departmentId,departmentName}]`
- [ ] 走 ouaa client；能力码 `ackAlarm`

### Task 7: HandleResult 完整处理弹窗

**Files:** `alarm-handle-modal.tsx`；file/dictionary clients

- [ ] 处理结果必选；非批量：报警原因字典（可搜索新增）；描述；图片上传（sceneCode 对齐旧仓 alarmRecordHandler，最多 3）
- [ ] 批量模式：无原因/图片，描述限长
- [ ] 列表与详情共用同一弹窗组件

### Task 8: 挂起 + 批量删除确认 + 详情页

**Files:** `alarm-suspend-modal.tsx` / `alarm-record.tsx` / `alarm-detail.tsx`

- [ ] 挂起说明弹窗；批量删除 Popconfirm「确定删除当前数据？」
- [ ] 详情字段序与操作按钮显隐按状态 + 能力码；操作日志列表

### Task 9: 全量验收 `/loop`

- [ ] composition 临时 `FIRECONTROL` → publish → reload
- [ ] agent-browser：配置列表/编辑器各分区/记录/详情/弹窗对照旧仓截图
- [ ] 全部通过 → composition 改回 `DOORMANAGE` → publish → **停 loop**

---

## Execution notes

- TDD：client/model 先红再绿；UI 用 agent-browser 对照
- 每完成 Task 跑：`bun test`（GEM + alarm-center + device-center + access-control）
- 改前端后：`bun run --filter @g2-tooling/release cli -- publish --set=prod` + `bun run web-release:reload`
- `/loop`：固定短间隔只做验收复检；回合内继续实现，禁止空等
