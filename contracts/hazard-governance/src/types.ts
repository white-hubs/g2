import type {
  HazardActionCode,
  HazardAcceptanceRootCauseCode,
  HazardAiCategoryGenerationCallResult,
  HazardAiRecognitionCallResult,
  HazardDashboardRankingDimension,
  HazardGovernanceStatus,
  HazardLevel,
  HazardMisreportReason,
  HazardSourceType,
  HazardTodoType,
} from "./enums";

export type HazardTypeRuleDefaultLevel = HazardLevel;

export interface HazardCategoryTreeVO {
  /** 分类ID。 */
  id: string;
  /** 分类编码。 */
  code?: string;
  /** 分类名称。 */
  name: string;
  /** 父分类ID。 */
  parentId?: string;
  /** 分类树路径。 */
  treePath?: string;
  /** 分类层级。 */
  treeLevel?: number;
  /** 排序号。 */
  sortNo?: number;
  /** 默认隐患等级。 */
  defaultLevel?: HazardTypeRuleDefaultLevel | string;
  /** 审批模板ID。 */
  approvalTemplateId?: string;
  /** 审批模板名称。 */
  approvalTemplateName?: string;
  /** 默认整改时限，单位小时。 */
  defaultDeadlineHours?: number;
  /** 验收退回升级阈值。 */
  acceptanceRejectThreshold?: number;
  /** AI场景编码。 */
  aiSceneCode?: string;
  /** 是否启用。 */
  enabled?: boolean;
  /** 是否要求填写临时管控措施。 */
  temporaryControlRequired?: boolean;
  /** 是否要求上传方案附件。 */
  planAttachmentRequired?: boolean;
  /** 子分类列表。 */
  children?: HazardCategoryTreeVO[];
}

export interface HazardCategoryCommand {
  /** 分类名称。 */
  name: string;
  /** 父分类ID，根节点为0。 */
  parentId?: string;
  /** 排序号。 */
  sortNo?: number;
  /** 默认隐患等级，三级分类必填。 */
  defaultLevel?: HazardTypeRuleDefaultLevel;
  /** 审批模板ID，三级分类必填。 */
  approvalTemplateId?: string;
  /** 默认整改时限，单位小时，三级分类必填。 */
  defaultDeadlineHours?: number;
  /** 验收退回升级阈值，三级分类必填。 */
  acceptanceRejectThreshold?: number;
  /** AI场景编码。 */
  aiSceneCode?: string | undefined;
  /** 是否启用。 */
  enabled?: boolean;
}

export interface HazardCategoryBatchItemCommand extends HazardCategoryTreeVO {
  /** 分类名称。 */
  name: string;
  /** 子分类。 */
  children?: HazardCategoryBatchItemCommand[];
}

export interface HazardCategoryBatchCreateCommand {
  /** 分类树列表。 */
  categories: HazardCategoryBatchItemCommand[];
}

export interface HazardApprovalTemplateNodeCommand {
  /** 节点名称。 */
  nodeName: string;
  /** 节点顺序号。 */
  sequenceNo: number;
  /** 审批人ID。 */
  approverId: string;
  /** 审批人类型。 */
  approverType: "ROLE" | "USER";
  /** 审批人类型值。 */
  approverTypeValue: string;
}

export interface HazardApprovalTemplateCommand {
  /** 模板名称。 */
  name: string;
  /** 审批节点列表。 */
  nodes: HazardApprovalTemplateNodeCommand[];
}

export interface HazardApprovalTemplateNodeVO {
  /** 节点ID。 */
  id?: string;
  /** 模板ID。 */
  templateId?: string;
  /** 模板版本号。 */
  templateVersion?: number;
  /** 节点名称。 */
  nodeName: string;
  /** 节点顺序号。 */
  sequenceNo: number;
  /** 审批人ID。 */
  approverId?: string;
  /** 审批人类型。 */
  approverType?: "ROLE" | "USER" | string;
  /** 审批人类型值。 */
  approverTypeValue?: string;
  /** 旧版审批人配置值。 */
  approverValue?: string;
}

export interface HazardApprovalTemplateVO {
  /** 模板ID。 */
  id: string;
  /** 模板名称。 */
  name: string;
  /** 是否内置模板。 */
  builtIn?: boolean;
  /** 当前模板版本号。 */
  version?: number;
  /** 审批节点列表。 */
  nodes: HazardApprovalTemplateNodeVO[];
}

export interface HazardApprovalTemplatePageParams {
  pageNumber: number;
  pageSize: number;
  /** 模板名称。 */
  name?: string;
}

export interface HazardRecordPageBaseParams {
  pageNumber: number;
  pageSize: number;
  /** 关键字，匹配编号或隐患描述。 */
  keyword?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel;
}

export interface HazardLedgerPageParams extends HazardRecordPageBaseParams {
  /** 治理状态。 */
  governanceStatus?: HazardGovernanceStatus;
  /** 来源类型。 */
  sourceType?: HazardSourceType;
  /** 时间范围，开始时间与结束时间用英文逗号拼接。 */
  period?: string;
}

