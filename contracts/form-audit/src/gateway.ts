import type {
  AppraisalDraftOption,
  AppraisalRecordDetail,
  AppraisalRecordGroup,
  AppraisalRule,
  AppraisalRuleSaveCommand,
  AppraisalStatistics,
  Department,
  FlowProcess,
  FormFlow,
  FormGroup,
  FormGroupCount,
  PageQuery,
  PageResult,
  WorkOrderStatistics,
} from "./types";

export interface FormAuditGateway {
  pageBusinessForms(query: PageQuery): Promise<PageResult<FormFlow>>;
  pageInspectPlanDrafts(query: PageQuery): Promise<PageResult<AppraisalDraftOption>>;
  pageMaintenancePlanDrafts(query: PageQuery): Promise<PageResult<AppraisalDraftOption>>;
  pageFormFlows(query: PageQuery): Promise<PageResult<FormFlow>>;
  getFormFlow(id: string): Promise<FormFlow>;
  updateFormFlowEnabled(id: string, enabled: boolean): Promise<boolean>;
  deleteFormFlow(id: string): Promise<void>;
  listFormGroupCounts(query: Record<string, unknown>): Promise<FormGroupCount[]>;
  listPermissionFormGroups(query: Record<string, unknown>): Promise<FormGroupCount[]>;
  listConfigFormGroupTree(query: Record<string, unknown>): Promise<FormGroupCount[]>;
  listFormGroups(query?: Record<string, unknown>): Promise<FormGroup[]>;
  treeFormGroups(keyword?: string): Promise<FormGroup[]>;
  saveFormGroup(payload: { id?: string; parentId?: string; name: string; application?: string }): Promise<boolean>;
  deleteFormGroup(id: string): Promise<void>;
  listBusinessTypes(query?: Record<string, unknown>): Promise<{ code: string; name: string }[]>;
  pageFlowProcesses(query: PageQuery): Promise<PageResult<FlowProcess>>;
  pageAllAppraisalProcesses(query: PageQuery): Promise<PageResult<FlowProcess>>;
  deleteWorkOrders(ids: string[]): Promise<boolean>;
  exportFlowProcesses(query: Record<string, unknown>, appraisal: boolean): Promise<Blob>;
  pageWorkOrderStatistics(query: PageQuery): Promise<PageResult<WorkOrderStatistics>>;
  exportWorkOrderStatistics(query: Record<string, unknown>): Promise<Blob>;
  pagePersonnelStatistics(query: PageQuery): Promise<PageResult<WorkOrderStatistics>>;
  exportPersonnelStatistics(query: Record<string, unknown>): Promise<Blob>;
  listDepartments(): Promise<Department[]>;
  pageAppraisalRules(query: PageQuery): Promise<PageResult<AppraisalRule>>;
  getAppraisalRule(id: string): Promise<AppraisalRule>;
  createAppraisalRule(payload: AppraisalRuleSaveCommand): Promise<AppraisalRule>;
  updateAppraisalRule(id: string, payload: AppraisalRuleSaveCommand): Promise<AppraisalRule>;
  updateAppraisalRuleEnabled(id: string, enabled: boolean): Promise<boolean>;
  deleteAppraisalRule(id: string): Promise<void>;
  getAppraisalStatistics(query: Record<string, unknown>): Promise<AppraisalStatistics>;
  generateAppraisalPreview(): Promise<boolean>;
  pageAppraisalRecords(query: PageQuery): Promise<PageResult<AppraisalRecordGroup>>;
  exportAppraisalRecords(query: Record<string, unknown>): Promise<Blob>;
  getAppraisalRecord(id: string): Promise<AppraisalRecordDetail | null>;
}

export type FormAuditClient = FormAuditGateway;
