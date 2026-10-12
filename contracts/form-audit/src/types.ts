export interface PageResult<T> {
  pages: number;
  records: T[];
  total: number;
}

export interface PageQuery {
  pageNumber: number;
  pageSize: number;
  [key: string]: unknown;
}

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  enabled?: boolean;
  children?: Department[];
}

export interface FormGroup {
  id: string;
  name: string;
  level?: number;
  parentId?: string;
  children?: FormGroup[];
}

export interface FormGroupCount {
  formGroupId: string;
  formGroupName: string;
  formGroupCount?: number;
  children?: FormGroupCount[];
  formGroupFlowList?: { id: string; name: string; businessType: string }[];
}

export interface FormFlow {
  id: string;
  name: string;
  type?: string;
  typeName?: string;
  status?: string;
  enable?: boolean;
  remark?: string;
  formGroupId?: string;
  formGroupName?: string;
  businessType?: string;
  businessTypeName?: string;
  updateTime?: string | number;
  publicForm?: number;
  qrCodeUrl?: string;
  qrImage?: string;
  formJson?: string;
  formFieldList?: { id: string; name: string; required?: boolean }[];
}

export interface AppraisalDraftOption {
  id: string;
  name?: string;
  planName?: string;
  maintenancePlanName?: string;
  businessType?: string;
}

export interface FlowProcess {
  formNo?: string | Record<string, unknown>;
  processInstanceId?: string;
  formInstanceId?: string | number;
  instanceName?: string;
  startUserId?: string | number;
  startUserName?: string;
  organizationId?: string | number;
  organizationName?: string;
  submitedTime?: string | number;
  status?: string;
  activeNodeName?: string;
  currentTaskId?: string;
  businessType?: string;
}

export interface WorkOrderStatistics {
  id?: string;
  businessType?: string;
  businessTypeName?: string;
  formGroupName?: string;
  userName?: string;
  organizationName?: string;
  totalNumber?: number;
  processNumber?: number;
  rejectNumber?: number;
  undoNumber?: number;
  waitNumber?: number;
  dealNumber?: number;
  dealRate?: string;
  avgWaitTime?: string;
}

export type AppraisalPeriodType = "MONTHLY" | "QUARTERLY" | "HALF_YEAR";
export type AppraisalRecordStatus = "GENERATED" | "ADJUSTED" | "CONFIRMED";

export interface AppraisalRuleRange {
  startValue?: number;
  endValue?: number;
  deductScore?: number;
}

export interface AppraisalRuleItem {
  id?: string;
  itemName?: string;
  fieldKey?: string;
  calcType?: string;
  sort?: number;
  rangeConfig?: AppraisalRuleRange[];
}

export interface AppraisalRuleContent {
  id?: string;
  contentType?: "SPOT_CHECK" | "INSPECTION";
  sourceType?: "FORM" | "INSPECT" | "MAINTAIN";
  sourceRefId?: string;
  sourceRefCode?: string;
  sourceRefName?: string;
  contentDesc?: string;
  standardDesc?: string;
  sort?: number;
  items?: AppraisalRuleItem[];
}

export interface AppraisalRule {
  id?: string;
  name?: string;
  inspectionItem?: string;
  formGroupId?: string;
  formGroupName?: string;
  periodType?: AppraisalPeriodType;
  totalScore?: number;
  spotCheckScore?: number;
  inspectionScore?: number;
  responsibleDepartmentIds?: string[];
  responsibleDepartmentNames?: string;
  enabled?: boolean;
  ruleVersion?: number;
  updateTime?: string;
  inUse?: boolean;
  contents?: AppraisalRuleContent[];
}

export interface AppraisalRuleSaveCommand {
  id?: string;
  name: string;
  inspectionItem: string;
  formGroupId?: string;
  periodType: AppraisalPeriodType;
  totalScore: number;
  spotCheckScore: number;
  inspectionScore: number;
  responsibleDepartmentIds: string[];
  enabled: boolean;
  contents: AppraisalRuleContent[];
}

export interface AppraisalStatisticsPeriod {
  assessmentYear?: number;
  periodType?: AppraisalPeriodType;
  assessmentPeriod?: number;
  periodLabel?: string;
  assessmentBeginTime?: string;
  assessmentEndTime?: string;
  originTotalScore?: number;
  finalTotalScore?: number;
  deductScore?: number;
}

export interface AppraisalStatistics {
  assessmentYear?: number;
  periodType?: AppraisalPeriodType;
  summary?: { originTotalScore?: number; finalTotalScore?: number; deductScore?: number };
  currentPreviewGeneratedAt?: string | number;
  records?: AppraisalStatisticsPeriod[];
}

export interface AppraisalRecord {
  id?: string;
  name?: string;
  inspectionItem?: string;
  periodType?: AppraisalPeriodType;
  assessmentYear?: number;
  assessmentPeriod?: number;
  assessmentBeginTime?: string;
  assessmentEndTime?: string;
  responsibleDepartmentNames?: string;
  firstLevelFormGroupId?: string;
  firstLevelFormGroupName?: string;
  secondLevelFormGroupId?: string;
  secondLevelFormGroupName?: string;
  originTotalScore?: number;
  finalTotalScore?: number;
  originSpotCheckScore?: number;
  finalSpotCheckScore?: number;
  originInspectionScore?: number;
  finalInspectionScore?: number;
  status?: AppraisalRecordStatus;
  generatedAt?: string;
}

export interface AppraisalRecordGroup {
  formGroupId?: string;
  formGroupName?: string;
  level?: number;
  children?: AppraisalRecordGroup[];
  records?: AppraisalRecord[];
}

export interface AppraisalRecordDetailItem {
  id?: string;
  contentType?: "SPOT_CHECK" | "INSPECTION";
  sourceType?: "FORM" | "INSPECT" | "MAINTAIN";
  sourceRefName?: string;
  contentDesc?: string;
  standardDesc?: string;
  itemName?: string;
  fieldName?: string;
  calcType?: string;
  rawValue?: string;
  matchedRangeText?: string;
  deductionReason?: string;
  originDeductScore?: number;
  manualAdjustDeductScore?: number;
  finalDeductScore?: number;
  remark?: string;
}

export interface AppraisalRecordDetail extends AppraisalRecord {
  originTotalScore?: number;
  originSpotCheckScore?: number;
  originInspectionScore?: number;
  finalSpotCheckScore?: number;
  finalInspectionScore?: number;
  adjustRemark?: string;
  details?: AppraisalRecordDetailItem[];
}