export interface HazardLedgerRecordVO {
  /** 隐患ID。 */
  id: string | number;
  /** 审批任务ID。 */
  approvalTaskId?: string | number;
  /** 隐患编号。 */
  code?: string;
  /** 隐患描述。 */
  description?: string;
  /** 位置名称。 */
  locationName?: string;
  longitude?: number;
  latitude?: number;
  riskUnitId?: string | number;
  riskUnitName?: string;
  riskObjectId?: string | number;
  riskObjectName?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
  /** 治理状态。 */
  governanceStatus?: HazardGovernanceStatus;
  /** 来源类型。 */
  sourceType?: HazardSourceType;
  /** 来源系统编码。 */
  sourceSystem?: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  /** 发现时间。 */
  reportedTime?: string;
  /** 是否超期。 */
  overdue?: boolean;
  /** 超期小时数。 */
  overdueHours?: number;
  /** 当前可执行动作集合。 */
  actions?: HazardActionCode[];
}

export interface HazardDetailBasicInfoVO extends HazardLedgerRecordVO {
  /** 现场图片。 */
  sceneImages?: FileVO[];
  /** 隐患分类ID。 */
  categoryId?: string | number;
  categoryIds?: (string | number)[];
  categoryPath?: (string | number)[];
  hazardCategoryId?: string | number;
  categoryName?: string;
  categoryNamePath?: string[];
  hazardCategoryName?: string;
  /** AI推荐的隐患分类ID。 */
  aiRecommendedCategoryId?: string | number;
  /** AI推荐的隐患分类名称。 */
  aiRecommendedCategoryName?: string;
  /** AI隐患识别记录ID。 */
  aiRecognitionRecordId?: string | number;
  /** AI隐患识别方式。 */
  aiRecognitionMode?: string;
  /** AI隐患识别方式名称。 */
  aiRecognitionModeName?: string;
  /** 验收人ID。 */
  acceptanceUserId?: string;
  /** 验收人名称。 */
  acceptanceUserName?: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours?: number;
  /** 来源事件ID。 */
  sourceEventId?: string;
  /** 上报人ID。 */
  reporterId?: string;
  /** 上报人名称。 */
  reporterName?: string;
  /** 确认人ID。 */
  confirmUserId?: string;
  /** 确认人名称。 */
  confirmUserName?: string;
  /** 确认属实时间。 */
  confirmedTime?: string;
  /** 整改截止时间。 */
  deadline?: string;
  /** 最近提交验收时间。 */
  rectificationSubmittedTime?: string;
  /** 闭环时间。 */
  closedTime?: string;
  /** 最终根因编码。 */
  rootCauseCode?: HazardAcceptanceRootCauseCode | string;
  /** 是否已延期。 */
  extensionUsed?: boolean;
  /** 延期小时数。 */
  extensionHours?: number;
  /** 验收退回次数。 */
  acceptanceRejectCount?: number;
  /** 最新整改进度。 */
  latestProgressPercent?: number;
  /** AI处置建议记录ID。 */
  aiSuggestionRecordId?: string | number;
  /** AI处置建议富文本。 */
  aiDisposalSuggestion?: string;
  /** AIAI验收建议记录ID。 */
  aiAcceptanceSuggestionRecordId?: string | number;
  /** AI验收建议富文本。 */
  aiAcceptanceSuggestion?: string;
  /** 隐患版本号。 */
  version?: number;
}

export interface HazardRectificationProgressVO extends HazardLedgerRecordVO {
  /** 隐患记录基本信息。 */
  basicInfo?: HazardDetailBasicInfoVO;
  /** 进度记录ID。 */
  id: string | number;
  /** 隐患ID。 */
  hazardId?: string | number;
  /** 验收人ID。 */
  acceptanceUserId?: string;
  /** 验收人名称。 */
  acceptanceUserName?: string;
  /** 确认属实时间。 */
  confirmedTime?: string;
  /** 整改截止时间。 */
  deadline?: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours?: number;
  /** 剩余小时数。 */
  remainingHours?: number;
  /** 已审批方案。 */
  approvedPlan?: HazardRectificationPlanVO;
  /** 方案ID。 */
  planId?: string | number;
  /** 整改进度百分比。 */
  progressPercent?: number;
  /** 进度内容。 */
  progressContent?: string;
  /** 记录人ID。 */
  recordUserId?: string;
  /** 记录人名称。 */
  recordUserName?: string;
  /** 记录时间。 */
  recordTime?: string;
  /** 整改后照片。 */
  afterImages?: FileVO[];
  /** 历史整改进度记录。 */
  progressRecords?: HazardRectificationProgressVO[];
}

export interface HazardRectificationPlanCommand {
  /** 整改内容。 */
  rectificationContent?: string;
  /** 整改措施。 */
  rectificationMeasures?: string;
  /** 临时管控措施。 */
  temporaryControlMeasures?: string;
  /** 方案附件文件ID，多个用英文逗号分隔。 */
  planAttachments?: string;
  /** 整改前照片文件ID，多个用英文逗号分隔；传入时会覆盖隐患记录现场图片。 */
  sceneImages?: string;
}

export interface HazardRectificationProgressCommand {
  /** 整改进度百分比，取值0-100。 */
  progressPercent: number;
  /** 进度内容。 */
  progressContent: string;
  /** 整改后照片文件ID，多个用英文逗号分隔。 */
  progressImages: string;
}

