export type AssetQuery = Record<string, string | number | boolean | undefined | null | string[]>;
export interface AssetRow {
  id: string;
  children?: AssetRow[];
  [field: string]: unknown;
}
export interface OptionItem {
  id: string;
  name: string;
  code?: string;
  parentId?: string | null;
  children?: OptionItem[];
}
export interface PageResult {
  records: AssetRow[];
  total: number;
}
export type Classification = "assetType" | "assetSource" | "reasonForScrapping";
export type ListResource =
  | "warehousing"
  | "inventory"
  | "distribution"
  | "allocation"
  | "cleaning"
  | "assetCheck"
  | "stock"
  | "entering"
  | "consuming"
  | "consumableCheck"
  | "history"
  | "maintenance"
  | "overage"
  | "inout"
  | "departmentUse"
  | "warehouse"
  | "consumable"
  | "assetSource"
  | "scrapReason"
  | "abnormalType"
  | "assetCheckDetails"
  | "consumableCheckDetails";
export type EditableResource = "warehouse" | "consumable" | "category" | "abnormalType" | Classification;
export type ExportResource =
  | "inventory"
  | "warehousing"
  | "distribution"
  | "allocation"
  | "assetCheck"
  | "consumableCheck"
  | "entering"
  | "consuming"
  | "history"
  | "maintenance"
  | "overage"
  | "departments"
  | "inout";
export interface DepartmentAssetRow {
  depId: string;
  depName: string;
  totalNumber: number;
  totalPrice: number;
}
export interface DepartmentSummary {
  depAll: DepartmentAssetRow[];
  totalNumber: number;
  totalPrice: number;
}
export interface ChartDatum {
  name: string;
  value: number | number[];
}
export interface Histogram {
  xdata: string[];
  series: ChartDatum[];
}
export interface Overview {
  counts: Record<string, number>;
  status: ChartDatum[];
  category: ChartDatum[];
  departments: Histogram;
  trend: ChartDatum[];
  consumableDepartments: ChartDatum[];
  areas: ChartDatum[];
}
export interface DepartmentUse {
  deptId: string;
  deptName: string;
  amount: number;
  consumableNum: number;
}
export interface FormFlow {
  id: string;
  formDefinitionId?: string;
  formJson: string;
  formBizFieldMapList?: { controlId: string; businessField?: string | null }[];
}
export interface FieldMapping {
  controlId: string;
  title: string;
  businessField: string | null;
}
export interface SceneConfig {
  label: string;
  sceneCode: string;
  value: number;
  noticeWays: { noticeWay: string; templateId?: number }[];
  noticeObjs: { objType: string; objId: string; objInfo: string }[];
}
export interface MessageMethod {
  label: string;
  value: string;
}
export interface AssetClient {
  page(resource: ListResource, query: AssetQuery): Promise<PageResult>;
  classifications(type: Classification): Promise<OptionItem[]>;
  classificationTree(): Promise<AssetRow[]>;
  categories(): Promise<OptionItem[]>;
  organizations(): Promise<OptionItem[]>;
  areas(): Promise<OptionItem[]>;
  users(query: AssetQuery): Promise<PageResult>;
  positions(): Promise<OptionItem[]>;
  roles(): Promise<PageResult>;
  administrators(query: AssetQuery): Promise<AssetRow[]>;
  bindAdministrators(orgId: string, userIds: string[]): Promise<void>;
  departmentSummary(query: AssetQuery): Promise<DepartmentSummary>;
  overdueAmount(query: AssetQuery): Promise<{ totalNumber: number; totalPrice: number }>;
  overview(query: AssetQuery): Promise<Overview>;
  departmentUse(query: AssetQuery): Promise<DepartmentUse[]>;
  getAsset(id: string): Promise<AssetRow>;
  updateAsset(body: AssetRow): Promise<void>;
  updateAssetCode(body: AssetRow): Promise<void>;
  checkAssetCodes(assetId: string, value: string): Promise<string[]>;
  save(resource: EditableResource, body: Record<string, unknown>, id?: string): Promise<void>;
  remove(resource: ListResource | EditableResource, id: string): Promise<void>;
  createAssetCheck(body: Record<string, unknown>): Promise<void>;
  createConsumableCheck(body: Record<string, unknown>): Promise<void>;
  getAssetCheck(id: string): Promise<AssetRow>;
  checkCounts(kind: "asset" | "consumable", id: string): Promise<Record<string, number>>;
  checkTasks(id: string): Promise<AssetRow[]>;
  submitAssetCheck(id: string): Promise<boolean>;
  syncAssetCheck(id: string): Promise<void>;
  hasConsumableCheckDifference(id: string): Promise<boolean>;
  submitConsumableCheck(id: string, sync: boolean): Promise<void>;
  export(resource: ExportResource, query: AssetQuery): Promise<Blob>;
  template(kind: "asset" | "consumable" | "stock"): Promise<Blob>;
  import(kind: "asset" | "consumable" | "stock", file: File): Promise<void>;
  qrcodes(rows: { entityId: string; entityName: string; serialNumber: string }[]): Promise<Blob>;
  approvalTypes(): Promise<OptionItem[]>;
  formFlows(): Promise<OptionItem[]>;
  businessFields(type: string): Promise<OptionItem[]>;
  businessFlow(type: string): Promise<string>;
  getFormFlow(id: string): Promise<FormFlow>;
  saveFlow(body: {
    formDefinitionId: string;
    businessType: string;
    businessTypeName: string;
    formFlowId: string;
    fieldMapList: FieldMapping[];
  }): Promise<void>;
  messageConfig(): Promise<SceneConfig[]>;
  messageMethods(scene: string): Promise<MessageMethod[]>;
  saveMessageConfig(scenes: SceneConfig[]): Promise<void>;
}
