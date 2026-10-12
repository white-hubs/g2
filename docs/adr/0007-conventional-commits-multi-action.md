# 提交信息采用 Conventional Commits，并允许多 action 聚合

提交标题遵循两种合法形态（由 commitlint 或等价钩子校验）：

1. 单动作：`action(scope): description`  
   例：`feat(shell-pc): add composition loader`
2. 多动作：`{action1(scope1), action2(scope2)}: description`  
   例：`{feat(domain-fire), fix(platform-pc-ui)}: align shared vue singleton`

`action` 取 Conventional Commits 常用类型（至少含 `feat` / `fix` / `chore` / `docs` / `refactor` / `test` / `ci` / `build`；可按需扩展）。`scope` 对齐仓库角色短名（如 `shell-pc`、`domain-fire-management`、`platform-h5-auth`、`composition`、`tooling`、`repo`），不必写完整 npm scope。正文与 footer 可选；破坏性变更用 `BREAKING CHANGE:` 或 `action(scope)!:`。拒绝游离自由文案标题。
