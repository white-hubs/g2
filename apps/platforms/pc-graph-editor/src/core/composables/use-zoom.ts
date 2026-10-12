import type { Graph } from "@antv/x6";
import { type Ref, ref } from "vue";

/**
 * 缩放与平移功能
 *
 * @param graph - Graph 实例的 ref
 * @returns 缩放相关方法和状态
 */
export function useZoom(graph: Ref<Graph | null>) {
  const zoom = ref(1);
  const minZoom = 0.1;
  const maxZoom = 4;

  /**
   * 设置缩放
   */
  const setZoom = (value: number, options?: { center?: { x: number; y: number } }) => {
    if (!graph.value) return;

    const newZoom = Math.max(minZoom, Math.min(maxZoom, value));

    if (options?.center) {
      graph.value.scale(newZoom, newZoom, options.center.x, options.center.y);
    } else {
      graph.value.scale(newZoom, newZoom);
    }

    zoom.value = newZoom;
  };

  /**
   * 放大
   */
  const zoomIn = (factor = 0.1) => {
    const newZoom = zoom.value + factor;
    setZoom(newZoom);
  };

  /**
   * 缩小
   */
  const zoomOut = (factor = 0.1) => {
    const newZoom = zoom.value - factor;
    setZoom(newZoom);
  };

  /**
   * 重置缩放
   */
  const zoomTo = (value: number) => {
    setZoom(value);
  };

  /**
   * 适应画布
   */
  const zoomToFit = (options?: { padding?: number; maxScale?: number; minScale?: number }) => {
    if (!graph.value) return;

    graph.value.zoomToFit({
      padding: options?.padding || 20,
      maxScale: options?.maxScale || maxZoom,
      minScale: options?.minScale || minZoom,
    });

    zoom.value = graph.value.scale().sx;
  };

  /**
   * 实际大小（100%）
   */
  const zoomToActual = () => {
    setZoom(1);
  };

  /**
   * 居中显示
   */
  const centerContent = () => {
    if (!graph.value) return;
    graph.value.centerContent();
  };

  /**
   * 居中显示指定单元格
   */
  const centerCell = (cellId: string) => {
    if (!graph.value) return;
    const cell = graph.value.getCellById(cellId);
    if (cell) {
      graph.value.centerCell(cell);
    }
  };

  // 监听图的缩放事件
  if (graph.value) {
    graph.value.on("scale", ({ sx }) => {
      zoom.value = sx;
    });
  }

  return {
    zoom,
    minZoom,
    maxZoom,
    setZoom,
    zoomIn,
    zoomOut,
    zoomTo,
    zoomToFit,
    zoomToActual,
    centerContent,
    centerCell,
  };
}
