# 本地 Git 钩子采用 husky

使用 husky 挂载：`commit-msg` 校验 Conventional Commits（含多 action 花括号形态）；`pre-commit` 对暂存文件跑 `oxfmt` / `oxlint`（不做全仓扫描）。暂不引入 lefthook——当前规模与团队习惯下 husky 足够，避免并行钩子栈。CI 仍保留同等检查作为底线。
