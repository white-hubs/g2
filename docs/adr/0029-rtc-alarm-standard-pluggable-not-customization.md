# RTC 通话是标准可拔插能力，本轮必须真实落地

`pc-rtc`（RTC / 融合通讯通话）不是客制（Customization）——它是产品标准功能的一部分，只是按 Composition Profile 配置决定是否装载。迁移验收时必须让它真实可用，不能因为「按需开关」被当作可以留空或做成假 stub。

**后续变更（ADR-0062）**：实时报警弹窗（租户 / 总部）**不再**由 `pc-rtc` 承载，改落独立 Platform `@g2-platform/pc-alarm-popup`。ADR-0027/本文初版把「通话 + 报警弹窗」打进同一包，依据是宿主拆分时的发版打包，不是领域归属；以 ADR-0062 为准。报警弹窗点详情走 `navigate-intent` 的 `code` + `entry`，且须与目标 Domain 应用码匹配（见 ADR-0062），不再经 `pc-rtc` 转发、也不用 portal path 兜底。
