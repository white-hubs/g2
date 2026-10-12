# 共享业务页面库

页面库是无独立 URL 的 Module Federation remote。它只提供可复用页面实现和稳定契约，不创建 Router、不声明菜单、不读取登录态，也不决定业务功能码。

## 最小结构

```text
apps/page-libraries/<name>/
├── package.json
├── vite.config.ts
└── src/
    ├── contract.ts
    ├── contract-info.ts
    ├── index.ts
    ├── pages/
    └── components/
```

## 接入规则

1. 在 `vite.config.ts` 中为每个页面声明唯一 expose，并提供 `./contractInfo`。
2. 在 Composition Profile 的 `pageLibrary` 槽位登记逻辑名；页面库没有 `basePath`。
3. Domain 只静态导入 `<page-library>/contract`，页面实现必须通过 `ctx.loadPageLibrary(name, expose)` 加载。
4. Domain 自己持有路由、菜单、`applicationCode`、能力码映射和 `pageKey` 跳转映射。
5. 页面库通过 Props 接收 Client getter 和真实 `functionCodes`，不得自行读取 token、tenant 或创建鉴权 HTTP Client。
6. 契约发生破坏性变化时提升 `contractInfo.major`；宿主明确升级后才能加载。

运行 `bun run check:page-libraries` 检查架构边界。