export interface HazardProcessLogVO {
  /** 日志ID。 */
  id?: string | number;
  /** 处理节点/动作标题。 */
  title?: string;
  /** 处理动作编码。 */
  action?: string;
  /** 处理动作名称。 */
  actionName?: string;
  /** 节点名称。 */
  nodeName?: string;
  /** 节点编码。 */
  nodeKey?: string;
  /** 处理人ID。 */
  operatorId?: string;
  /** 处理人名称。 */
  operatorName?: string;
  /** 处理人角色名称。 */
  operatorRoleName?: string;
  /** 处理时间。 */
  operatedTime?: string;
  /** 操作时间。 */
  operationTime?: string;
  /** 处理说明。 */
  content?: string;
  /** 操作说明。 */
  description?: string;
  /** 备注。 */
  remark?: string;
  /** 审批/验收意见。 */
  opinion?: string;
  /** 当前日志状态。 */
  status?: string;
  /** 状态名称。 */
  statusName?: string;
}

export interface HazardOperationLogVO extends HazardProcessLogVO {
  /** 节点编码。 */
  nodeKey?: string;
  /** 节点名称。 */
  nodeName?: string;
  /** 操作人ID。 */
  operatorId?: string;
  /** 操作人名称。 */
  operatorName?: string;
  /** 操作时间。 */
  operationTime?: string;
  /** 操作说明。 */
  description?: string;
}

export interface HazardAcceptanceInfoVO {
  /** 验收人ID。 */
  acceptanceUserId?: string;
  /** 验收人名称。 */
  acceptanceUserName?: string;
  /** 提交验收时间。 */
  submittedTime?: string;
  /** 闭环时间。 */
  closedTime?: string;
  /** 最终根因编码。 */
  rootCauseCode?: HazardAcceptanceRootCauseCode | string;
  /** 验收退回次数。 */
  rejectCount?: number;
  /** AI验收建议记录ID。 */
  aiAcceptanceSuggestionRecordId?: string | number;
  /** AI验收建议富文本。 */
  aiAcceptanceSuggestion?: string;
  /** AI验收置信度。 */
  aiAcceptanceConfidence?: number;
  /** AI验收建议状态。 */
  aiAcceptanceSuggestionStatus?: "RECOGNIZING" | "SUCCESS" | "FAILED" | string;
}

export interface HazardDetailProcessInfoVO {
  /** 当前整改方案。 */
  currentPlan?: HazardRectificationPlanVO;
  /** 验收信息。 */
  acceptanceInfo?: HazardAcceptanceInfoVO;
  /** 整改进度记录。 */
  progressRecords?: HazardRectificationProgressVO[];
  /** 审批任务摘要。 */
  approvalTasks?: HazardApprovalTaskSummaryVO[];
  /** 处理过程/操作日志。 */
  operationLogs?: HazardOperationLogVO[];
}

export interface HazardGovernanceStatusStepVO {
  /** 治理状态。 */
  status?: HazardGovernanceStatus | string;
  /** 状态名称。 */
  name?: string;
  /** 是否当前主流程节点。 */
  current?: boolean;
  /** 是否已流转到该节点。 */
  reached?: boolean;
}

export interface HazardDetailVO {
  /** 基本信息。 */
  basicInfo?: HazardDetailBasicInfoVO;
  /** 处理过程。 */
  processInfo?: HazardDetailProcessInfoVO;
  /** 当前治理状态。 */
  currentStatus?: HazardGovernanceStatus | string;
  /** 当前治理状态名称。 */
  currentStatusName?: string;
  /** 整改闭环主流程状态列表。 */
  statusSteps?: HazardGovernanceStatusStepVO[];
}

export interface FileVO {
  /** 主键 */
  id: string | number;
  /** 文件名 */
  name?: string;
  /** 文件名后缀 */
  suffix?: string;
  /** URL地址 */
  path?: string;
  /** 文件大小 */
  size?: number;
  /** 关联数量 */
  refCount?: number;
  /** 文件类型 */
  type?: string;
  /** 业务主键 */
  businessKey?: string | number | null;
  /** 内网地址 */
  endpointPath?: string;
  createTime?: string;
}

export interface HazardPendingConfirmationCreateCommand {
  /** 现场图片文件ID，多个用英文逗号分隔。 */
  sceneImages?: string;
  /** 隐患描述。 */
  description: string;
  /** 来源类型。 */
  sourceType: HazardSourceType;
  /** 应用编码。 */
  applicationCode?: string;
  /** 来源事件ID（业务键）。 */
  sourceEventId?: string;
  /** AI推荐的隐患分类ID。 */
  aiRecommendedCategoryId?: string | number;
  /** AI隐患识别分析记录ID。 */
  aiRecognitionRecordId?: string | number;
  /** 风险单元ID。 */
  riskUnitId?: string | number;
  /** 风险对象ID。 */
  riskObjectId?: string | number;
  /** 位置名称。 */
  locationName?: string;
  /** 经度。 */
  longitude?: number;
  /** 纬度。 */
  latitude?: number;
  /** 隐患分类ID。 */
  categoryId: string | number;
}

export interface HazardAiRecognitionCommand {
  /** 现场照片文件ID。 */
  fileId?: string;
  /** 隐患描述。 */
  description?: string;
}

