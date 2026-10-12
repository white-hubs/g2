export type FumigationWorkStatus =
  | "SAFETY_APPROVING"
  | "TECH_APPROVING"
  | "PENDING_CHECK"
  | "CHECK_FAILED"
  | "PENDING_START"
  | "EXECUTING"
  | "ARCHIVED"
  | "REJECTED";

export type FumigationApprovalNode = "safety" | "technical";
export type FumigationApprovalAction = "approved" | "rejected";
export type FumigationPrecheckStepId = "VENTILATION_DURATION" | "PH3_CONCENTRATION" | "OXYGEN_CONCENTRATION";
export type FumigationCheckStatus = "pending" | "passed" | "failed";
export type FumigationPesticideTypeCode = "ALUMINUM_PHOSPHIDE" | "PHOSPHINE" | "SULFURYL_FLUORIDE";
export type FumigationApplicationMethodCode = "MANUAL_DOSING" | "MECHANICAL_DOSING" | "PIPELINE_DOSING";

export interface FumigationEnumOption<T extends string = string> {
  code: T;
  name: string;
}

export interface FumigationPageResult<T> {
  pages: number;
  records: T[];
  total: number;
}

export interface FumigationWorkQuery {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  status?: FumigationWorkStatus | "";
}

export interface FumigationWarehouseOption {
  warehouseId: string;
  warehouseName: string;
  areaName?: string;
  grainType?: string;
  warehouseCode?: string;
  capacityTon?: number;
}

export interface FumigationGrainVarietyOption {
  grainVarietyId: string;
  grainVarietyName: string;
  warehouseId?: string;
}

export interface FumigationDeviceProperty {
  code: string;
  name: string;
  value: number;
  unit: string;
  updatedAt?: string;
}

export interface FumigationCameraOption {
  /** 设备中心设备 ID，用于 IoT 属性查询 */
  id: string;
  /** 第三方视频平台 ID，用于视频播放 */
  thirdPartyId?: string;
  name: string;
  channelNo: string;
}

export interface FumigationLinkedDevice {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline" | string;
}

export interface FumigationAlarmFlowEvent {
  id: string;
  time: string;
  title: string;
  handler: string;
  result: string;
}

export interface FumigationTrendPoint {
  time: string;
  value: number;
}

export interface FumigationDeviceOption {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  locationName?: string;
  properties?: FumigationDeviceProperty[];
  cameras?: FumigationCameraOption[];
  linkedDevices?: FumigationLinkedDevice[];
  alarmFlow?: FumigationAlarmFlowEvent[];
  indoorPh3Trend?: FumigationTrendPoint[];
}

export interface FumigationWorkerOption {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  certificates: FumigationWorkerCertificate[];
}

export interface FumigationWorkPerson {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  department?: string;
  postName?: string;
  role?: string;
  certId?: string;
  certName?: string;
  certNo?: string;
  certExpireAt?: string;
  certExpired?: boolean;
}

export interface FumigationWorkerCertificate {
  id: string;
  name: string;
  no: string;
  expireAt: string;
}

export interface FumigationApprovalRecord {
  id: string;
  node: FumigationApprovalNode;
  nodeName: string;
  action: FumigationApprovalAction;
  operatorName: string;
  opinion: string;
  at: string;
}

export interface FumigationCheckFieldValue {
  label: string;
  value: string;
}

export interface FumigationCheckPropertyValue {
  code: string;
  name: string;
  value: string | number | boolean | null;
  unit?: string;
  ts?: string | number;
  pass?: boolean;
  message?: string;
}

export interface FumigationPrecheckResult {
  stepId: FumigationPrecheckStepId;
  title: string;
  status: FumigationCheckStatus;
  message: string;
  checkedAt: string;
  values: FumigationCheckFieldValue[];
  propertyValues: FumigationCheckPropertyValue[];
  deviceId?: string;
  rule?: string;
}

export interface FumigationFileVO {
  id: string | number;
  name: string;
  path?: string;
  suffix?: string;
  size?: number;
  type?: string;
  businessKey?: string | number | null;
}

export interface FumigationAttachment {
  id: string;
  name: string;
  path?: string;
  suffix?: string;
  size?: number;
  sceneCode?: string;
  fileVO?: FumigationFileVO;
}

