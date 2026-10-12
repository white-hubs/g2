export interface PageQuery {
  pageNumber: number;
  pageSize: number;
}
export interface PageResult<T> {
  records: T[];
  total: number;
  pages?: number;
}
export interface OptionItem {
  id: string;
  name: string;
  children?: OptionItem[];
}
export type TypeKind = "report" | "arrange";
export interface TypeRow extends OptionItem {
  status: number | boolean;
}
export interface TypeBody {
  name: string;
  status: number | boolean;
}
export interface FlowQuery extends PageQuery {
  type: string;
  businessType: "REPORT";
  status?: string;
  submitTime?: string;
}
export interface ReportQuery extends PageQuery {
  reportTypeId?: string;
  organizationId?: string;
  startUserId?: string;
  username?: string;
  status?: string;
  submitTime?: string;
}
export interface FlowRow {
  processInstanceId: string;
  currentTaskId?: string;
  formNo?: string;
  instanceName?: string;
  startUserName?: string;
  startUserInfo?: { organizationName?: string } | null;
  submitedTime?: number | string;
  activeNodeName?: string;
  status?: string;
}
export interface ReportFile {
  id: string;
  path?: string | null;
  name?: string | null;
}
export interface ArrangeRow {
  id: string;
  title: string;
  type?: string;
  typeName?: string;
  content?: string;
  publisherName?: string;
  deptName?: string;
  publishTime?: number | string;
  fileList?: ReportFile[];
}
export interface ArrangeQuery extends PageQuery {
  deptId?: string;
  keyword?: string;
  period?: string;
}
export interface ArrangeBody {
  title: string;
  type: string;
  content: string;
  fileIds: string;
}
export interface StatisticQuery extends PageQuery {
  departmentId?: string;
  userName?: string;
  period?: string;
}
export interface TypeCount {
  typeId: string;
  typeName: string;
  typeNum: number;
}
export interface StatisticRow {
  userId: string;
  userName?: string;
  departmentName?: string;
  organizationId?: string;
  departmentNum?: number;
  userNum?: number;
  reportTypeNumList?: TypeCount[];
}
export interface FormControl {
  id?: string;
  title?: string;
  name?: string;
  props?: { items?: FormControl[] };
}
export interface FieldMapping {
  controlId: string;
  title: string;
  businessField: string | null;
}
export interface FormFlow {
  id: string;
  formDefinitionId: string;
  formJson?: string | FormControl[];
  formBizFieldMapList?: { controlId: string; businessField?: string | null }[];
}
export interface FlowBusinessBody {
  formDefinitionId: string;
  businessType: "REPORT";
  businessTypeName: "工作汇报";
  formFlowId: string;
  fieldMapList: FieldMapping[];
}
export interface WorkReportClient {
  pageTypes(kind: TypeKind, query: PageQuery & { keyword?: string; name?: string }): Promise<PageResult<TypeRow>>;
  createType(kind: TypeKind, body: TypeBody): Promise<void>;
  updateType(kind: TypeKind, id: string, body: TypeBody): Promise<void>;
  setTypeStatus(kind: TypeKind, id: string, status: number | boolean): Promise<void>;
  deleteType(kind: TypeKind, id: string): Promise<void>;
  listArrangeTypes(): Promise<TypeRow[]>;
  listOrganizations(): Promise<OptionItem[]>;
  pageFlows(query: FlowQuery): Promise<PageResult<FlowRow>>;
  pageReports(query: ReportQuery): Promise<PageResult<FlowRow>>;
  pageArrangements(query: ArrangeQuery): Promise<PageResult<ArrangeRow>>;
  getArrangement(id: string): Promise<ArrangeRow>;
  createArrangement(body: ArrangeBody): Promise<void>;
  deleteArrangement(id: string): Promise<void>;
  pageStatistics(query: StatisticQuery): Promise<PageResult<StatisticRow>>;
  exportStatistics(query: StatisticQuery & { selectReportBys: string }): Promise<Blob>;
  listFormFlows(): Promise<OptionItem[]>;
  listReportFields(): Promise<OptionItem[]>;
  getBusinessFlow(): Promise<string>;
  getFormFlow(id: string): Promise<FormFlow>;
  saveFlowBusiness(body: FlowBusinessBody): Promise<void>;
}