export interface HazardAiRecognitionResultVO {
  /** AI推荐的隐患分类ID。 */
  aiRecommendedCategoryId?: string | number;
  /** AI推荐的隐患分类名称。 */
  aiRecommendedCategoryName?: string;
  /** 隐患类型ID。 */
  hazardTypeId?: string | number;
  /** 隐患类型名称。 */
  hazardTypeName?: string;
  /** AI生成或识别出的隐患描述。 */
  description?: string;
  /** @deprecated 请使用 description。 */
  hazardDescription?: string;
  /** 处置建议。 */
  disposalSuggestion?: string;
}

export interface HazardAiRecognitionVO {
  /** AI分析记录ID。 */
  analysisRecordId?: string | number;
  /** AI识别出的隐患列表。 */
  hazards?: HazardAiRecognitionResultVO[];
  /** AI生成或识别出的隐患描述。 */
  description?: string;
  /** @deprecated 请使用 description。 */
  hazardDescription?: string;
  /** @deprecated 请使用 description。 */
  generatedDescription?: string;
  /** 调用结果。 */
  callResult?: HazardAiRecognitionCallResult;
  /** 失败原因。 */
  failureReason?: string;
  /** 完成时间。 */
  completedTime?: string;
  /** 调用花费时间，单位毫秒。 */
  costTimeMillis?: number;
}

export interface HazardAiCategoryGenerationCommand {
  /** 所属行业。 */
  industryName: string;
}

export interface HazardAiCategoryGenerationVO {
  /** AI分析记录ID。 */
  analysisRecordId?: string | number;
  /** 生成的分类树。 */
  categories?: HazardCategoryTreeVO[];
  /** 调用结果。 */
  callResult?: HazardAiCategoryGenerationCallResult;
  /** 失败原因。 */
  failureReason?: string;
  /** 完成时间。 */
  completedTime?: string;
  /** 调用花费时间，单位毫秒。 */
  costTimeMillis?: number;
}

export interface HazardConfirmCommand {
  /** 现场图片文件ID，多个用英文逗号分隔。 */
  sceneImages?: string;
  /** 隐患描述。 */
  description: string;
  /** 风险单元ID。 */
  riskUnitId?: string;
  /** 风险对象ID。 */
  riskObjectId?: string;
  /** 位置名称。 */
  locationName?: string;
  /** 经度。 */
  longitude?: number;
  /** 纬度。 */
  latitude?: number;
  /** 隐患分类ID。 */
  categoryId: string;
  /** 隐患等级。 */
  level: HazardTypeRuleDefaultLevel;
  /** 整改负责人ID。 */
  responsibleUserId: string;
  /** 验收人ID。 */
  acceptanceUserId: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours: number;
}

export interface HazardMisreportCommand {
  /** 隐患记录ID。 */
  hazardId: string | number;
  /** 误报原因。 */
  misreportReason: HazardMisreportReason;
}

export interface HazardPendingConfirmationRecordVO {
  /** 隐患ID。 */
  id: string | number;
  /** 隐患编号。 */
  code?: string;
  /** 现场图片。 */
  sceneImages?: FileVO[];
  /** 隐患描述。 */
  description?: string;
  /** 来源类型。 */
  sourceType?: HazardSourceType;
  /** 风险单元ID。 */
  riskUnitId?: string | number;
  /** 风险对象ID。 */
  riskObjectId?: string | number;
  /** 位置名称。 */
  locationName?: string;
  /** 经度。 */
  longitude?: number;
  /** 纬度。 */
  latitude?: number;
  /** 隐患分类ID。 */
  categoryId?: string | number;
  /** AI推荐的隐患分类ID。 */
  aiRecommendedCategoryId?: string | number;
  /** AI推荐的隐患分类名称。 */
  aiRecommendedCategoryName?: string;
  /** 隐患分类名称。 */
  categoryName?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
}

export interface HazardApprovalTaskPageParams extends HazardRecordPageBaseParams {
  /** 是否只看当前登录人的审批任务。 */
  ownOnly?: boolean;
}

export interface HazardApprovalTaskPageVO {
  approvalTaskId: string | number;
  approvalInstanceId?: string | number;
  hazardId?: string | number;
  planId?: string | number;
  code?: string;
  description?: string;
  level?: HazardTypeRuleDefaultLevel | string;
  submittedBy?: string;
  submittedByName?: string;
  /** @deprecated 请使用 submittedByName。 */
  submittedName?: string;
  submittedTime?: string;
  deadline?: string;
  overdue?: boolean;
  overdueHours?: number;
  remainingHours?: number;
  actions?: HazardActionCode[];
}

export interface HazardApprovalCommand {
  /** 审批意见。 */
  opinion?: string;
  /** 原因编码。 */
  reasonCode?: string;
}

