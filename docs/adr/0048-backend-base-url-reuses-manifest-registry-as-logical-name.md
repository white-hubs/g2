# 后端 baseURL 复用 ADR-0043 版本注册表机制，作为一个逻辑名下发，不走编译期 env

后端 API 的 `baseURL` 默认由运行时按当前源计算（同源假设，与旧仓"不配 baseURL、走相对路径"等价，只是这次显式算出一个值，而不是隐式依赖相对路径解析），不写死进编译期 `import.meta.env` 之类的按环境分支的构建产物——一份构建产物换到哪个部署位置都不用重新编译。

线上需要覆盖默认值时（前后端非同源部署、系统级客制独立后端等场景），复用 ADR-0043 / ADR-0055 的"源 Profile + 版本注册表 + 已解析 Profile"机制：把 `baseURL` 当成版本注册表里的一个逻辑名（如 `backendApi`），记入同一张「环境 + 逻辑名 → 具体值」注册表（由地址模版⊗同名环境变量在 `generate` 时写入，见 ADR-0055），跟 remote entry 版本指针走同一条生成 / 发布 / 回滚流程，不新开一套独立的"运行时可随意替换的配置文件"通道。即便后端地址本身通常没有"版本回滚"的语义（不像 remote entry 有新旧版本之分），复用同一套指针替换机制仍然收益更大——运维只需要一套发布/回滚操作面，不需要为 baseURL 单独学一套流程；这与 ADR-0044 里系统级客制覆盖复用同一套指针替换机制的判断一致。

同机制亦用于静态资源 CDN 前缀：注册表逻辑名 `staticResourceBase`（如 `https://r.kaiheai.com`），解析进已解析 Profile 的 `staticResourceBaseUrl`；Shell 启动时 `configureStaticResourceBase`，业务侧对接口返回或代码中的 `/resource/*` 调用 `resolveStaticResourceUrl`（`@g2-shared/resource`），改写为 `{base}/*`（剥掉 `/resource`）。空串/缺省表示同源 `/resource`（可走开发代理）。禁止在业务代码写死 CDN 域名。
