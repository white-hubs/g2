/** 通用分页 */
export interface PageResult<T> {
  pages: number;
  records: T[];
  total: number;
}

export interface LineLossDevicePage {
  deviceCode: string;
  deviceName: string;
  lastCollectTime: string;
  lastReadValue: string;
  currentCollectTime: string;
  readValue: string;
  useValue: string;
  operation: string;
}
export interface LineLossPage {
  deviceName?: string;
  collectTime?: string | number;
  lineId: string;
  lineName: string;
  fromNodeName: string;
  toNodeName: string;
  fromNodeLocation: string;
  toNodeLocation: string;
  inputEnergy: string;
  outputEnergy: string;
  lossEnergy: string;
  lossRate: string;
}
export interface OrUpdateDetail {
  id: string;
  periodType: string;
  days: string;
  hourTime: string;
  lastExecuteTime: string;
  remark: string;
  createTime: string;
  createBy: string;
}

export interface LineLossClient {
  exportLineLossStatistics(params: { startTime: string; endTime: string; lineName?: string }): Promise<Blob>;
  getSecurityDevicePage(params: {
    startTime: string;
    pageSize: number;
    pageNumber: number;
    endTime: string;
    deviceIdSet: string[];
  }): Promise<{ total: number; records: LineLossDevicePage[]; pages: number }>;
  getLineLossPage(params: {
    startTime: string;
    pageSize: number;
    pageNumber: number;
    endTime: string;
    lineName?: string;
  }): Promise<{ total: number; records: LineLossPage[]; pages: number }>;
  saveOrUpdate(params: { id?: string; periodType: string; days?: string; hourTime?: string }): Promise<boolean>;
  getOrUpdate(): Promise<OrUpdateDetail>;
}
