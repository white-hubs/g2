import type { Graph, History } from "@antv/x6";
import { type Ref, computed } from "vue";

/**
 * 撤销重做功能
 *
 * @param graph - Graph 实例的 ref
 * @returns 历史记录相关方法和状态
 */
export function useHistory(graph: Ref<Graph | null>) {
  /**
   * 是否可以撤销
   */
  const canUndo = computed(() => {
    if (!graph.value || !graph.value.getPlugin("history")) return false;
    return graph.value.canUndo();
  });

  /**
   * 是否可以重做
   */
  const canRedo = computed(() => {
    if (!graph.value || !graph.value.getPlugin("history")) return false;
    return graph.value.canRedo();
  });

  /**
   * 撤销
   */
  const undo = () => {
    if (!graph.value || !graph.value.getPlugin("history")) return;
    if (graph.value.canUndo()) {
      graph.value.undo();
    }
  };

  /**
   * 重做
   */
  const redo = () => {
    if (!graph.value || !graph.value.getPlugin("history")) return;
    if (graph.value.canRedo()) {
      graph.value.redo();
    }
  };

  /**
   * 清空历史记录
   */
  const clearHistory = () => {
    if (!graph.value || !graph.value.getPlugin("history")) return;
    graph.value.getPlugin<History>("history")?.clean();
  };

  /**
   * 获取撤销栈大小
   */
  const getUndoStackSize = () => {
    if (!graph.value || !graph.value.getPlugin("history")) return 0;
    return graph.value.getPlugin<History>("history")?.getUndoSize() ?? 0;
  };

  /**
   * 获取重做栈大小
   */
  const getRedoStackSize = () => {
    if (!graph.value || !graph.value.getPlugin("history")) return 0;
    return graph.value.getPlugin<History>("history")?.getRedoSize() ?? 0;
  };

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
    getUndoStackSize,
    getRedoStackSize,
  };
}
