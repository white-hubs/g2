# 指挥调度迁移实施计划

**Goal:** 六个旧业务页面以完整 g2 Domain 和类型化 BFF 服务链路交付。
**Spec:** `docs/superpowers/specs/2026-09-16-command-dispatch-migration-design.md`
**Architecture:** 业务 Domain 与服务 Client 独立发布；公共字典、文件与部门复用服务面；主 Shell 仅负责组装和本地菜单。
**Tech Stack:** Bun、Vue TSX、CSS Modules、Module Federation、pc-ui、pc-map、Bun BFF。

## 执行约束

用户授权直接执行。不改旧仓，不发布远程环境，不混入无关改动。父任务集成，子任务按文件所有权并行。知识图谱工具未提供，已回退具体源码核对；不声称索引完整。

## 任务

- [ ] 服务层：新增 `contracts/command-dispatch`、`apps/clients/command-dispatch`、BFF controller/proxy/config；为 dictionary/file/ouaa 补齐本迁移所需的类型化 BFF 能力。测试查询编码、CRUD 数据、错误传播、鉴权和文件字节转发。
- [ ] 列表页面：新增 `apps/domains/command-dispatch/src/views/{radio-record,intercom-group-config,account-config}` 及公共 PageFrame；从旧源码逐项核对字段与操作，覆盖表单验证和成员集合编辑行为。
- [ ] 配置页面：新增 `views/{priority-department-config,dispatch-map-config,background-config}`；以类型化 dictionary/file/ouaa client 加载和保存，地图平台生命周期与尺寸测量完整清理。
- [ ] 组装：新增 Domain package/vite/context/routes/menu 与测试；更新 Profile/registry/release-set/开发映射/旧桥过滤；无额外菜单鉴权隐藏条件。
- [ ] 联调：安装 workspace 链接，运行相关测试、typecheck、lint、fmt、build 和架构门禁，修正迁移引入问题。
- [ ] 浏览器：实际载入主 Shell 下六个路由，验证菜单顺序、列表、弹窗、地图和上传；记录真实接口和受控测试边界，保存可复现验收证据。

## 固定并行接口

`CommandDispatchClient`: `pageRecordings(query)`, `pageGroups(query)`, `createGroup(payload)`, `updateGroup(id,payload)`, `deleteGroup(code)`, `pageDevices(query)`, `updateDevice(id,payload)`, `setGroupMembers(code,deviceCodes:string[])`, `pageAccounts(query)`；返回解包后的类型化 DTO。

公共服务：dictionary 的 `getDictionaryItemByCode(string)`、`createDictionaryItem(payload)`、`getDataDictionaryByItem({itemCode})`、`createDataDictionary(payload)`、`updateDataDictionary(payload)`；file 新增 `uploadBusinessFile({file:Blob,businessKey:string})` 返回 `{id?,path,name?}`；ouaa 新增 `getDepartments({enabled?:boolean})` 返回含 `id/name/children` 的 DepartmentNode[]。其余页面特定数据转换留在 Domain。
