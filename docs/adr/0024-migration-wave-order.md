# 迁域大波次顺序（骨架后）

在已决「骨架仅 PC、platform 先极薄、H5 后置」前提下，迁域顺序为：

1. PC 骨架门禁通过（ADR-0014）
2. fire-management 彩排（ADR-0023），不切默认入口
3. 关键 platform 加厚（如 antdv）与更多低耦合 PC 域交错推进
4. PC 门户域按业务线分批迁入；灰度切流单位与机制不在本 ADR 预设
5. 独立应用（standalone）单独评估迁入或并存策略
6. H5 门面与 H5 域（含 Bridge）
7. 客制以 remote + Profile 增量收口

不采用「先完整 W0 对齐全部旧 basic 再彩排」的刚性顺序。切流单位与回滚细节以 ADR-0025 为准——本波次顺序不把 Composition Profile 预设为既定切流机制，Profile 只是迁域/客制装配已有的能力，日后是否被选为切流单位属于 ADR-0025 界定的独立专项决策。
