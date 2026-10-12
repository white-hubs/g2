/**
 * 迁移自旧仓 `legacy/bimops-fe-web-migrate/src/config.js` 里剩余两个未迁移导出
 * （`copyright`/`fallback`）。这两个值本身没有强依赖任何旧仓运行时逻辑，纯粹是静态文案/资源，
 * 这里只迁移值本身，不接任何 UI 消费点——接哪个具体 UI 组件超出本次任务范围（见下方逐项说明），
 * 强行找个地方塞一行没人设计过的版权文字/占位图，比"暂不迁移"更糟。
 *
 * ## `copyright`
 * 旧仓页脚版权文案。已核实旧仓全仓搜索 `copyright`：`src/config.js` 里只有定义、没有任何地方
 * `import` 消费它（`login-form.vue`/`login-phone.vue`/`template-1.vue` 里的 `.copyright` 是
 * CSS 类名撞名，挂在"忘记密码？"链接上，跟这个常量无关）——它在旧仓自己那边就是从未接线的死导出。
 * 新仓 `apps/shells/pc/`、`apps/platforms/pc-chrome/` 目前都没有任何页脚组件，没有可挂的消费点。
 * 先把值原样搬过来备着：等以后真的设计页脚 UI 时直接用这个常量，不用回旧仓再翻一遍 `config.js`。
 *
 * ## `fallback`（未迁移值本身，只记录来源位置，见下）
 * 图片加载失败时的占位图（`data:image/png;base64,...`，约 2KB 的 base64 编码 PNG）。旧仓里是有
 * 真实消费点的：`src/components/menuList/menuList.vue`、
 * `src/components/NavTopLink/components/search-application/search-application.vue`
 * 都把它当 `:fallback` prop 传给图片组件（应用图标加载失败时的兜底展示）。新仓里语义对应的组件
 * （`TenantLogo.vue`/`SearchApplication.vue`/`ApplicationEntry.vue`）都在
 * `apps/platforms/pc-chrome/` 包里，本次任务禁止改动该包（并行任务在处理登录/门面装饰模块）。
 *
 * 这里刻意不手工转录这串 base64 到源码里：它当前在新仓没有任何消费点，手工转录一份几百字符长的
 * base64 字符串出错不容易被发现（不像短文本，肉眼核对不可靠），复制粘贴带来的风险大于"提前备一份"
 * 的收益。真实值原样保留在旧仓 `legacy/bimops-fe-web-migrate/src/config.js` 第 10-11 行
 * （`export const fallback = "data:image/png;base64,..."`），未来接入 `pc-chrome` 图片占位逻辑的
 * 任务应该直接从那个文件复制取值（用工具复制而不是手工转录），不需要在这里维护第二份副本。
 */
export const LEGACY_FOOTER_COPYRIGHT = "Copyright ©2007-2021 www.guhecloud.com, All Rights Reserved.成都古河云科技有限公司 技术支持";

/** `fallback` 常量在旧仓的原始位置，指引未来接入任务去哪里取值（见上方模块注释）。 */
export const LEGACY_IMAGE_FALLBACK_SOURCE_PATH = "legacy/bimops-fe-web-migrate/src/config.js";

/**
 * PC 业务管理端 terminal 码：对齐旧仓 `public/config.js` 的 `window.config.terminal`
 * 与 `@ghcloud/cube-protocol` 的 `CubeTerminalEnum.BUSINESS`。
 * 须随鉴权头一并下发（ADR-0046），OUAA `terminal-application-groups` 等接口依赖此头。
 */
export const BIMOPS_PC_TERMINAL = "bimops-manage-web";
