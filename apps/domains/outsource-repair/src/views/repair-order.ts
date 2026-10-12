/**
 * 委外工单（repairOrder）视图出口。
 *
 * 旧仓 `views/repair/repairOrder` 的列表与详情已迁移，但按迁移范围要求暂不在 `domain.ts`
 * 注册路由与菜单；宿主接入时直接引用这里的组件即可。委外维修单详情（repairList/details）
 * 体量较大，单独放在 `./repair-list-details`。
 */
export { OutsourceRepairOrderList } from "./repair-order-list";
export { OutsourceRepairOrderDetails } from "./repair-order-details";
