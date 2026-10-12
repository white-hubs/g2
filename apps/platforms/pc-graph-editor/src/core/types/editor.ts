import type { Graph } from "@antv/x6";

/**
 * 编辑器配置选项
 */
export interface EditorOptions {
  /**
   * 画布容器
   */
  container?: HTMLElement | string;

  /**
   * 画布宽度
   */
  width?: number;

  /**
   * 画布高度
   */
  height?: number;

  /**
   * 是否显示网格
   */
  grid?: boolean | Exclude<ConstructorParameters<typeof Graph>[0]["grid"], boolean | undefined>;

  /**
   * 是否启用拖动画布
   */
  panning?: boolean | Exclude<ConstructorParameters<typeof Graph>[0]["panning"], boolean | undefined>;

  /**
   * 是否启用鼠标滚轮缩放
   */
  mousewheel?: boolean | Exclude<ConstructorParameters<typeof Graph>[0]["mousewheel"], boolean | undefined>;

  /**
   * 是否启用对齐线
   */
  snapline?: boolean | Record<string, unknown>;

  /**
   * 是否启用框选
   */
  selecting?: boolean | Record<string, unknown>;

  /**
   * 是否启用撤销重做
   */
  history?: boolean;

  /**
   * 是否启用滚动画布（无限画布）
   */
  scroller?:
    | boolean
    | {
        enabled?: boolean;
        pannable?: boolean;
        [key: string]: any;
      };

  /**
   * 是否启用小地图（缩略图）
   */
  minimap?:
    | boolean
    | {
        enabled?: boolean;
        container?: HTMLElement;
        width?: number;
        height?: number;
        [key: string]: any;
      };

  /**
   * 是否只读模式（业务可用于关闭删除等编辑能力）
   */
  readonly?: boolean;

  /**
   * 其他 X6 Graph 选项
   */
  [key: string]: any;
}

/**
 * 编辑器实例接口
 */
export interface EditorInstance {
  graph: Graph | null;
  getGraph: () => Graph | null;
  destroy: () => void;
  toJSON: () => any;
  fromJSON: (data: any) => void;
  [key: string]: any;
}
