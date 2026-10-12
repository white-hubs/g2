import type { Edge } from "@antv/x6";

/**
 * 连线数据接口
 */
export interface EdgeData {
  id: string;
  source: string | { cell: string; port?: string };
  target: string | { cell: string; port?: string };
  attrs?: Record<string, any>;
  labels?: any[];
  data?: Record<string, any>;
  [key: string]: any;
}

/**
 * 连线元数据（用于 X6）
 */
export type EdgeMetadata = ReturnType<Edge["toJSON"]>;

/**
 * 连线配置
 */
export interface EdgeConfig {
  attrs?: Record<string, any>;
  router?: any;
  connector?: any;
  [key: string]: any;
}
