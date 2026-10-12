# Monorepo 工具链采用 Bun + Turborepo

包管理与 workspaces 用 Bun（含 catalog 习惯与旧仓连续）；跨包任务编排与缓存用 Turborepo。不采用 pnpm（行业 monorepo 众数地基）以免叠第二套包管理迁移；不在 P0 引入 Nx（边界/generator 更强，但骨架期税高，与双门面+MF PoC 抢注意力）。域互引等结构禁令另以 lint/CI 补齐；是否在 P3 前评估 Nx 另议，不阻塞本决策。
