# 骨架期 MF shared 白名单仅核心运行时 singleton

Module Federation `shared` 在骨架期强制 singleton 的最小核为：**vue**、**vue-router**、**pinia**（Pinia 已定为门面状态基线，见 ADR-0019）。目标是杜绝双 Vue / 双 pinia 运行时。ant-design-vue / Vant 等 UI 库骨架期不进入 shared 白名单——与极薄 platform（ADR-0015）一致，待平台加厚时再决定「进 shared」或「仅由 platform remote 暴露」。白名单变更需显式 PR，禁止域私自扩大 shared。

**正交：`@module-federation/runtime` 本身**不靠本 ADR 的 `shared` 去重（已证伪）；各 remote 重复打入的 federation runtime 经 Vite external + 发版 CDN 单 URL 共享，见 ADR-0054。
