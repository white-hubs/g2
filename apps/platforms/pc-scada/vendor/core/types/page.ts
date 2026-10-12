import type { ElementInstance } from "./instance";

export interface TagAlias {
  alias: string;
  tagName: string;
}

export interface GridConfig {
  show: boolean;
  size: number;
  snap: boolean;
}

export interface TagDefinition {
  name: string;
  type: "boolean" | "number" | "string";
  label?: string;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}

/** 组态页仅绑定产品；运行端由具体设备实例注入实时数据（设备监测页按产品 id 匹配页面） */
export interface ProductBinding {
  id: string;
  name?: string;
  categoryCode?: string;
  categoryName?: string;
}

/** 图元之间的连线（四边中点连接桩、正交折线，与 X6 router/connector 名称一致） */
export interface PageConnection {
  id: string;
  source: { cellId: string; port?: string };
  target: { cellId: string; port?: string };
  /** 画布坐标系下的中间拐点（由 Manhattan 路由或手动调整产生） */
  vertices?: Array<{ x: number; y: number }>;
  /**
   * 整条连线在画布上的折点序列（与 X6 connector：sourcePoint + routePoints + targetPoint 一致）。
   * 若存在且与端口锚点吻合，运行端优先按此描边。
   */
  polyline?: Array<{ x: number; y: number }>;
  /** 默认 normal（直角折线） */
  connector?: { name: string; args?: Record<string, unknown> };
  /** 默认 manhattan（正交路由） */
  router?: { name: string; args?: Record<string, unknown> };
  stroke?: string;
  strokeWidth?: number;
  zIndex?: number;
}

export interface PageModel {
  version: string;
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  grid: GridConfig;
  globals: Record<string, string>;
  aliases: TagAlias[];
  tags: TagDefinition[];
  product?: ProductBinding;
  elements: ElementInstance[];
  /** 节点间连线（source/target 对应图元 id） */
  connections: PageConnection[];
}
