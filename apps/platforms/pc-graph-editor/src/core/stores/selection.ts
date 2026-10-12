import type { Cell } from "@antv/x6";
import { defineStore } from "pinia";

interface SelectionState {
  selectedIds: string[];
  selectedCells: Cell[];
}

/**
 * 选中状态管理
 */
export const useSelectionStore = defineStore("selection", {
  state: (): SelectionState => ({
    selectedIds: [],
    selectedCells: [],
  }),

  getters: {
    /**
     * 是否有选中的元素
     */
    hasSelection: (state) => state.selectedIds.length > 0,

    /**
     * 选中元素数量
     */
    selectionCount: (state) => state.selectedIds.length,

    /**
     * 选中的节点
     */
    selectedNodes: (state) => {
      return state.selectedCells.filter((cell) => cell.isNode());
    },

    /**
     * 选中的连线
     */
    selectedEdges: (state) => {
      return state.selectedCells.filter((cell) => cell.isEdge());
    },

    /**
     * 是否只选中了一个元素
     */
    isSingleSelection: (state) => state.selectedIds.length === 1,

    /**
     * 是否选中了多个元素
     */
    isMultipleSelection: (state) => state.selectedIds.length > 1,

    /**
     * 检查某个元素是否被选中
     */
    isSelected: (state) => (id: string) => {
      return state.selectedIds.includes(id);
    },
  },

  actions: {
    /**
     * 设置选中的元素
     */
    setSelection(cells: Cell[]) {
      this.selectedCells = cells;
      this.selectedIds = cells.map((cell) => cell.id);
    },

    /**
     * 添加到选中列表
     */
    addToSelection(cells: Cell[]) {
      const newCells = cells.filter((cell) => !this.selectedIds.includes(cell.id));
      this.selectedCells = [...this.selectedCells, ...newCells];
      this.selectedIds = this.selectedCells.map((cell) => cell.id);
    },

    /**
     * 从选中列表移除
     */
    removeFromSelection(cellIds: string[]) {
      this.selectedCells = this.selectedCells.filter((cell) => !cellIds.includes(cell.id));
      this.selectedIds = this.selectedCells.map((cell) => cell.id);
    },

    /**
     * 清空选择
     */
    clearSelection() {
      this.selectedCells = [];
      this.selectedIds = [];
    },

    /**
     * 选择全部
     */
    selectAll(cells: Cell[]) {
      this.selectedCells = cells;
      this.selectedIds = cells.map((cell) => cell.id);
    },

    /**
     * 切换选择状态
     */
    toggleSelection(cell: Cell) {
      const index = this.selectedIds.indexOf(cell.id);
      if (index > -1) {
        this.selectedCells.splice(index, 1);
        this.selectedIds.splice(index, 1);
      } else {
        this.selectedCells.push(cell);
        this.selectedIds.push(cell.id);
      }
    },
  },
});