export interface HazardRectificationPlanVO {
  /** 方案ID。 */
  id?: string | number;
  /** 隐患ID。 */
  hazardId?: string | number;
  /** 方案版本号。 */
  versionNo?: number;
  /** 方案状态。 */
  status?: string;
  /** 整改内容。 */
  rectificationContent?: string;
  /** 整改措施。 */
  rectificationMeasures?: string;
  /** 临时管控措施。 */
  temporaryControlMeasures?: string;
  /** 预计完成时间。 */
  estimatedFinishTime?: string;
  /** AI建议记录ID。 */
  aiSuggestionRecordId?: string | number;
  /** 审批实例ID。 */
  approvalInstanceId?: string | number;
  /** 提交人ID。 */
  submittedBy?: string;
  /** 提交人名称。 */
  submittedByName?: string;
  /** 提交人名称。 */
  submittedName?: string;
  /** 提交时间。 */
  submittedTime?: string;
  /** 审批通过时间。 */
  approvedTime?: string;
  /** 驳回原因编码。 */
  rejectReasonCode?: string;
  /** 驳回说明。 */
  rejectRemark?: string;
  /** 方案版本号，用于并发控制。 */
  version?: number;
  /** 方案附件列表。 */
  attachments?: FileVO[];
  /** 整改前照片。 */
  sceneImages?: FileVO[];
  /** AI处置建议记录ID。 */
  aiDisposalSuggestionRecordId?: string | number;
  /** AI处置建议富文本。 */
  aiDisposalSuggestion?: string;
  /** AI处置建议状态。 */
  aiDisposalSuggestionStatus?: "RECOGNIZING" | "SUCCESS" | "FAILED" | string;
}

export interface HazardAttachmentVO {
  /** 附件ID。 */
  id?: string | number;
  /** 隐患ID。 */
  hazardId?: string | number;
  /** 业务记录ID。 */
  businessId?: string | number;
  /** 业务类型。 */
  businessType?: string;
  /** 附件类型。 */
  attachmentType?: string;
  /** 文件服务ID。 */
  fileId?: string;
  /** 文件名称。 */
  fileName?: string;
  /** 文件大小。 */
  fileSize?: number;
  /** 排序号。 */
  sortNo?: number;
}

export type HazardApprovalTaskStatus = "PENDING" | "WAITING" | "APPROVED" | "REJECTED";

export interface HazardApprovalTaskSummaryVO {
  /** 审批任务ID。 */
  id?: string | number;
  /** 审批实例ID。 */
  approvalInstanceId?: string | number;
  /** 节点顺序号。 */
  sequenceNo?: number;
  /** 节点名称。 */
  nodeName?: string;
  /** 角色名称。 */
  roleName?: string;
  /** 审批人ID。 */
  approverId?: string;
  /** 审批人名称。 */
  approverName?: string;
  /** 人员姓名。 */
  personName?: string;
  /** 任务状态。 */
  status?: HazardApprovalTaskStatus | string;
  /** 激活时间。 */
  activatedTime?: string;
  /** 完成时间。 */
  completedTime?: string;
}

export interface HazardApprovalRouteVO {
  /** 路由名称。 */
  routeName?: string;
  /** 是否已触发。 */
  triggered?: boolean;
  /** 说明。 */
  remark?: string;
}

export type HazardApprovalAction = "SUBMIT" | "APPROVE" | "REJECT";

export interface HazardApprovalRecordVO {
  /** 审批记录ID。 */
  id?: string | number;
  /** 审批实例ID。 */
  approvalInstanceId?: string | number;
  /** 审批任务ID。 */
  approvalTaskId?: string | number;
  /** 审批动作。 */
  action?: HazardApprovalAction;
  /** 操作人ID。 */
  operatorId?: string;
  /** 操作人名称。 */
  operatorName?: string;
  /** 审批意见。 */
  opinion?: string;
  /** 原因编码。 */
  reasonCode?: string;
  /** 操作时间。 */
  operatedTime?: string;
}

export interface HazardApprovalDetailVO {
  /** 审批任务ID。 */
  approvalTaskId: string | number;
  /** 审批实例ID。 */
  approvalInstanceId?: string | number;
  /** 当前审批任务状态。 */
  taskStatus?: string;
  /** 当前审批人ID。 */
  approverId?: string;
  /** 当前审批人名称。 */
  approverName?: string;
  /** 当前用户是否可以审批。 */
  canApprove?: boolean;
  /** 当前可执行动作集合。 */
  actions?: HazardActionCode[];
  /** 隐患ID。 */
  hazardId?: string | number;
  /** 隐患编号。 */
  code?: string;
  /** 隐患描述。 */
  description?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
  /** 位置名称。 */
  locationName?: string;
  /** 经度。 */
  longitude?: number;
  /** 纬度。 */
  latitude?: number;
  /** 整改截止时间。 */
  deadline?: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours?: number;
  /** 提交人ID。 */
  submittedBy?: string;
  /** 提交人名称。 */
  submittedByName?: string;
  /** @deprecated 请使用 submittedByName。 */
  submittedName?: string;
  /** 提交时间。 */
  submittedTime?: string;
  /** 整改方案。 */
  plan?: HazardRectificationPlanVO;
  /** 整改前照片。 */
  sceneImages?: HazardAttachmentVO[];
  /** 方案附件。 */
  planAttachments?: HazardAttachmentVO[];
  /** 审批链。 */
  approvalChain?: HazardApprovalTaskSummaryVO[];
  /** 条件路由。 */
  conditionRoutes?: HazardApprovalRouteVO[];
  /** 审批历史。 */
  approvalHistory?: HazardApprovalRecordVO[];
}

export interface HazardAcceptanceTaskPageParams extends HazardRecordPageBaseParams {
  /** 是否只看当前登录人的验收任务。 */
  ownOnly?: boolean;
}

