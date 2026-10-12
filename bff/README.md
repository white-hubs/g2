# `@g2-server/bff`

体验侧 BFF（自旧仓 `cube-gateway-server` 迁入）。实现 `@g2-contract/*` Gateway，经 `/gw-bff/*` 暴露。

## 开发

```bash
bun install
bun --cwd=bff run dev
# 默认 PORT=3000；OAuth secret 等见 app.json / 环境变量（勿提交密钥）
```

## web-release（Docker）

已纳入 `deploy/docker-compose/docker-compose.yaml` 服务 `bff`；`bun run web-release:up` 会构建并拉起。gateway 默认 `BFF_UPSTREAM=http://bff:3000`。

```bash
# 构建挂载仓内 .npmrc（可用 NPMRC_FILE 覆盖；勿挂主机 ~/.npmrc）
bun run web-release:up
curl http://localhost:3030/health
curl -sI http://localhost:8080/gw-bff/ # via gateway → bff
```

在 `deploy/docker-compose/.env` 配置 `OAUTH_CLIENT_SECRET` 与下游 `BFF_OUAA_URL` 等（见 `.env.example`）。

风险管控代理还要求配置 `BFF_RISK_CONTROL_URL`，值为开河风险管控服务的根地址。BFF 会在该地址后拼接
`/risk-control/*`；不要填写 Shell/Gateway 站点根地址，否则请求会命中前端 HTML fallback。未配置时接口会明确返回
`503`，不会伪装成空分页。

## 测试

```bash
bun --cwd=bff test
```
