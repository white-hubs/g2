export interface PageResult<T> {
  pages: number;
  records: T[];
  total: number;
}

export interface CollectionRecord {
  deviceCode: string;
  deviceName: string;
  lastCollectTime: string;
  lastReadValue: string;
  currentCollectTime: string;
  readValue: string;
  useValue: string;
  operation: string;
}

export interface LossStatistic {
  lineId: string;
  lineName: string;
  fromNodeName: string;
  toNodeName: string;
  fromNodeLocation: string;
  toNodeLocation: string;
  deviceName?: string;
  inputEnergy: string | number;
  outputEnergy: string | number;
  lossEnergy: string | number;
  lossRate: string | number;
  collectTime?: string | number;
}

export interface LossStatisticsQuery {
  pageNumber: number;
  pageSize: number;
  startTime: string;
  endTime: string;
  lineName: string;
}

export interface CollectionCycleDetail {
  id: string;
  periodType: "EVERY_DAY" | "EVERY_WEEK" | "EVERY_MONTH";
  days: string;
  hourTime: string;
  lastExecuteTime: string;
  remark: string;
  createTime: string;
  createBy: string;
}

export interface LineConnection {
  id: string;
  lineName?: string;
  name?: string;
  fromNodeName?: string;
  toNodeName?: string;
  fromNodeLocation?: string;
  toNodeLocation?: string;
  nextList?: LineConnection[];
  [key: string]: unknown;
}

export interface SupplyNode {
  id: string;
  name: string;
  type: string;
  deviceIds?: string;
  childrenIds?: string;
  location?: string;
  webStyle?: string;
  [key: string]: unknown;
}

export interface SupplyEdge {
  id: string;
  lineName?: string;
  fromNodeId?: string;
  toNodeId?: string;
  fromDeviceId?: string;
  toDeviceId?: string;
  lineLossRate?: number;
  webStyle?: string;
  [key: string]: unknown;
}

export interface SupplyGraph {
  nodeList: SupplyNode[];
  connectionList: SupplyEdge[];
  [key: string]: unknown;
}

export interface LineLossTrendPoint {
  lineId: number;
  lineName: string;
  lossRate: number;
  inputEnergy: number;
  outputEnergy: number;
  collectTime: string;
}

export interface LineLossDeviceOption {
  id: string;
  name: string;
  code: string;
}

export interface LineLossDevices {
  fromDeviceList: LineLossDeviceOption[];
  toDeviceList: LineLossDeviceOption[];
}

export interface LineLossManagementClient {
  getCollectionRecords: (params: Record<string, unknown>) => Promise<PageResult<CollectionRecord>>;
  getLossStatistics: (params: LossStatisticsQuery) => Promise<PageResult<LossStatistic>>;
  saveCollectionCycle: (params: Partial<CollectionCycleDetail>) => Promise<boolean>;
  getCollectionCycle: () => Promise<CollectionCycleDetail>;
  getLineConnections: (params?: Record<string, unknown>) => Promise<PageResult<LineConnection>>;
  getSupplyGraph: () => Promise<SupplyGraph>;
  syncSupplyGraph: () => Promise<boolean>;
  getLineLossTrend: (params: { lineId: string; timeRange: string }) => Promise<LineLossTrendPoint[]>;
  getLineLossDevices: (params: { lineId: string }) => Promise<LineLossDevices>;
  updateLineLossDevices: (params: { id: string; fromDeviceId?: string; toDeviceId?: string }) => Promise<boolean>;
}
