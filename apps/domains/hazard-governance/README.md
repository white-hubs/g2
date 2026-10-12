# 隐患治理（PC）

此包是 g2 PC 门户的 Federation Domain，路由前缀为 `/d/hazard-governance`。

本地联调应从仓库根目录运行：

```bash
bun run dev:full
```

打开 `http://localhost:5100/d/hazard-governance/hazard-workbench`。该命令会根据
`deploy/compositions/prod.pc.yaml` 启动 Shell、`hazardGovernanceClient` 和本 Domain；
不要单独打开 Domain 的 Vite 构建壳，因为它不包含门户鉴权、Composition 或 Client 装配。
