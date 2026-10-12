import type {
  ApplicationQuery,
  FlowBusinessNodeNamesQuery,
  FlowNumberStatistics,
  FlowProcessQuery,
  FlowProcessVO,
  FormFlowDetailVO,
  FormFlowGroupCountParams,
  FormFlowGroupVO,
  FormFlowPageQuery,
  FormGroupTypeVO,
  PermissionFormFlowGroupCountParams,
  ProcessEnginePageResult,
  UpdateFormFlowEnableParams,
  UpdateFormFlowGroupParams,
  UserFlowNumberParams,
  WorkOrderBusinessTypeModel,
  WorkOrderExportQuery,
  WorkOrderStatisticsModel,
  WorkOrderStatisticsQuery,
} from "./types";

export interface ProcessEngineGateway {
  getPermissionFormFlowGroupCount: (params: PermissionFormFlowGroupCountParams) => Promise<FormFlowGroupVO[]>;
  getFormFlowGroupCount: (params: FormFlowGroupCountParams) => Promise<FormFlowGroupVO[]>;
  updateFormFlowGroup: (params: UpdateFormFlowGroupParams) => Promise<boolean>;
  deleteFormFlowGroup: (id: string) => Promise<void>;
  getFormFlowPageList: (params: FormFlowPageQuery) => Promise<ProcessEnginePageResult<FormFlowDetailVO>>;
  updateFormFlowEnable: (params: UpdateFormFlowEnableParams) => Promise<boolean>;
  deleteFormFlow: (id: string) => Promise<void>;
  getFlowProcessPage: (params: FlowProcessQuery) => Promise<ProcessEnginePageResult<FlowProcessVO>>;
  getWorkOrderList: (params: FlowProcessQuery) => Promise<ProcessEnginePageResult<FlowProcessVO>>;
  exportWorkOrderList: (params: WorkOrderExportQuery) => Promise<Blob>;
  getWorkOrderStatisticsList: (params: WorkOrderStatisticsQuery) => Promise<ProcessEnginePageResult<WorkOrderStatisticsModel>>;
  exportWorkOrderStatisticsList: (params: Omit<WorkOrderStatisticsQuery, "pageNumber" | "pageSize">) => Promise<Blob>;
  getFlowBusinessNodeNames: (params: FlowBusinessNodeNamesQuery) => Promise<string[]>;
  getFormFlowGroupList: (params?: ApplicationQuery) => Promise<FormGroupTypeVO[]>;
  getWorkOrderBusinessTypeList: (params?: ApplicationQuery) => Promise<WorkOrderBusinessTypeModel[]>;
  getUserFlowNumber: (params: UserFlowNumberParams) => Promise<FlowNumberStatistics>;
}
