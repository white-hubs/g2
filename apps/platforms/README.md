# `@g2-platform/*` 包约定

Platform 是 **MF remote**：由 Composition Profile / 版本注册表装载，独立构建与热修（见 ADR-0010、ADR-0014、ADR-0050）。目录里即使像「纯库」，部署单元仍是 `remoteEntry.js` + manifest，不是 npm 静态打进消费者。

## `index.html` 是什么、不是什么

|          |                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **是**   | Vite 客户端构建的**默认入口壳**（经 `<script type="module" src="/src/main.ts">` 拉起占位图），满足当前「未配置 `build.rollupOptions.input`」时的打包前提 |
| **不是** | 独立可运行产品、独立站点、用户入口、Profile 装载对象、热修指针目标                                                                                       |

真正交付与热修只关心：`remoteEntry.js`、`mf-manifest.json`（及 exposes 对应 chunk）。Host 运行时**不打开**各 Platform 的 `index.html`。

`src/main.ts` 仅挂一行说明性占位（如「library remote, no UI」），不要在这里长业务。

## 为什么不能删

本仓 Platform 的 `vite.config` **约定不**为 remote 单独改写 `build.rollupOptions.input`。在此前提下：

1. Vite 8 默认把项目根 `index.html` 当作 client build entry；
2. `@module-federation/vite` 负责产出 remote 容器，**不替代**上述默认入口；
3. 删除 `index.html` 且不改配置 → `vite build` 报错：`Cannot resolve entry module index.html`。

因此该文件与占位 `main.ts` **必须保留**。看起来「怪」不等于多余；误删会直接打断独立发版流水线。

若未来某包改用显式 JS `input`（并评估 `hostInitInjectLocation: 'entry'` 等），须单独改配置并改写本约定——**在改约定之前，禁止以「反正 Host 不用」为由删除 html。**

## 与门面 html 的区别

- `apps/shells/*/index.html`：用户访问的 SPA 入口，必要且有真实 UI。
- `apps/platforms/*/index.html`：构建/工具链壳，无产品页面语义。

Remote Domain（如 `poc-remote-pc`）若同属 Vite + MF remote 打包，遵循同一条「入口壳」规则。
