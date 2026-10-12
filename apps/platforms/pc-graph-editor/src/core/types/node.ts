import type { Node } from "@antv/x6";

/**
 * 节点数据接口
 */
export interface NodeData {
  id: string;
  shape: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: string;
  data?: Record<string, any>;
  ports?: ReturnType<Node["toJSON"]>["ports"];
  [key: string]: any;
}

/**
 * 节点元数据（用于 X6）
 */
export type NodeMetadata = ReturnType<Node["toJSON"]>;

/**
 * 节点配置
 */
export interface NodeConfig {
  shape: string;
  width?: number;
  height?: number;
  attrs?: Record<string, any>;
  ports?: any;
  [key: string]: any;
}
