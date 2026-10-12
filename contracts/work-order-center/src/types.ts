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

export interface WorkOrderRecord {
  activeNodeName?: string;
  businessType?: string;
  currentTaskId?: string;
  formInstanceId?: number | null;
  formNo?: string;
  instanceName?: string;
  lastTaskCompletedTime?: string | null;
  organizationName?: string;
  processInstanceId: string;
  startUserId?: string;
  startUserName?: string;
  status?: string;
  submitedTime?: number | string;
}

export interface WorkOrderStatistics {
  businessType?: string;
  businessTypeName?: string;
  dealNumber?: number;
  processNumber?: number;
  rejectNumber?: number;
  totalNumber?: number;
  undoNumber?: number;
}

export interface WorkOrderBusinessType {
  code: string;
  name: string;
}
