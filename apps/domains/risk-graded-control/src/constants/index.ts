import type { RiskLevel, ObjectStatus, IdentificationStatus } from "@/types/risk";

export const APPLICATION_CODE = "RISK_GRADED_CONTROL";
export const TABLE_PAGE_SIZE = 10;

/** 列表页编号列宽（适配 RA-2067073013229600770 等长编号） */
export const TABLE_CODE_COLUMN_WIDTH = 220;

/** 表单页输入框：不展示字数统计 */
export const FORM_INPUT_PROPS = {
  showCount: false,
} as const;

/** 列表页工具栏搜索框：不展示字数统计，放宽长度限制 */
export const LIST_SEARCH_INPUT_PROPS = {
  showCount: false,
  maxlength: 100,
} as const;

/** 列表页工具栏筛选下拉框 */
export const LIST_FILTER_SELECT_CLASS = "toolbar-filter-select";
export const LIST_FILTER_SELECT_WIDTH = "160px";

/** 列表页操作列链接按钮（主题色，非 danger） */
export const LIST_ACTION_LINK_PROPS = {
  type: "link" as const,
  size: "small" as const,
  class: "listActionLink",
};

/** 列表页删除操作（红色 danger） */
export const LIST_ACTION_DELETE_PROPS = {
  type: "link" as const,
  size: "small" as const,
  danger: true as const,
};

/** 弹窗内容区限高，避免整窗超出视口导致底部按钮被裁切 */
export const RISK_MODAL_BODY_STYLE = {
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto" as const,
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  MAJOR: "重大风险",
  SIGNIFICANT: "较大风险",
  GENERAL: "一般风险",
  LOW: "低风险",
};

export const RISK_LEVEL_COLOR: Record<RiskLevel, string> = {
  MAJOR: "red",
  SIGNIFICANT: "orange",
  GENERAL: "gold",
  LOW: "blue",
};

export const OBJECT_STATUS_LABEL: Record<ObjectStatus, string> = {
  DRAFT: "辨识中",
  PENDING_REVIEW: "待审核",
  INHERENT_EVAL: "固有评估",
  INNATE_EVAL: "固有评估",
  CONTROL_EVAL: "控制评估",
  CONTROL_SET: "管控配置",
  EXECUTING: "措施执行中",
  ACTIVE: "管控中",
  RE_EVAL: "待复评",
};

export const IDENTIFICATION_STATUS_LABEL: Record<IdentificationStatus, string> = {
  PENDING: "待辨识",
  IDENTIFYING: "辨识中",
  PENDING_REVIEW: "待审核",
  REVIEWED: "已审核",
};

export const WARNING_SIGN_TYPES = ["警告", "禁止", "指令", "提示"] as const;
export const CONTROL_TYPES = ["工程技术", "管理", "培训教育", "个体防护", "应急处置", "其他"] as const;
export const CONTROL_LEVELS = ["公司级", "部门级", "班组级", "岗位级"] as const;
export const ACCIDENT_TYPES = ["火灾", "爆炸", "中毒窒息", "触电", "机械伤害", "高处坠落", "物体打击", "灼烫", "其他"] as const;
export const PLAN_CYCLES = [
  { label: "月度", value: "MONTH" },
  { label: "季度", value: "QUARTER" },
  { label: "半年", value: "HALF_YEAR" },
  { label: "年度", value: "YEAR" },
] as const;

/** file-service 场景码（与后端 FILE_SCENE_CODE 一致） */
export const FILE_SCENE_CODE = {
  WARNING_SIGN_ICON: "RISK::CONTROL_WARNING_SIGN_ICON",
  MEASURE_EXECUTION_ATTACHMENT: "RISK::CONTROL_MEASURE_EXECUTION_ATTACHMENT",
  AI_IDENTIFICATION_PHOTO: "RISK::CONTROL_AI_IDENTIFICATION_PHOTO",
} as const;

/** file-service variable（bucket） */
export const FILE_BUCKET = "risk-control";

/** 措施执行反馈附件上限 */
export const MAX_MEASURE_EXECUTION_ATTACHMENTS = 9;