export interface HazardAcceptanceTaskPageVO {
  id: string | number;
  code?: string;
  description?: string;
  level?: HazardTypeRuleDefaultLevel | string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  acceptanceUserId?: string;
  acceptanceUserName?: string;
  submittedTime?: string;
  deadline?: string;
  overdue?: boolean;
  overdueHours?: number;
  remainingHours?: number;
  actions?: HazardActionCode[];
}

export interface HazardAcceptanceCommand {
  /** 是否验收通过。 */
  accepted: boolean;
  /** 根因编码。 */
  rootCauseCode?: HazardAcceptanceRootCauseCode;
  /** 验收说明。 */
  opinion?: string;
}

export interface HazardAcceptanceDetailVO {
  /** 隐患记录基本信息。 */
  basicInfo?: HazardDetailBasicInfoVO;
  /** 隐患ID。 */
  id: string | number;
  /** 隐患编号。 */
  code?: string;
  /** 隐患描述。 */
  description?: string;
  /** 治理状态。 */
  governanceStatus?: HazardGovernanceStatus;
  /** 分类ID。 */
  categoryId?: string | number;
  /** 类型名称。 */
  typeName?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
  /** 位置名称。 */
  locationName?: string;
  /** 经度。 */
  longitude?: number;
  /** 纬度。 */
  latitude?: number;
  /** 整改责任人ID。 */
  responsibleUserId?: string;
  /** 整改责任人名称。 */
  responsibleUserName?: string;
  /** 验收人ID。 */
  acceptanceUserId?: string;
  /** 验收人名称。 */
  acceptanceUserName?: string;
  /** 整改截止时间。 */
  deadline?: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours?: number;
  /** 最近提交验收时间。 */
  rectificationSubmittedTime?: string;
  /** 闭环时间。 */
  closedTime?: string;
  /** 最终根因编码。 */
  rootCauseCode?: string;
  /** 验收退回次数。 */
  acceptanceRejectCount?: number;
  /** AI验收置信度。 */
  aiAcceptanceConfidence?: number;
  /** 是否超期。 */
  overdue?: boolean;
  /** 当前用户是否可以验收。 */
  canAccept?: boolean;
  /** 当前可执行动作集合。 */
  actions?: HazardActionCode[];
  /** AI建议记录ID。 */
  aiSuggestionRecordId?: string | number;
  /** AI处置建议富文本。 */
  aiDisposalSuggestion?: string;
  /** AI验收建议富文本。 */
  aiAcceptanceSuggestion?: string;
  /** 当前整改方案。 */
  currentPlan?: HazardRectificationPlanVO;
  /** 整改前照片。 */
  sceneImages?: FileVO[];
  /** 整改进度记录。 */
  progressRecords?: HazardRectificationProgressVO[];
}

export interface HazardRectificationTaskPageParams extends HazardRecordPageBaseParams {
  /** 治理状态。 */
  governanceStatus?: HazardGovernanceStatus;
  /** 分类ID。 */
  categoryId?: string | number;
  /** 风险对象ID。 */
  riskObjectId?: string | number;
  /** 整改责任人ID。 */
  responsibleUserId?: string;
  /** 截止时间开始。 */
  deadlineStart?: string;
  /** 截止时间结束。 */
  deadlineEnd?: string;
  /** 是否只看超期任务。 */
  overdueOnly?: boolean;
  /** 是否只看本人负责的任务。 */
  ownOnly?: boolean;
  /** 是否超期优先排序。 */
  overdueFirst?: boolean;
}

export interface HazardRectificationTaskVO {
  /** 隐患ID。 */
  id: string | number;
  /** 审批任务ID。 */
  approvalTaskId?: string | number;
  /** 隐患编号。 */
  code?: string;
  /** 治理状态。 */
  governanceStatus?: HazardGovernanceStatus;
  /** 隐患描述。 */
  description?: string;
  /** 位置名称。 */
  locationName?: string;
  /** 经度。 */
  longitude?: number;
  /** 纬度。 */
  latitude?: number;
  /** 风险单元ID。 */
  riskUnitId?: string | number;
  /** 风险单元名称。 */
  riskUnitName?: string;
  /** 风险对象ID。 */
  riskObjectId?: string | number;
  /** 风险对象名称。 */
  riskObjectName?: string;
  /** 类型名称。 */
  typeName?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
  /** 整改责任人ID。 */
  responsibleUserId?: string;
  /** 整改责任人名称。 */
  responsibleUserName?: string;
  /** 整改截止时间。 */
  deadline?: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours?: number;
  /** 截止时间展示标记。 */
  deadlineTag?: string;
  /** 是否超期。 */
  overdue?: boolean;
  /** 剩余小时数，负数表示已超期。 */
  remainingHours?: number;
  /** 是否已延期。 */
  extensionUsed?: boolean;
  /** 验收退回次数。 */
  acceptanceRejectCount?: number;
  /** 最新整改进度。 */
  latestProgressPercent?: number;
  /** 当前方案版本号。 */
  planVersionNo?: number;
  /** 当前方案状态。 */
  planStatus?: string;
  /** 当前方案提交时间。 */
  planSubmittedTime?: string;
  /** 当前可执行动作集合。 */
  actions?: HazardActionCode[];
}

