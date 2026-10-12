# 门面状态管理采用 Pinia

PC/H5 等门面的全局/跨域协作状态以 **Pinia** 为基线（与旧仓习惯连续）。Pinia 纳入骨架期 MF shared singleton 白名单（与 vue、vue-router 并列，见 ADR-0018），由门面提供 store 根，域不得再打第二份 pinia。骨架 PoC 可只用极少 store 证明共享；业务 store 随迁域增长。
