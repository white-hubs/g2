# 骨架 inline/remote 样例域作为长期夹具保留

`@g2-domain/poc-inline-pc` 与 `@g2-domain/poc-remote-pc`（及后续 H5 对等夹具）定位为**长期装载夹具**，供本地演示、手册与 CI 冒烟证明 Composition Profile 双通道，而非业务域。门禁通过后不删除；真实业务域另波次迁入 `apps/domains/*`。禁止用真实旧域替代夹具来「顺便完成」骨架验收（与 ADR-0014 一致）。
