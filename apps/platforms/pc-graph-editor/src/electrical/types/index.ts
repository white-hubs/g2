/**
 * 电气节点类型
 */
export type ElectricalNodeType = "root" | "branch" | "device";

/**
 * 电气节点接口
 */
export interface ElectricalNode {
  id: string;
  name: string;
  type: ElectricalNodeType;
  children?: ElectricalNode[];
  /** 子节点 id 列表，导出时使用以避免循环引用 */
  childrenIds?: string[];
  deviceId?: string;
  metadata?: Record<string, any>;
  /**
   * 线损率（百分比，0-100）
   * 用于显示从父节点到当前节点的线损情况
   */
  lineLoss?: number;
}

/**
 * 设备绑定信息
 */
export interface DeviceBinding {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  parameters?: Record<string, any>;
  [key: string]: any;
}

/**
 * 电气数据
 */
export interface ElectricalData {
  /**
   * 节点树（支持多根）
   */
  nodes: ElectricalNode[];

  /**
   * 图形数据
   */
  graph: {
    nodes: any[];
    edges: any[];
  };

  /**
   * 设备绑定关系
   */
  deviceBindings: Record<string, DeviceBinding>;

  /**
   * 其他元数据
   */
  metadata?: Record<string, any>;
}
