export interface WorkPermitClient {
  listWorkPermitTypes: (params) => Promise<unknown>;
  getWorkPermitTypeDetail: (id) => Promise<unknown>;
  createWorkPermitType: (payload) => Promise<unknown>;
  updateWorkPermitType: (id, payload) => Promise<unknown>;
  deleteWorkPermitType: (id) => Promise<unknown>;
  listWorkPermitLevels: (params) => Promise<unknown>;
  exportWorkPermitTypes: (params) => Promise<unknown>;
  recognizeWorkPermitAssociatedItemByAi: (payload) => Promise<unknown>;
}
