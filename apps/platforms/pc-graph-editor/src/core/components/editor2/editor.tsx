import type { Graph } from "@antv/x6";
import { defineComponent, ref, provide, computed } from "vue";

import type { EditorOptions } from "../../types";
import { Canvas } from "../canvas2";

import "./editor.css";

/**
 * Editor 主编辑器组件
 *
 * 特性：
 * - 左中右三栏布局
 * - 使用具名插槽实现三栏内容可替换
 * - 提供默认实现，业务层可选择性覆盖
 * - 通过 provide/inject 向下传递 Graph 实例和选中状态
 */
export const Editor = defineComponent({
  name: "GraphEditor",
  props: {
    /**
     * 编辑器配置选项
     */
    options: {
      type: Object as () => EditorOptions,
      default: () => ({}),
    },
    /**
     * 左侧面板宽度
     */
    leftPanelWidth: {
      type: Number,
      default: 280,
    },
    /**
     * 右侧面板宽度
     */
    rightPanelWidth: {
      type: Number,
      default: 320,
    },
    /**
     * 是否显示左侧面板
     */
    showLeftPanel: {
      type: Boolean,
      default: true,
    },
    /**
     * 是否显示右侧面板
     */
    showRightPanel: {
      type: Boolean,
      default: true,
    },
  },
  emits: {
    /**
     * Graph 实例初始化完成
     */
    ready: (graph: Graph) => true,
  },
  setup(props, { emit, slots, expose }) {
    const canvasRef = ref<InstanceType<typeof Canvas> | null>(null);
    const graph = ref<Graph | null>(null);
    const selectedNodes = ref<any[]>([]);
    const selectedEdges = ref<any[]>([]);

    // 计算选中的元素
    const selectedElements = computed(() => ({
      nodes: selectedNodes.value,
      edges: selectedEdges.value,
      all: [...selectedNodes.value, ...selectedEdges.value],
    }));

    // 处理 Graph 就绪事件
    const handleGraphReady = (graphInstance: Graph) => {
      graph.value = graphInstance;

      // 监听选择变化
      graphInstance.on("selection:changed", ({ added, removed }) => {
        const cells = graphInstance.getSelectedCells();
        selectedNodes.value = cells.filter((cell) => cell.isNode());
        selectedEdges.value = cells.filter((cell) => cell.isEdge());
      });

      // 监听节点/边点击
      graphInstance.on("node:click", () => {
        const cells = graphInstance.getSelectedCells();
        selectedNodes.value = cells.filter((cell) => cell.isNode());
        selectedEdges.value = cells.filter((cell) => cell.isEdge());
      });

      graphInstance.on("edge:click", () => {
        const cells = graphInstance.getSelectedCells();
        selectedNodes.value = cells.filter((cell) => cell.isNode());
        selectedEdges.value = cells.filter((cell) => cell.isEdge());
      });

      // 监听画布点击（清空选择）
      graphInstance.on("blank:click", () => {
        selectedNodes.value = [];
        selectedEdges.value = [];
      });

      emit("ready", graphInstance);
    };

    // Provide graph 实例，供子组件使用
    provide("graph", graph);
    provide("selectedElements", selectedElements);

    // 获取 Graph 实例
    const getGraph = () => graph.value;

    // 获取 Canvas 实例
    const getCanvas = () => canvasRef.value;

    // 暴露方法给父组件
    expose({
      graph,
      getGraph,
      getCanvas,
      selectedElements,
    });

    return () => (
      <div class="graph-editor">
        {/* 左侧面板 */}
        {props.showLeftPanel && (
          <aside class="graph-editor__left-panel" style={{ width: `${props.leftPanelWidth}px` }}>
            {slots["left-panel"]?.() || (
              <div class="graph-editor__panel-placeholder">
                <p>左侧面板</p>
                <small>使用 #left-panel 插槽自定义内容</small>
              </div>
            )}
          </aside>
        )}

        {/* 中间画布区域 */}
        <main class="graph-editor__canvas-container">
          {/* 工具栏插槽 */}
          {slots.toolbar && <div class="graph-editor__toolbar">{slots.toolbar()}</div>}

          {/* 画布 */}
          <Canvas ref={canvasRef} options={props.options} onReady={handleGraphReady} />
        </main>

        {/* 右侧面板 */}
        {props.showRightPanel && (
          <aside class="graph-editor__right-panel" style={{ width: `${props.rightPanelWidth}px` }}>
            {slots["right-panel"]?.(selectedElements.value) || (
              <div class="graph-editor__panel-placeholder">
                <p>右侧属性面板</p>
                <small>使用 #right-panel 插槽自定义内容</small>
                {selectedElements.value.all.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    <p>已选中: {selectedElements.value.all.length} 个元素</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    );
  },
});

export default Editor;
