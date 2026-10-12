import type { Graph, Edge } from "@antv/x6";
import { type Ref } from "vue";

/**
 * 连线管理功能
 *
 * @param graph - Graph 实例的 ref
 * @returns 连线相关方法
 */
export function useConnect(graph: Ref<Graph | null>) {
  /**
   * 创建连线
   */
  const createEdge = (source: string, target: string, options?: any) => {
    if (!graph.value) return null;

    const edge = graph.value.addEdge({
      source,
      target,
      data: {
        from: source,
        to: target,
      },
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
      ...options,
    });

    return edge;
  };

  /**
   * 删除连线
   */
  const removeEdge = (edgeId: string) => {
    if (!graph.value) return;
    graph.value.removeEdge(edgeId);
  };

  /**
   * 获取节点的所有连线
   */
  const getConnectedEdges = (nodeId: string) => {
    if (!graph.value) return [];
    const node = graph.value.getCellById(nodeId);
    if (!node || !node.isNode()) return [];
    return graph.value.getConnectedEdges(node);
  };

  /**
   * 获取节点的入边
   */
  const getIncomingEdges = (nodeId: string) => {
    if (!graph.value) return [];
    const node = graph.value.getCellById(nodeId);
    if (!node || !node.isNode()) return [];
    return graph.value.getIncomingEdges(node) || [];
  };

  /**
   * 获取节点的出边
   */
  const getOutgoingEdges = (nodeId: string) => {
    if (!graph.value) return [];
    const node = graph.value.getCellById(nodeId);
    if (!node || !node.isNode()) return [];
    return graph.value.getOutgoingEdges(node) || [];
  };

  /**
   * 检查两个节点是否连接
   */
  const isConnected = (sourceId: string, targetId: string) => {
    if (!graph.value) return false;
    const edges = graph.value.getEdges();
    return edges.some((edge) => edge.getSourceCellId() === sourceId && edge.getTargetCellId() === targetId);
  };

  /**
   * 更新连线样式
   */
  const updateEdgeStyle = (edgeId: string, attrs: any) => {
    if (!graph.value) return;
    const edge = graph.value.getCellById(edgeId) as Edge;
    if (edge && edge.isEdge()) {
      edge.setAttrs(attrs);
    }
  };

  /**
   * 设置连线标签
   */
  const setEdgeLabel = (edgeId: string, label: string | any) => {
    if (!graph.value) return;
    const edge = graph.value.getCellById(edgeId) as Edge;
    if (edge && edge.isEdge()) {
      edge.setLabels(typeof label === "string" ? [{ attrs: { label: { text: label } } }] : [label]);
    }
  };

  /**
   * 高亮连线
   */
  const highlightEdge = (edgeId: string, color = "#ff4d4f") => {
    if (!graph.value) return;
    const edge = graph.value.getCellById(edgeId) as Edge;
    if (edge && edge.isEdge()) {
      edge.attr("line/stroke", color);
      edge.attr("line/strokeWidth", 3);
    }
  };

  /**
   * 取消高亮连线
   */
  const unhighlightEdge = (edgeId: string) => {
    if (!graph.value) return;
    const edge = graph.value.getCellById(edgeId) as Edge;
    if (edge && edge.isEdge()) {
      edge.attr("line/stroke", "#1890ff");
      edge.attr("line/strokeWidth", 2);
    }
  };

  return {
    createEdge,
    removeEdge,
    getConnectedEdges,
    getIncomingEdges,
    getOutgoingEdges,
    isConnected,
    updateEdgeStyle,
    setEdgeLabel,
    highlightEdge,
    unhighlightEdge,
  };
}
