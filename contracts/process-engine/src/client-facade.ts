export interface ProcessEngineClient {
  getPermissionFormFlowGroupCount: (params) => Promise<unknown>;
  getFormFlowGroupCount: (params) => Promise<unknown>;
  updateFormFlowGroup: (params) => Promise<unknown>;
  deleteFormFlowGroup: (id) => Promise<unknown>;
  getFormFlowPageList: (params) => Promise<unknown>;
  updateFormFlowEnable: (params) => Promise<unknown>;
  deleteFormFlow: (id) => Promise<unknown>;
  getFlowProcessPage: (params) => Promise<unknown>;
  getWorkOrderList: (params) => Promise<unknown>;
  exportWorkOrderList: (params) => Promise<unknown>;
  getWorkOrderStatisticsList: (params) => Promise<unknown>;
  exportWorkOrderStatisticsList: (params) => Promise<unknown>;
  getFlowBusinessNodeNames: (params) => Promise<unknown>;
  getFormFlowGroupList: (params) => Promise<unknown>;
  getWorkOrderBusinessTypeList: (params) => Promise<unknown>;
  getUserFlowNumber: (params) => Promise<unknown>;
}
