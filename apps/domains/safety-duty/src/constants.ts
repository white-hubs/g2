export const TABLE_PAGE_SIZE = 10;

export const DUTY_RECORD_ATTACHMENT_SCENE_CODE = "SAFETY_PERSONNEL::DUTY_RECORD_ATTACHMENT";

export const INDUSTRY_OPTIONS = [
  { value: "INDUSTRY_TRADE", label: "工贸行业" },
  { value: "CHEMICAL", label: "危化行业" },
  { value: "WHOLESALE_MARKET", label: "批发市场" },
];

export const PERIOD_OPTIONS = [
  { value: "MONTH", label: "月度" },
  { value: "QUARTER", label: "季度" },
  { value: "YEAR", label: "年度" },
];

export const SIGN_STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "UNSIGNED", label: "待签收" },
  { value: "SIGNED", label: "已签收" },
];

export const ITEM_STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "PENDING", label: "待执行" },
  { value: "COMPLETED", label: "已完成" },
  { value: "OVERDUE", label: "超期" },
];

export const REPORT_STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "GENERATING", label: "生成中" },
  { value: "GENERATED", label: "已生成" },
  { value: "FAILED", label: "生成失败" },
];

export const REPORT_METHOD_OPTIONS = [
  { value: "", label: "全部" },
  { value: "AUTO", label: "系统自动" },
  { value: "MANUAL", label: "手动生成" },
];

export const SCORE_LEVELS = ["A", "B", "C", "D"];

export const NOTIFY_TARGET_TYPES = [
  { value: "LEGAL_ROLE", label: "法定角色" },
  { value: "POSITION", label: "岗位/职位" },
  { value: "DEPARTMENT", label: "部门" },
  { value: "USER", label: "人员" },
];
