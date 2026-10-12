import type { Graph } from "@antv/x6";
import { defineStore } from "pinia";

import type { NodeData, EdgeData } from "../types";

interface GraphState {
  graph: Graph | null;
  nodes: NodeData[];
  edges: EdgeData[];
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * 画布状态管理
 */
export const useGraphStore = defineStore("graph", {
  state: (): GraphState => ({
    graph: null,
    nodes: [],
    edges: [],
    zoom: 1,
    canUndo: false,
    canRedo: false,
  }),

  getters: {
    /**
     * 获取节点数量
     */
    nodeCount: (state) => state.nodes.length,

    /**
     * 获取连线数量
     */
    edgeCount: (state) => state.edges.length,

    /**
     * 根据 ID 获取节点
     */
    getNodeById: (state) => (id: string) => {
      return state.nodes.find((node) => node.id === id);
    },

    /**
     * 根据 ID 获取连线
     */
    getEdgeById: (state) => (id: string) => {
      return state.edges.find((edge) => edge.id === id);
    },
  },

  actions: {
    /**
     * 设置 Graph 实例
     */
    setGraph(graph: Graph) {
      this.graph = graph;
      this.syncFromGraph();

      // 监听图变化
      graph.on("node:added", () => this.syncFromGraph());
      graph.on("node:removed", () => this.syncFromGraph());
      graph.on("node:changed", () => this.syncFromGraph());
      graph.on("edge:added", () => this.syncFromGraph());
      graph.on("edge:removed", () => this.syncFromGraph());
      graph.on("edge:changed", () => this.syncFromGraph());

      // 监听缩放变化
      graph.on("scale", ({ sx }) => {
        this.zoom = sx;
      });

      // 监听撤销重做状态
      if (graph.getPlugin("history")) {
        graph.on("history:change", () => {
          this.canUndo = graph.canUndo();
          this.canRedo = graph.canRedo();
        });
      }
    },

    /**
     * 从 Graph 同步数据
     */
    syncFromGraph() {
      if (!this.graph) return;

      const cells = this.graph.getCells();
      this.nodes = cells
        .filter((cell) => cell.isNode())
        .map((node) => ({
          id: node.id,
          shape: node.shape,
          x: node.position().x,
          y: node.position().y,
          width: node.size().width,
          height: node.size().height,
          label: node.attr("label/text"),
          data: node.getData(),
          ...node.toJSON(),
        }));

      this.edges = cells
        .filter((cell) => cell.isEdge())
        .map((edge) => ({
          id: edge.id,
          source: edge.getSourceCellId() || "",
          target: edge.getTargetCellId() || "",
          data: edge.getData(),
          ...edge.toJSON(),
        }));
    },

    /**
     * 添加节点
     */
    addNode(nodeData: Partial<NodeData>) {
      if (!this.graph) return;

      const node = this.graph.addNode({
        shape: "rect",
        width: 100,
        height: 60,
        ...nodeData,
      });

      return node;
    },

    /**
     * 删除节点
     */
    removeNode(id: string) {
      if (!this.graph) return;

      const node = this.graph.getCellById(id);
      if (node) {
        this.graph.removeNode(id);
      }
    },

    /**
     * 更新节点
     */
    updateNode(id: string, data: Partial<NodeData>) {
      if (!this.graph) return;

      const node = this.graph.getCellById(id);
      if (node && node.isNode()) {
        if (data.x !== undefined || data.y !== undefined) {
          node.position(data.x || 0, data.y || 0);
        }
        if (data.width !== undefined || data.height !== undefined) {
          node.size(data.width || 100, data.height || 60);
        }
        if (data.label !== undefined) {
          node.attr("label/text", data.label);
        }
        if (data.data !== undefined) {
          node.setData(data.data);
        }
      }
    },

    /**
     * 添加连线
     */
    addEdge(edgeData: Partial<EdgeData>) {
      if (!this.graph) return;

      const edge = this.graph.addEdge({
        ...edgeData,
      });

      return edge;
    },

    /**
     * 删除连线
     */
    removeEdge(id: string) {
      if (!this.graph) return;

      const edge = this.graph.getCellById(id);
      if (edge) {
        this.graph.removeEdge(id);
      }
    },

    /**
     * 更新连线
     */
    updateEdge(id: string, data: Partial<EdgeData>) {
      if (!this.graph) return;

      const edge = this.graph.getCellById(id);
      if (edge && edge.isEdge()) {
        if (data.data !== undefined) {
          edge.setData(data.data);
        }
        if (data.attrs !== undefined) {
          edge.setAttrs(data.attrs);
        }
      }
    },

    /**
     * 清空画布
     */
    clearGraph() {
      if (!this.graph) return;
      this.graph.clearCells();
      this.nodes = [];
      this.edges = [];
    },

    /**
     * 设置缩放
     */
    setZoom(zoom: number) {
      if (!this.graph) return;
      this.graph.scale(zoom, zoom);
      this.zoom = zoom;
    },

    /**
     * 撤销
     */
    undo() {
      if (!this.graph || !this.graph.getPlugin("history")) return;
      this.graph.undo();
    },

    /**
     * 重做
     */
    redo() {
      if (!this.graph || !this.graph.getPlugin("history")) return;
      this.graph.redo();
    },

    /**
     * 导出 JSON
     */
    toJSON() {
      if (!this.graph) return null;
      return this.graph.toJSON();
    },

    /**
     * 从 JSON 加载
     */
    fromJSON(data: any) {
      if (!this.graph) return;
      this.graph.fromJSON(data);
      this.syncFromGraph();
    },
  },
});