export interface FumigationWork {
  id: string;
  code: string;
  title: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  grainVarietyId: string;
  grainVarietyName: string;
  deviceId: string;
  deviceCode?: string;
  deviceName?: string;
  expectedDurationHours: number;
  createdAt: string;
  plannedStartAt: string;
  plannedDosage: string;
  grainQuantity?: number;
  pesticideTypeCode?: FumigationPesticideTypeCode | string;
  pesticideTypeName?: string;
  pesticideType?: string;
  pesticideDosage?: string;
  applicationMethodCode?: FumigationApplicationMethodCode | string;
  applicationMethodName?: string;
  applicationMethod?: string;
  sealedDays?: number;
  expectedVentilationAt?: string;
  applicantName: string;
  safetyLead: string;
  technicalLead: string;
  siteLeader: string;
  safetyDisclosure: string;
  emergencyPlan: string;
  safetyMeasures?: string;
  attachmentsSceneCode?: string;
  attachments?: FumigationAttachment[];
  workerIds: string[];
  workers: FumigationWorkPerson[];
  actualWorkerCount: number;
  status: FumigationWorkStatus;
  currentApprovalNode: FumigationApprovalNode | null;
  approvalRecords: FumigationApprovalRecord[];
  prechecks: Record<FumigationPrecheckStepId, FumigationPrecheckResult>;
  completionDescription?: string;
  terminationReason?: string;
  archivedAt?: string;
  availableActions?: string[];
}

export interface CreateFumigationWorkPayload {
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  grainVarietyId: string;
  grainVarietyName?: string;
  deviceId: string;
  deviceCode?: string;
  deviceName?: string;
  expectedDurationHours: number;
  plannedStartAt: string;
  plannedDosage?: string;
  grainQuantity?: number;
  pesticideTypeCode: FumigationPesticideTypeCode | string;
  pesticideDosage?: string;
  applicationMethodCode: FumigationApplicationMethodCode | string;
  sealedDays?: number;
  expectedVentilationAt?: string;
  safetyLead?: string;
  technicalLead?: string;
  siteLeader?: string;
  safetyDisclosure?: string;
  emergencyPlan?: string;
  safetyMeasures?: string;
  attachmentsSceneCode?: string;
  attachments?: FumigationAttachment[];
  workerIds: string[];
  actualWorkerCount: number;
}

export interface SubmitFumigationApprovalPayload {
  action: FumigationApprovalAction;
  operatorName?: string;
  opinion?: string;
}

export interface RunFumigationPrecheckPayload {
  stepId: FumigationPrecheckStepId;
}

export interface StartFumigationWorkPayload {
  actualWorkerCount?: number;
}

export interface CompleteFumigationWorkPayload {
  description: string;
}

export interface TerminateFumigationWorkPayload {
  reason?: string;
}

export interface SendFumigationNotificationPayload {
  receiverUserIds: string[];
  content: string;
}

export interface FumigationArchiveRecord {
  id: string;
  workId: string;
  archiveNo?: string;
  generatedAt: string;
  generatedBy: string;
}

export interface FumigationArchiveDocumentCover {
  warehouseCode?: string;
  warehouseName?: string;
  grainVarietyName?: string;
  grainQuantity?: number;
  grainQuantityUnit?: string;
  pesticideTypeName?: string;
  pesticideDosage?: string;
  applicationMethodName?: string;
  sealedDays?: number;
  workDateLabel?: string;
}

export interface FumigationArchiveDocumentSummary {
  actualDurationLabel?: string;
  workerCount?: number;
  operationNo?: string;
  applicantName?: string;
  applyTime?: string;
  warehouseCode?: string;
  warehouseName?: string;
  grainVarietyName?: string;
  grainQuantity?: number;
  grainQuantityUnit?: string;
  pesticideTypeName?: string;
  pesticideDosage?: string;
  applicationMethodName?: string;
  sealedDays?: number;
  finalStatusName?: string;
  archiveTime?: string;
}

export interface FumigationArchiveDocumentApprovalRow {
  index: number;
  approvalTime?: string;
  approverName?: string;
  roleName?: string;
  actionName?: string;
  opinion?: string;
}