export interface HazardRectificationDetailVO {
  /** 隐患ID。 */
  id: string | number;
  /** 隐患编号。 */
  code?: string;
  /** 隐患描述。 */
  description?: string;
  /** 治理状态。 */
  governanceStatus?: HazardGovernanceStatus;
  /** 分类ID。 */
  categoryId?: string | number;
  /** 分类名称。 */
  categoryName?: string;
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
  /** 整改责任人ID。 */
  responsibleUserId?: string;
  /** 验收人ID。 */
  acceptanceUserId?: string;
  /** 整改截止时间。 */
  deadline?: string;
  /** 整改时限，单位小时。 */
  rectificationDeadlineHours?: number;
  /** 是否已延期。 */
  extensionUsed?: boolean;
  /** 延期小时数。 */
  extensionHours?: number;
  /** 验收退回次数。 */
  acceptanceRejectCount?: number;
  /** 最新整改进度。 */
  latestProgressPercent?: number;
  /** 隐患版本号。 */
  version?: number;
  /** 是否超期。 */
  overdue?: boolean;
  /** 当前可执行动作集合。 */
  actions?: HazardActionCode[];
  /** 当前整改方案。 */
  currentPlan?: HazardRectificationPlanVO;
  /** 整改进度记录。 */
  progressRecords?: HazardRectificationProgressVO[];
  /** 审批任务摘要。 */
  approvalTasks?: HazardApprovalTaskSummaryVO[];
}

export interface HazardTodoPageParams extends HazardRecordPageBaseParams {
  /** 待办类型，使用统计卡片返回的 queryValue。 */
  todoType?: string;
  /** 是否只看当前登录人的待办。 */
  ownOnly?: boolean;
}

export interface HazardTodoStatisticVO {
  /** 待办类型。 */
  todoType: HazardTodoType;
  /** 展示名称。 */
  label?: string;
  /** 点击卡片时传给查询接口的待办类型值。 */
  queryValue?: string;
  /** 待办数量。 */
  count?: number;
  /** 超期数量。 */
  overdueCount?: number;
  /** 最早截止时间。 */
  earliestDeadline?: string;
  /** 最早提交时间。 */
  earliestSubmittedTime?: string;
  /** 默认主操作。 */
  primaryAction?: string;
}

export interface HazardTodoItemVO {
  todoType: HazardTodoType;
  hazardId: string | number;
  approvalTaskId?: string | number;
  approvalInstanceId?: string | number;
  planId?: string | number;
  code?: string;
  description?: string;
  level?: HazardTypeRuleDefaultLevel | string;
  governanceStatus?: HazardGovernanceStatus;
  submittedTime?: string;
  deadline?: string;
  overdue?: boolean;
  overdueHours?: number;
  remainingHours?: number;
  primaryAction?: string;
  actions?: HazardActionCode[];
}

export interface HazardDashboardParams {
  /** 时间范围。 */
  timeRange?: string;
  /** 自定义开始时间。 */
  startTime?: string;
  /** 自定义结束时间。 */
  endTime?: string;
}

export interface HazardDashboardRankingParams extends HazardDashboardParams {
  /** 排行维度。 */
  dimension?: string;
  /** 返回条数。 */
  limit?: number;
}

export interface HazardDashboardLevelDistributionVO {
  /** 隐患等级。 */
  level?: HazardTypeRuleDefaultLevel | string;
  /** 展示名称。 */
  label?: string;
  /** 隐患数量。 */
  count?: number;
  /** 占比。 */
  percent?: number;
}

export interface HazardDashboardClosureTrendVO {
  /** 时间桶。 */
  bucket?: string;
  /** 展示名称。 */
  label?: string;
  /** 隐患数量。 */
  totalCount?: number;
  /** 已闭环数量。 */
  closedCount?: number;
  /** 闭环率。 */
  closedRate?: number;
}

export interface HazardDashboardSourceDistributionVO {
  /** 来源类型。 */
  sourceType?: string;
  /** 展示名称。 */
  label?: string;
  /** 隐患数量。 */
  count?: number;
  /** 占比。 */
  percent?: number;
  /** 覆盖上游应用数。 */
  sourceSystemCount?: number;
  /** 覆盖上报方式数。 */
  sourceEventCount?: number;
}

export interface HazardDashboardChartsVO {
  /** 隐患等级分布。 */
  levelDistribution?: HazardDashboardLevelDistributionVO[];
  /** 闭环率趋势。 */
  closureTrend?: HazardDashboardClosureTrendVO[];
  /** 隐患来源分布。 */
  sourceDistribution?: HazardDashboardSourceDistributionVO[];
}

export interface HazardDashboardOverdueItemVO {
  hazardId: string | number;
  code?: string;
  description?: string;
  level?: HazardTypeRuleDefaultLevel | string;
  governanceStatus?: HazardGovernanceStatus;
  deadline?: string;
  overdueHours?: number;
  overdueDays?: number;
}

export interface HazardDashboardSummaryVO {
  totalCount?: number;
  closedCount?: number;
  closedRate?: number;
  overdueUnclosedCount?: number;
  maxOverdueDays?: number;
  todoWorkOrderCount?: number;
  overdueItems?: HazardDashboardOverdueItemVO[];
}

export interface HazardDashboardRankingItemVO {
  id?: string;
  name?: string;
  hazardCount?: number;
  percent?: number;
  riskScore?: number;
  trend?: number;
  closedCount?: number;
  overdueCount?: number;
  closedRate?: number;
}

