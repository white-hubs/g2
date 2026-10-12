# 新仓严格 greenfield，禁止依赖旧仓 workspace

g2 从零搭建双门面与契约；旧仓 ghcloud 仅作迁移源与对照。禁止以 workspace / path 依赖旧仓包；平台能力在新仓以 Platform remote 重建，迁域是搬代码而非链旧仓。曾考虑过渡期软链接或双仓长期互引，均会把旧巨石耦合拖进新壳演进基线，故否决。
