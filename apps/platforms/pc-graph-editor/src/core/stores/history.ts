import { defineStore } from "pinia";

interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: any[];
  redoStack: any[];
}

/**
 * 历史记录管理
 */
export const useHistoryStore = defineStore("history", {
  state: (): HistoryState => ({
    canUndo: false,
    canRedo: false,
    undoStack: [],
    redoStack: [],
  }),

  getters: {
    /**
     * 撤销栈大小
     */
    undoStackSize: (state) => state.undoStack.length,

    /**
     * 重做栈大小
     */
    redoStackSize: (state) => state.redoStack.length,
  },

  actions: {
    /**
     * 更新撤销重做状态
     */
    updateState(canUndo: boolean, canRedo: boolean) {
      this.canUndo = canUndo;
      this.canRedo = canRedo;
    },

    /**
     * 添加到撤销栈
     */
    pushUndo(action: any) {
      this.undoStack.push(action);
      this.canUndo = true;
      // 清空重做栈
      this.redoStack = [];
      this.canRedo = false;
    },

    /**
     * 从撤销栈弹出
     */
    popUndo() {
      if (this.undoStack.length === 0) return null;

      const action = this.undoStack.pop();
      this.redoStack.push(action);

      this.canUndo = this.undoStack.length > 0;
      this.canRedo = true;

      return action;
    },

    /**
     * 从重做栈弹出
     */
    popRedo() {
      if (this.redoStack.length === 0) return null;

      const action = this.redoStack.pop();
      this.undoStack.push(action);

      this.canRedo = this.redoStack.length > 0;
      this.canUndo = true;

      return action;
    },

    /**
     * 清空历史记录
     */
    clear() {
      this.undoStack = [];
      this.redoStack = [];
      this.canUndo = false;
      this.canRedo = false;
    },
  },
});
