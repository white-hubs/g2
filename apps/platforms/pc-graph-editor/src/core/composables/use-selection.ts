import type { Graph, Cell } from "@antv/x6";
import { type Ref, computed } from "vue";

/**
 * 选择与多选功能
 *
 * @param graph - Graph 实例的 ref
 * @returns 选择相关方法和状态
 */
export function useSelection(graph: Ref<Graph | null>) {
  /**
   * 获取选中的单元格
   */
  const getSelectedCells = () => {
    if (!graph.value) return [];
    return graph.value.getSelectedCells();
  };

  /**
   * 选中的节点
   */
  const selectedNodes = computed(() => {
    if (!graph.value) return [];
    return graph.value.getSelectedCells().filter((cell) => cell.isNode());
  });

  /**
   * 选中的连线
   */
  const selectedEdges = computed(() => {
    if (!graph.value) return [];
    return graph.value.getSelectedCells().filter((cell) => cell.isEdge());
  });

  /**
   * 是否有选中
   */
  const hasSelection = computed(() => {
    return getSelectedCells().length > 0;
  });

  /**
   * 选中单元格
   */
  const select = (cells: Cell | Cell[]) => {
    if (!graph.value) return;
    graph.value.select(cells);
  };

  /**
   * 取消选中
   */
  const unselect = (cells: Cell | Cell[]) => {
    if (!graph.value) return;
    graph.value.unselect(cells);
  };

  /**
   * 清空选择
   */
  const clearSelection = () => {
    if (!graph.value) return;
    graph.value.cleanSelection();
  };

  /**
   * 选择全部
   */
  const selectAll = () => {
    if (!graph.value) return;
    const cells = graph.value.getCells();
    graph.value.select(cells);
  };

  /**
   * 反选
   */
  const invertSelection = () => {
    if (!graph.value) return;
    const allCells = graph.value.getCells();
    const selectedCells = graph.value.getSelectedCells();
    const selectedIds = new Set(selectedCells.map((cell) => cell.id));
    const unselectedCells = allCells.filter((cell) => !selectedIds.has(cell.id));
    graph.value.cleanSelection();
    graph.value.select(unselectedCells);
  };

  /**
   * 删除选中的元素
   */
  const deleteSelection = () => {
    if (!graph.value) return;
    const cells = graph.value.getSelectedCells();
    if (cells.length > 0) {
      graph.value.removeCells(cells);
    }
  };

  /**
   * 复制选中的元素
   */
  const copySelection = () => {
    if (!graph.value) return;
    const cells = graph.value.getSelectedCells();
    if (cells.length > 0) {
      graph.value.copy(cells);
    }
  };

  /**
   * 剪切选中的元素
   */
  const cutSelection = () => {
    if (!graph.value) return;
    const cells = graph.value.getSelectedCells();
    if (cells.length > 0) {
      graph.value.cut(cells);
    }
  };

  /**
   * 粘贴
   */
  const paste = () => {
    if (!graph.value) return;
    graph.value.paste();
  };

  /**
   * 组合选中的节点
   */
  const groupSelection = () => {
    if (!graph.value) return;
    const cells = graph.value.getSelectedCells();
    const nodes = cells.filter((cell) => cell.isNode());
    if (nodes.length > 1) {
      const parent = graph.value.addNode({
        shape: "rect",
        attrs: {
          body: {
            fill: "transparent",
            stroke: "#1890ff",
            strokeWidth: 2,
            strokeDasharray: "5 5",
          },
        },
      });
      nodes.forEach((node) => parent.addChild(node));
      return parent;
    }
  };

  /**
   * 取消组合
   */
  const ungroupSelection = () => {
    if (!graph.value) return;
    const cells = graph.value.getSelectedCells();
    cells.forEach((cell) => {
      if (cell.isNode() && cell.getChildren()?.length) {
        const children = cell.getChildren() || [];
        children.forEach((child) => cell.removeChild(child));
        graph.value?.removeNode(cell.id);
        graph.value?.select(children);
      }
    });
  };

  return {
    selectedNodes,
    selectedEdges,
    hasSelection,
    getSelectedCells,
    select,
    unselect,
    clearSelection,
    selectAll,
    invertSelection,
    deleteSelection,
    copySelection,
    cutSelection,
    paste,
    groupSelection,
    ungroupSelection,
  };
}
