# Lint/格式化仅用 oxlint + oxfmt；禁止 ESLint/Prettier；关闭 categories

诊断与格式化固定为 oxc 系：`oxlint` + `oxfmt`。规则从旧仓（ghcloud）迁移并允许整合精简，配置形态对齐 `cube-ai-project`：`.oxlintrc` 中 **全部 `categories` 设为 `off`**，只通过显式 `rules` 开启条目，避免升级 oxlint 时类别默认规则漂移。仓库内禁止引入或残留 `eslint`、`prettier` 及其配置/依赖/脚本/忽略文件（含 `@typescript-eslint`、`eslint-config-*`、`.prettierrc*`、`.eslintrc*` 等）；CI 与脚手架须校验不得再出现。不采用 Biome 或其它并行 lint/format 栈。
