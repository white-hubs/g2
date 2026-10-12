/** 隐患业务节点列表当前可执行动作。 */
export enum HazardActionCode {
  /** 确认属实。 */
  CONFIRM = "CONFIRM",
  /** 查看。 */
  VIEW = "VIEW",
  /** 催办。 */
  URGE = "URGE",
  /** 审批。 */
  APPROVAL = "APPROVAL",
  /** 误报。 */
  FALSE_REPORT = "FALSE_REPORT",
  /** 填写方案。 */
  FILL_PLAN = "FILL_PLAN",
  /** 更新进度。 */
  UPDATE_PROGRESS = "UPDATE_PROGRESS",
  /** 验收。 */
  ACCEPTANCE = "ACCEPTANCE",
}

/** AI 隐患识别调用结果。 */
export enum HazardAiRecognitionCallResult {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

/** AI 隐患分类生成调用结果。 */
export enum HazardAiCategoryGenerationCallResult {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

/** 隐患来源类型。 */
export enum HazardSourceType {
  /** AI视频巡检。*/
  AI_WARNING = "AI_WARNING",
  /** IOT告警。 */
  IOT_ALARM = "IOT_ALARM",
  /** 巡检。 */
  INSPECTION = "INSPECTION",
  /** AI图片识别。 */
  AI_IMAGE_RECOGNITION = "AI_IMAGE_RECOGNITION",
  /** 人员录入。 */
  MANUAL = "MANUAL",
}

/** 隐患等级。 */
export enum HazardLevel {
  /** 一般。 */
  GENERAL = "GENERAL",
  /** 重大。 */
  MAJOR = "MAJOR",
  /** 特重大。 */
  CRITICAL = "CRITICAL",
}

/** 隐患治理状态。 */
export enum HazardGovernanceStatus {
  /** 待确认。 */
  PENDING_CONFIRM = "PENDING_CONFIRM",
  /** 待填写整改方案。 */
  PENDING_PLAN = "PENDING_PLAN",
  /** 待审批。 */
  PENDING_APPROVAL = "PENDING_APPROVAL",
  /** 方案被退回。 */
  PLAN_REJECTED = "PLAN_REJECTED",
  /** 整改中。 */
  RECTIFYING = "RECTIFYING",
  /** 待验收。 */
  PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE",
  /** 验收不通过。 */
  ACCEPTANCE_REJECTED = "ACCEPTANCE_REJECTED",
  /** 误报。 */
  MISREPORTED = "MISREPORTED",
  /** 验收完成。 */
  ACCEPTANCE_COMPLETED = "ACCEPTANCE_COMPLETED",
}

/** 隐患待办类型。 */
export enum HazardTodoType {
  PENDING_CONFIRM = "PENDING_CONFIRM",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  PENDING_RECTIFICATION = "PENDING_RECTIFICATION",
  PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE",
}

/** 隐患看板排行维度。 */
export enum HazardDashboardRankingDimension {
  RISK_OBJECT = "RISK_OBJECT",
  RISK_UNIT = "RISK_UNIT",
  RESPONSIBLE_USER = "RESPONSIBLE_USER",
}

/** 隐患误报原因。 */
export enum HazardMisreportReason {
  /** 现场不存在隐患。 */
  NOT_HAZARD = "NOT_HAZARD",
  /** 重复上报。 */
  DUPLICATE_REPORT = "DUPLICATE_REPORT",
  /** 风险对象错误。 */
  WRONG_OBJECT = "WRONG_OBJECT",
  /** 测试数据。 */
  TEST_DATA = "TEST_DATA",
  /** 其他原因。 */
  OTHER = "OTHER",
}

/** 隐患验收根因编码。 */
export enum HazardAcceptanceRootCauseCode {
  /** 管理缺陷。 */
  MANAGEMENT_DEFECT = "MANAGEMENT_DEFECT",
  /** 制度缺失。 */
  SYSTEM_DEFICIENCY = "SYSTEM_DEFICIENCY",
  /** 设备老化。 */
  EQUIPMENT_AGING = "EQUIPMENT_AGING",
  /** 培训不足。 */
  TRAINING_INSUFFICIENT = "TRAINING_INSUFFICIENT",
  /** 设计缺陷。 */
  DESIGN_DEFECT = "DESIGN_DEFECT",
  /** 不可抗力。 */
  FORCE_MAJEURE = "FORCE_MAJEURE",
  /** 人为违规。 */
  HUMAN_VIOLATION = "HUMAN_VIOLATION",
}
