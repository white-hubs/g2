# 骨架 PoC 硬门禁：PC 门面三件套（platform + inline + remote）

骨架阶段先只锁定 PC 装载模型，硬门禁为：① `@g2-shell/pc` 按 Composition Profile 装载 1 个 platform + 1 个 inline 域 + 1 个 remote 域；② 仅更新 platform 产物或 Profile 清单指针即可热修，业务样例域无需重编；③ 增删 remote 不修改壳源码。不在同一次门禁内强制 H5 双通道并行，也不强制迁入真实旧域——二者作为后续波次，避免「定装载」与「迁域/双门面」搅在一起。验收以人工本地/环境验证为主（见 ADR-0011）。
