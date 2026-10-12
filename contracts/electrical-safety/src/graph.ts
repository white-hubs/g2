export interface SavedNode {
  id: string;
  name: string;
  type: string;
  /** 设备 ID 列表，使用中文逗号拼接的字符串 */
  deviceIds?: string;
  /** 子节点 ID 列表，使用中文逗号拼接的字符串 */
  childrenIds?: string;
  /** 业务上的“所在位置”字段（字符串），不是节点坐标 */
  location?: string;
  webStyle?: string;
  [key: string]: unknown;
}

export interface SavedEdge {
  id: string;
  lineName?: string;
  fromNodeId?: string;
  toNodeId?: string;
  webStyle?: string;
  [key: string]: unknown;
}

export interface SavedPayload {
  nodeList: SavedNode[];
  connectionList: SavedEdge[];
  [key: string]: unknown;
}

export interface SavedLinePayload {
  nodeList: SavedNode[];
  connectionList: SavedLineEdge[];
  [key: string]: unknown;
}

export interface SavedLineEdge {
  id: string;
  lineName?: string;
  fromNodeId?: string;
  toNodeId?: string;
  webStyle?: string;
  [key: string]: unknown;
  fromDeviceId?: string;
  toDeviceId?: string;
  lineLossRate?: number;
}

export interface LineLossTrend {
  lineId: number;
  lineName: string;
  lossRate: number;
  inputEnergy: number;
  outputEnergy: number;
  collectTime: string;
}

export interface LineLossDevice {
  fromDeviceList: DeviceList[];
  toDeviceList: DeviceList[];
}
export interface DeviceList {
  id: string;
  name: string;
  code: string;
}

export interface GraphClient {
  saveGraph(payload: SavedPayload): Promise<boolean>;
  loadGraph(): Promise<SavedPayload>;
  getNewId(num: number): Promise<number[]>;
  loadLineGraph(): Promise<SavedPayload>;
  updateLine(): Promise<boolean>;
  getLineLossTrend(payload: { lineId: string; timeRange: string }): Promise<LineLossTrend[]>;
  getLineLossDevice(payload: { lineId: string }): Promise<LineLossDevice>;
  updateLineLossDevice(payload: { id: string; fromDeviceId?: string; toDeviceId?: string }): Promise<boolean>;
}
