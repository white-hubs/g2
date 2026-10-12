import { defineComponent, ref, onMounted, onUnmounted } from "vue";

import { useDragDrop } from "../../composables/use-drag-drop";
import { useGraph } from "../../composables/use-graph";
import type { EditorOptions } from "../../types";

import "./canvas.css";

/**
 * Canvas 画布组件
 *
 * 核心职责：
 * - 初始化 X6 Graph 实例
 * - 管理画布尺寸、缩放、平移
 * - 集成 X6 插件（网格、对齐线、框选等）
 * - 暴露画布 API 给外部
 */
export const Canvas = defineComponent({
  name: "GraphCanvas",
  props: {
    /**
     * 编辑器配置选项
     */
    options: {
      type: Object as () => EditorOptions,
      default: () => ({}),
    },
  },
  emits: {
    /**
     * Graph 实例初始化完成
     */
    ready: (graph: any) => true,
  },
  setup(props, { emit, expose }) {
    // 容器元素引用
    const containerRef = ref<HTMLElement | null>(null);

    // 使用 useGraph composable
    const { graph, initGraph, getGraph, destroyGraph, toJSON, fromJSON, clearGraph, resizeGraph, zoomToFit, centerContent } =
      useGraph(containerRef);

    // 支持从左侧面板拖拽元素到画布创建
    const { onDragEnter, onDragOver, onDragLeave, onDrop } = useDragDrop(graph as any);

    // 组件挂载后初始化 Graph
    onMounted(() => {
      const graphInstance = initGraph(props.options);
      if (graphInstance) {
        emit("ready", graphInstance);
      }

      // 绑定拖拽落点事件（在画布容器上接收 drop）
      // 使用捕获阶段：X6 Scroller / SVG 等子节点可能先收到事件，冒泡阶段无法可靠触发 drop
      const useCapture = true;
      if (containerRef.value) {
        containerRef.value.addEventListener("dragenter", onDragEnter as any, useCapture);
        containerRef.value.addEventListener("dragover", onDragOver as any, useCapture);
        containerRef.value.addEventListener("dragleave", onDragLeave as any, useCapture);
        containerRef.value.addEventListener("drop", onDrop as any, useCapture);
      }

      // Shell 的侧栏、页面标题及左右属性面板都会改变实际可视区宽度，
      // 仅监听 window resize 会漏掉这些布局变化，导致首次进入时 X6 仍使用挂载瞬间的错误尺寸。
      const handleResize = () => {
        resizeGraph();
      };
      const viewportElement =
        (containerRef.value?.closest(".x6-graph-scroller") as HTMLElement | null) ?? containerRef.value?.parentElement;
      const resizeObserver =
        typeof ResizeObserver === "undefined" || !viewportElement
          ? null
          : new ResizeObserver((entries) => {
              const entry = entries[0];
              if (!entry) {
                return;
              }
              const { width, height } = entry.contentRect;
              resizeGraph(width, height);
            });
      if (resizeObserver && viewportElement) {
        resizeObserver.observe(viewportElement);
      }
      window.addEventListener("resize", handleResize);

      // 清理监听器
      onUnmounted(() => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", handleResize);
        if (containerRef.value) {
          containerRef.value.removeEventListener("dragenter", onDragEnter as any, useCapture);
          containerRef.value.removeEventListener("dragover", onDragOver as any, useCapture);
          containerRef.value.removeEventListener("dragleave", onDragLeave as any, useCapture);
          containerRef.value.removeEventListener("drop", onDrop as any, useCapture);
        }
      });
    });

    // 暴露方法给父组件
    expose({
      graph,
      getGraph,
      destroyGraph,
      toJSON,
      fromJSON,
      clearGraph,
      resizeGraph,
      zoomToFit,
      centerContent,
    });

    return () => <div class="graph-canvas" ref={containerRef}></div>;
  },
});

export default Canvas;
