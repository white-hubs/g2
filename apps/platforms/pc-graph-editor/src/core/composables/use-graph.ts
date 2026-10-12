import { Graph, History, Keyboard, Clipboard, Snapline, MiniMap, Scroller, Selection } from "@antv/x6";
import { shallowRef, ref, onUnmounted, type Ref } from "vue";

import type { EditorOptions } from "../types";

/**
 * X6 Graph 实例管理
 *
 * @param container - 画布容器的 ref
 * @returns Graph 实例和相关方法
 */
export function useGraph(container: Ref<HTMLElement | null>) {
  const graph = shallowRef<Graph | null>(null);

  const getViewportSize = (): { width: number; height: number } => {
    const canvas = container.value;
    const viewport = (canvas?.closest(".x6-graph-scroller") as HTMLElement | null) ?? canvas?.parentElement ?? canvas;
    return {
      width: viewport?.clientWidth ?? 0,
      height: viewport?.clientHeight ?? 0,
    };
  };

  /**
   * 初始化 Graph 实例
   */
  const initGraph = (options: EditorOptions = {}) => {
    if (!container.value) {
      return;
    }

    // 销毁已存在的实例
    if (graph.value) {
      graph.value.dispose();
    }

    // 创建新的 Graph 实例
    const viewportSize = getViewportSize();
    graph.value = new Graph({
      width: options.width || viewportSize.width,
      height: options.height || viewportSize.height,

      // 网格配置
      grid:
        options.grid !== false
          ? {
              size: 10,
              visible: true,
              type: "dot",
              args: {
                color: "#e5e5e5",
                thickness: 1,
              },
            }
          : false,

      // 画布拖动（支持右键拖动和 Shift+左键拖动）
      panning:
        options.panning !== false
          ? {
              enabled: true,
              eventTypes: ["leftMouseDown", "rightMouseDown"],
              modifiers: ["shift"],
            }
          : false,

      // 鼠标滚轮缩放（按住 ctrl/meta + 滚轮缩放）
      mousewheel:
        options.mousewheel !== false
          ? {
              enabled: true,
              modifiers: ["ctrl", "meta"],
              minScale: 0.1,
              maxScale: 4,
            }
          : false,

      // 连线
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        allowNode: true,
        allowEdge: false,
        allowPort: true,
        highlight: true,
        anchor: "center",
        connectionPoint: "anchor",
        router: {
          name: "manhattan",
        },
        connector: {
          name: "rounded",
          args: {
            radius: 8,
          },
        },
        createEdge() {
          return this.createEdge({
            shape: "edge",
            attrs: {
              line: {
                stroke: "#5F95FF",
                strokeWidth: 3,
                strokeLinejoin: "round",
                targetMarker: {
                  name: "block",
                  width: 12,
                  height: 8,
                },
              },
            },
            zIndex: 0,
          });
        },
        validateMagnet({ magnet }) {
          // 允许从任意连接桩拉出连线（top/bottom 都可作为开始端口）
          return true;
        },
      },

      // 高亮
      highlighting: {
        magnetAvailable: {
          name: "stroke",
          args: {
            padding: 4,
            attrs: {
              strokeWidth: 4,
              stroke: "rgba(24, 144, 255, 0.6)",
            },
          },
        },
        magnetAdsorbed: {
          name: "stroke",
          args: {
            attrs: {
              fill: "#5F95FF",
              stroke: "#5F95FF",
            },
          },
        },
      },

      // 画布自动调整大小
      autoResize: true,

      // 合并其他选项（会覆盖上面的默认配置）
      ...options,
      container: container.value,
    });
    if (options.history !== false) graph.value.use(new History({ enabled: true }));
    graph.value.use(new Keyboard({ enabled: true }));
    graph.value.use(new Clipboard({ enabled: true }));
    if (options.snapline !== false) graph.value.use(new Snapline({ enabled: true }));

    // 删除：Delete/Backspace 删除选中的节点/连线（只读模式下不绑定删除快捷键）
    if ((graph.value as any).bindKey && !(options as any).readonly) {
      (graph.value as any).bindKey(["backspace", "delete"], () => {
        var active = document.activeElement as HTMLElement | null;
        var tag = active?.tagName?.toLowerCase?.() || "";
        if (tag === "input" || tag === "textarea") {
          return false;
        }
        var cells = graph.value?.getSelectedCells?.() || [];
        if (cells.length > 0) {
          graph.value?.removeCells?.(cells);
        }
        return false;
      });
    }

    // 使用 Scroller 插件（滚动画布，支持触控板双指滑动）
    // 默认启用，除非显式设置 scroller: false
    if (options.scroller !== false) {
      const scrollerOptions =
        typeof options.scroller === "object"
          ? {
              enabled: true,
              pannable: true,
              pageVisible: false,
              pageBreak: false,
              autoResize: true,
              padding: 40,
              ...options.scroller,
            }
          : {
              enabled: true,
              pannable: true,
              pageVisible: false,
              pageBreak: false,
              autoResize: true,
              // 在内容包围盒外保留可交互空白，避免仅「有节点」区域能命中拖放
              padding: 40,
            };

      graph.value.use(new Scroller(scrollerOptions));
    }

    // 使用 MiniMap 插件（小地图）
    if (options.minimap) {
      const minimapOptions =
        typeof options.minimap === "boolean" ? { enabled: true, container: undefined } : { enabled: true, ...options.minimap };

      if (minimapOptions.enabled) {
        graph.value.use(new MiniMap(minimapOptions));
      }
    }

    // 使用 Selection 插件（框选和选择）
    if (options.selecting !== false) {
      const selectionOptions = typeof options.selecting === "object" ? options.selecting : {};

      graph.value.use(
        new Selection({
          enabled: true,
          multiple: true,
          rubberband: true,
          movable: true,
          showNodeSelectionBox: true,
          ...selectionOptions,
        }),
      );
    }

    return graph.value;
  };

  /**
   * 获取 Graph 实例
   */
  const getGraph = () => graph.value;

  /**
   * 销毁 Graph 实例
   */
  const destroyGraph = () => {
    if (graph.value) {
      graph.value.dispose();
      graph.value = null;
    }
  };

  /**
   * 导出 JSON 数据
   */
  const toJSON = () => {
    return graph.value?.toJSON() || null;
  };

  /**
   * 从 JSON 数据加载
   */
  const fromJSON = (data: any) => {
    if (graph.value && data) {
      graph.value.fromJSON(data);
    }
  };

  /**
   * 清空画布
   */
  const clearGraph = () => {
    if (graph.value) {
      graph.value.clearCells();
    }
  };

  /**
   * 自适应画布大小
   */
  const resizeGraph = (width?: number, height?: number) => {
    if (graph.value && container.value) {
      const viewportSize = getViewportSize();
      const w = width ?? viewportSize.width;
      const h = height ?? viewportSize.height;
      if (w > 0 && h > 0) {
        graph.value.resize(w, h);
      }
    }
  };

  /**
   * 缩放画布到适应内容
   */
  const zoomToFit = (options?: Parameters<Graph["zoomToFit"]>[0]) => {
    if (graph.value) {
      graph.value.zoomToFit({
        padding: 20,
        maxScale: 1,
        ...options,
      });
    }
  };

  /**
   * 居中显示内容
   */
  const centerContent = () => {
    if (graph.value) {
      graph.value.centerContent();
    }
  };

  // 组件卸载时清理
  onUnmounted(() => {
    destroyGraph();
  });

  return {
    graph,
    initGraph,
    getGraph,
    destroyGraph,
    toJSON,
    fromJSON,
    clearGraph,
    resizeGraph,
    zoomToFit,
    centerContent,
  };
}
