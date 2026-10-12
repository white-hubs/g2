/** 委外工单状态与处理结果枚举，文案取自旧 `views/repair/repairOrder/list.vue`。 */

export type TicketStatusTone = "audit" | "normal";

export const TICKET_STATUS_TEXT: Record<string, { label: string; tone: TicketStatusTone }> = {
  WAIT_RECEIVE: { label: "待接收", tone: "audit" },
  WAIT_HANDLE: { label: "待处理", tone: "audit" },
  WAIT_ACCEPTANCE: { label: "待验收", tone: "audit" },
  COMPLETED: { label: "已结束", tone: "normal" },
};

export const TICKET_HANDLE_RESULT_TEXT: Record<string, string> = {
  RECEIVE: "接收工单",
  RESOLVED: "已解决",
  REFUSE: "拒绝工单",
  UNSOLVED: "未解决",
  ACCEPTANCE_SUCCESS: "验收成功",
  ACCEPTANCE_FAIL: "验收失败",
};

/** 旧页状态 Tab：全部任务 + 四个状态。 */
export const TICKET_STATUS_TABS = [
  { value: "all", label: "全部任务" },
  { value: "WAIT_RECEIVE", label: "待接收" },
  { value: "WAIT_HANDLE", label: "待处理" },
  { value: "WAIT_ACCEPTANCE", label: "待验收" },
  { value: "COMPLETED", label: "已结束" },
];