export interface FumigationArchiveDocumentPrecheckRow {
  stepLabel?: string;
  itemName?: string;
  detectedValue?: string;
  thresholdRule?: string;
  resultLabel?: string;
  sensorCode?: string;
  firstInStep?: boolean;
}

export interface FumigationArchiveDocumentPrecheckSection {
  checkedTime?: string;
  resultLabel?: string;
  rows: FumigationArchiveDocumentPrecheckRow[];
}

export interface FumigationArchiveDocumentPh3TrendPoint {
  timeLabel?: string;
  valuePpm?: number;
}

export interface FumigationArchiveDocumentPh3Section {
  sampleCount?: number;
  sensorCodes?: string;
  indoorMaxPpm?: number;
  indoorMinPpm?: number;
  indoorAvgPpm?: number;
  outdoorMaxPpm?: number;
  trend: FumigationArchiveDocumentPh3TrendPoint[];
  periodStart?: string;
  periodEnd?: string;
}

export interface FumigationArchiveDocumentAlarmRow {
  alarmId?: string;
  alarmTime?: string;
  alarmEventName?: string;
  alarmLevelName?: string;
  alarmStatusName?: string;
  content?: string;
}

export interface FumigationArchiveDocumentCompletionRow {
  itemName?: string;
  detail?: string;
  resultLabel?: string;
  confirmedTime?: string;
}

export interface FumigationArchiveDocumentCompletion {
  archiveTypeName?: string;
  completionDesc?: string;
  confirmedTime?: string;
  rows: FumigationArchiveDocumentCompletionRow[];
}

export interface FumigationArchiveDocument {
  archiveId: string;
  archiveNo?: string;
  workId: string;
  workCode?: string;
  generatedTime?: string;
  generatedByName?: string;
  cover?: FumigationArchiveDocumentCover;
  summary?: FumigationArchiveDocumentSummary;
  approvals: FumigationArchiveDocumentApprovalRow[];
  prechecks?: FumigationArchiveDocumentPrecheckSection;
  ph3Monitoring?: FumigationArchiveDocumentPh3Section;
  alarms: FumigationArchiveDocumentAlarmRow[];
  completion?: FumigationArchiveDocumentCompletion;
}

export interface FumigationArchiveQuery {
  pageNumber?: number;
  pageSize?: number;
  workId?: string;
}

export interface FumigationRealtimeSituationStats {
  inProgressCount: number;
  completedTodayCount: number;
  monthCreatedCount: number;
  precheckPassRate: number;
  lastMonthWorkCount: number;
  currentMonthWorkCount: number;
  lastMonthPrecheckPassRate: number;
  currentMonthPrecheckPassRate: number;
}

export interface FumigationRealtimeSituationWorkItem {
  id: string;
  code: string;
  warehouseId: string;
  warehouseName: string;
  grainVarietyName: string;
  pesticideSummary: string;
  workerCount: number;
  remainingLabel?: string;
  completedTime?: string;
  status: FumigationWorkStatus;
}

export interface FumigationRealtimeSituationWarehouseItem {
  warehouseId: string;
  warehouseName: string;
  grainType?: string;
  statusLabel: string;
  status: "idle" | "working";
}

export interface FumigationRealtimeSituationDeviceItem {
  id: string;
  name: string;
  status: "online" | "offline";
}

export interface FumigationRealtimeSituationAlarmItem {
  id: string;
  alarmEventName: string;
  alarmTime: string | number;
  alarmStatusName: string;
}

export interface FumigationRealtimeSituationWorks {
  inProgressWorks: FumigationRealtimeSituationWorkItem[];
  completedTodayWorks: FumigationRealtimeSituationWorkItem[];
}

export interface FumigationRealtimeSituation {
  stats: FumigationRealtimeSituationStats;
  inProgressWorks: FumigationRealtimeSituationWorkItem[];
  completedTodayWorks: FumigationRealtimeSituationWorkItem[];
  warehouses: FumigationRealtimeSituationWarehouseItem[];
  devices: FumigationRealtimeSituationDeviceItem[];
  todayAlarms: FumigationRealtimeSituationAlarmItem[];
}

export interface FumigationDispatchMapConfig {
  center: { lng: number; lat: number };
  radius: number;
}

export interface FumigationMonitorPersonnelLocation {
  userId: string;
  name: string;
  lng?: number;
  lat?: number;
}
