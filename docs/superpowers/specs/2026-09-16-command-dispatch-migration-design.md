# 指挥调度迁移设计

来源：`/Users/solin/guhecloud/ghcloud/prod/cube/business/command-dispatch-config`。
用户已授权完整迁移并要求不再重复确认。

## 交付边界

迁入录音记录（查询、分页、播放）、对讲组配置（查询、新增、编辑、删除、跨页成员选择）、账号配置（查询及旧编辑设备表单）、优先排序部门（部门树及保存）、地图配置（搜索定位、点选、半径、旋转、缩放及保存）、背景配置（图片校验、上传、预览及保存）。保留旧接口数据含义，不扩大到独立调度大屏。

## 架构

- Domain：`@g2-domain/command-dispatch`，逻辑名 `commandDispatch`，`/d/command-dispatch`，应用码 `COMMAND_DISPATCH`。
- 调度服务：`@g2-contract/command-dispatch` → `@g2-client/command-dispatch` (`commandDispatchClient`, `./client`, `create(ctx)`) → `/gw-bff/command-dispatch` controller/proxy。上游调度与融合通信地址独立配置，所有 endpoint 显式定义。
- 公共字典、文件、部门继续归属 dictionary/file/ouaa 服务面。补齐类型和必要 BFF endpoint；新页面访问业务数据仅走 `/gw-bff`。地图 SDK/瓦片经 pc-map 平台加载。
- UI 为 Vue TSX + CSS Modules，组件通过 pc-ui；地图通过 pc-map。无旧仓 workspace/path 依赖，无新增类型逃生指令。
- Domain context 提供 `getCommandDispatchClient()`、异步 `getDictionaryClient()`、`getOuaaClient()`、`getFileClient()`。
- 字典保持 `COMMAND_DISPATCH_MAP_CONFIG` 的 `lnglat/rotation/zoom/radius/background` 和旧优先部门字典原值；不覆盖其他字典键。
- 列表请求和保存失败显示可操作错误，始终结束 loading；失败不能伪装成空列表或成功。

## 菜单

本地声明 `指挥调度` 根节点，下列顺序固定，原同 sort 顺序保持：

1. 历史记录 → 录音记录（`lyjl` / `radio-record`）
2. 系统配置 → 对讲组配置（`djzpz` / `intercom-group-config`）、账号配置（`zhpz` / `account-config`）、优先排序部门（`yxpxbm` / `priority-department-config`）
3. 地图配置（`dispatch-map-config`）
4. 背景配置（`background-config`）

根路由默认进入录音记录。菜单顺序和父子关系来自用户清单，不运行时依赖后端菜单 path。登记 Profile、dev registry、release set、开发 remote 映射；精确过滤旧 `command-dispatch-config` 注册名，保持独立调度大屏入口不受影响。

## 验收

服务边界测试核对方法、路径、参数、鉴权、错误和 multipart 上传。Domain 测试核对菜单、路由、install。浏览器验证六页、查询/重置/分页、组管理和成员选择、配置保存及刷新、图片上传/校验，检查 Console 和 Network；真实上游无权限时明确区分本地受控集成验证与真实业务写入。静态执行相关 typecheck/lint/format/build 及 composition/依赖/禁用文件门禁。