export interface HazardDashboardRankingVO {
  dimension?: HazardDashboardRankingDimension;
  items?: HazardDashboardRankingItemVO[];
}

export type HazardRepeatedRectificationStatus = "ACTIVE" | "CLOSED";

export type HazardRepeatedRectificationStatusTag = "WATCH" | "IMPORTANT" | "HIGH_REPEAT";

export interface HazardRepeatedRectificationQueryParams {
  /** 页码。 */
  pageNumber: number;
  /** 页面大小。 */
  pageSize: number;
  /** 实时状态。 */
  status?: HazardRepeatedRectificationStatus;
  /** 隐患分类ID。 */
  categoryId?: string | number;
  /** 裁定根因编码。 */
  rootCauseCode?: HazardAcceptanceRootCauseCode;
  /** 关键字，匹配风险对象、风险单元、位置或隐患类型。 */
  keyword?: string;
  /** 统计窗口天数。 */
  days?: number;
}

export type HazardRepeatedRectificationSummaryParams = HazardRepeatedRectificationQueryParams;

export type HazardRepeatedRectificationPageParams = HazardRepeatedRectificationQueryParams;

export interface HazardRepeatedRectificationSummaryVO {
  /** 当前屡改屡犯数量。 */
  activeTotal?: number;
  /** 本月新增数量。 */
  currentMonthNewTotal?: number;
  /** 较上月新增差值。 */
  monthNewDiff?: number;
}

export interface HazardRepeatedRectificationPageVO {
  /** 屡改屡犯案件ID。 */
  id?: string | number;
  /** 风险对象ID。 */
  riskObjectId?: string | number;
  /** 风险对象名称。 */
  riskObjectName?: string;
  /** 风险单元ID。 */
  riskUnitId?: string | number;
  /** 风险单元名称。 */
  riskUnitName?: string;
  /** 位置名称。 */
  locationName?: string;
  /** 隐患分类ID。 */
  categoryId?: string | number;
  /** 隐患分类名称。 */
  categoryName?: string;
  /** 当前窗口闭环次数。 */
  currentRecurrenceCount?: number;
  /** 历史最大闭环次数。 */
  maxRecurrenceCount?: number;
  /** 平均复发间隔天数。 */
  averageRecurrenceDays?: number;
  /** 最近闭环时间。 */
  latestHazardClosedTime?: string;
  /** 实时状态。 */
  status?: HazardRepeatedRectificationStatus;
  /** 状态名称。 */
  statusName?: string;
  /** 屡改屡犯标签。 */
  statusTag?: HazardRepeatedRectificationStatusTag;
  /** 屡改屡犯标签名称。 */
  statusTagName?: string;
  /** 裁定根因编码。 */
  finalRootCauseCode?: HazardAcceptanceRootCauseCode;
  /** 裁定根因名称。 */
  finalRootCauseName?: string;
  /** 首次命中时间。 */
  detectedTime?: string;
  /** 乐观锁版本号。 */
  version?: number;
}

export interface HazardRepeatedRectificationDetailParams extends HazardRepeatedRectificationQueryParams {
  /** 屡改屡犯案件ID。 */
  id: string | number;
}

export interface HazardRepeatedRectificationDecisionCommand {
  /** 裁定根因编码。 */
  finalRootCauseCode: HazardAcceptanceRootCauseCode;
  /** 裁定说明。 */
  decisionRemark?: string;
  /** 改进建议推送内容。 */
  improvementSuggestion?: string;
  /** 乐观锁版本号。 */
  version?: number;
}

export interface HazardRepeatedRectificationRootCauseDistributionVO {
  /** 根因编码。 */
  rootCauseCode?: HazardAcceptanceRootCauseCode;
  /** 根因名称。 */
  rootCauseName?: string;
  /** 数量。 */
  count?: number;
}

export interface HazardRepeatedRectificationRecordVO {
  /** 隐患ID。 */
  hazardId?: string | number;
  /** 隐患编号。 */
  hazardCode?: string;
  /** 隐患描述。 */
  hazardDescription?: string;
  /** 闭环时间。 */
  closedTime?: string;
  /** 验收人ID。 */
  acceptanceUserId?: string;
  /** 验收人名称。 */
  acceptanceUserName?: string;
  /** 验收提交根因编码。 */
  rootCauseCode?: HazardAcceptanceRootCauseCode;
  /** 验收提交根因名称。 */
  rootCauseName?: string;
}

export interface HazardRepeatedRectificationDetailVO extends HazardRepeatedRectificationPageVO {
  /** 裁定说明。 */
  decisionRemark?: string;
  /** 改进建议推送内容。 */
  improvementSuggestion?: string;
  /** AI根因分析报告记录ID。 */
  aiRootCauseReportRecordId?: string | number;
  /** AI根因分析报告。 */
  aiRootCauseReport?: string;
  /** AI根因分析报告生成时间。 */
  aiRootCauseReportTime?: string;
  /** 裁定人ID。 */
  decisionUserId?: string;
  /** 裁定人名称。 */
  decisionUserName?: string;
  /** 裁定时间。 */
  decisionTime?: string;
  /** 根因分布。 */
  rootCauseDistributions?: HazardRepeatedRectificationRootCauseDistributionVO[];
  /** 关联隐患记录。 */
  records?: HazardRepeatedRectificationRecordVO[];
}
