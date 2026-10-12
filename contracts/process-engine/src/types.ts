export interface ProcessEnginePageResult<T> {
  pages: number;
  records: T[];
  total: number;
}

export interface FormFlowItemVO {
  id: string;
  name: string;
  businessType: string;
}

export interface FormFlowGroupVO {
  formGroupId: string;
  formGroupName: string;
  formGroupCount: number;
  formGroupFlowList: FormFlowItemVO[];
}

export interface FormFlowDetailVO {
  id: string;
  name: string;
  type?: string;
  typeName?: string;
  status?: string;
  enable: boolean | string | number;
  remark?: string;
  flowKey?: string;
  formKey?: string;
  formGroupId?: string;
  formGroupName?: string;
  shortName?: string;
  permissionType?: string;
  customCode?: string;
  businessTypeName?: string;
  updateTime?: string | number;
  businessType?: string;
  publicForm?: number;
  qrCodeUrl?: string;
  qrImage?: string;
}

export interface FlowProcessVO {
  activeNodeName?: string | null;
  businessType?: string | null;
  currentTaskId?: string | null;
  formNo?: string | Record<string, unknown> | null;
  instanceName?: string | null;
  organizationName?: string | null;
  processInstanceId?: string | null;
  startUserName?: string | null;
  status?: string | null;
  submitedTime?: string | number | null;
}

export interface WorkOrderStatisticsModel {
  businessType: string;
  businessTypeName: string;
  formGroupName?: string;
  totalNumber: number;
  processNumber: number;
  rejectNumber: number;
  undoNumber: number;
  dealNumber: number;
}

export interface FormGroupTypeVO {
  id: string;
  name: string;
  businessType: string;
}

export interface WorkOrderBusinessTypeModel {
  businessType: string;
  businessTypeName: string;
}

export interface FlowProcessQuery {
  applicationCode?: string;
  businessType?: string;
  organizationId?: string;
  pageNumber: number;
  pageSize: number;
  progress?: string;
  status?: string;
  submitTime?: string;
  type?: string;
  username?: string;
}

export interface WorkOrderStatisticsQuery {
  applicationCode?: string;
  businessType?: string;
  formGroupId?: string;
  pageNumber: number;
  pageSize: number;
  period?: string;
}

export interface WorkOrderExportQuery {
  applicationCode?: string;
  businessType?: string;
  formGroupId?: string;
  organizationId?: string;
  period?: string;
  progress?: string;
  status?: string;
  submitTime?: string;
  type?: string;
  username?: string;
}

export interface PermissionFormFlowGroupCountParams {
  keyword?: string;
  filterEmpty?: boolean;
  application?: string;
  applicationCode?: string;
}

export interface FormFlowGroupCountParams {
  keyword?: string;
  filterEmpty?: boolean;
  application: string;
}

export interface UpdateFormFlowGroupParams {
  id?: string;
  name: string;
  application?: string;
}

export interface FormFlowPageQuery {
  pageNumber: number;
  pageSize: number;
  keyword?: string;
  fromGroupId?: string | number;
  enable?: boolean;
  application: string;
}

export interface UpdateFormFlowEnableParams {
  id: string;
  enable: boolean;
}

export interface FlowBusinessNodeNamesQuery {
  businessType: string;
}

export interface ApplicationQuery {
  application?: string;
}

export interface UserFlowNumberParams {
  applicationCode: string;
  period: string;
}

export interface FlowNumberStatistics {
  submitCount: number;
  waitingCount: number;
  finishedCount: number;
}
