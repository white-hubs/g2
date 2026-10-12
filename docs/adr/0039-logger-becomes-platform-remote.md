# Logger 演进形态定为 Platform remote，不是 static shared 也不是 MF shared 单例

`@g2-shared/logger`（ADR-0035 本轮最小可用形态）过了本轮 pc-auth 迁移窗口后，演进目标是 `@g2-platform/logger`——一个独立发版、经 MF remoteEntry 异步加载的 Platform，不维持 `@g2-shared/*`（静态打包进各消费者）的形态，也不通过扩大 ADR-0018 的 MF shared 单例白名单来解决。

驱动因素是"改一次、已加载的消费者都能拿到新版本，不用等各消费者自己重新构建发布"这个诉求——这与 ADR-0027 拆分 pc-chrome/pc-auth 等的判断标准（是否需要脱离发版周期独立热修）同源，且日志的"线上动态调级别/调整逻辑不想等发版"是这个诉求的直接体现。代价是接受一个可用性权衡：logger 作为 remote 意味着它依赖 MF remoteEntry 异步加载成功，若加载失败或遇到系统级故障，这段时期的日志不强求被结构化记录，退化为浏览器原生 console/网络错误即可，不为此单独设计本地兜底 logger。

`@g2-shared/*` vs `@g2-platform/*` 的通用判断标准（哪些库该走 remote 避免重建级联，哪些接受静态打包的重建代价）不在本决定里给出，留给独立的依赖治理专项。
