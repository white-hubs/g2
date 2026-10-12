import type { Graph } from "@antv/x6";

import type { ElectricalData, ElectricalNode, DeviceBinding } from "../types";

/**
 * X6 图数据转换为业务数据
 *
 * @param graph - X6 Graph 实例
 * @returns 电气数据
 */
export function transformFromGraph(graph: Graph): ElectricalData {
  // 使用 getCells 手动序列化，避免 toJSON 在 Scroller 等插件下格式不一致
  let cellsJSON: any[] = [];
  const cells = (graph as any).getCells?.();
  if (cells && Array.isArray(cells)) {
    cellsJSON = cells.map((c: any) => {
      const json = c.toJSON ? c.toJSON() : c;
      const liveData = c.getData?.() || {};
      const liveAttrs = c.getAttrs?.() || {};
      const liveLabel = (liveAttrs as any).label || {};
      const jsonLabel = json.attrs?.label || {};
      const liveTextWrap = liveLabel.textWrap || {};
      const jsonTextWrap = jsonLabel.textWrap || {};
      const labelText =
        liveData.nodeName ||
        liveTextWrap.text ||
        liveLabel.text ||
        json.data?.nodeName ||
        jsonTextWrap.text ||
        jsonLabel.text ||
        json.label ||
        "";

      return {
        ...json,
        attrs: {
          ...(json.attrs || {}),
          ...liveAttrs,
          label: {
            ...jsonLabel,
            ...liveLabel,
            ...(labelText ? { text: labelText } : {}),
            textWrap: {
              ...jsonTextWrap,
              ...liveTextWrap,
              ...(labelText ? { text: labelText } : {}),
            },
          },
        },
        data: {
          ...(json.data || {}),
          ...liveData,
          ...(labelText ? { nodeName: labelText } : {}),
        },
        ...(labelText ? { label: labelText } : {}),
      };
    });
  } else {
    const graphData = graph.toJSON?.() || {};
    cellsJSON = graphData.cells ?? [];
  }
  const graphData = { cells: cellsJSON };

  // 回填文本到 data.nodeName，避免文本标签导出/导入丢失
  cellsJSON.forEach((cell: any) => {
    if (!cell || !cell.shape || cell.source) {
      return;
    }
    var data = cell.data || {};
    if (typeof data.nodeName === "string" && data.nodeName) {
      return;
    }
    var labelText = cell.attrs?.label?.textWrap?.text || cell.attrs?.label?.text || cell.label || "";
    if (typeof labelText !== "string" || !labelText) {
      return;
    }
    cell.data = { ...data, nodeName: labelText };
  });

  // 提取设备绑定信息
  const deviceBindings: Record<string, DeviceBinding> = {};
  cellsJSON.forEach((cell: any) => {
    if (cell.shape && cell.data?.deviceId && cell.data?.deviceBinding) {
      deviceBindings[cell.data.deviceId] = cell.data.deviceBinding;
    }
  });

  // 重建节点树结构
  const nodes = rebuildNodeTree(graphData);

  return {
    nodes,
    graph: {
      nodes: cellsJSON.filter((c: any) => !c.source),
      edges: cellsJSON.filter((c: any) => c.source),
    },
    deviceBindings,
    metadata: {
      exportTime: new Date().toISOString(),
      version: "1.0",
    },
  };
}

/**
 * 从图数据重建节点树结构
 *
 * @param graphData - X6 图数据
 * @returns 电气节点树（多根）
 */
function rebuildNodeTree(graphData: any): ElectricalNode[] {
  const cells = graphData.cells || [];
  const nodes = cells.filter((c: any) => !c.source);
  const edges = cells.filter((c: any) => c.source);

  const getTerminalCellId = (t: any) => {
    if (!t) return "";
    if (typeof t === "string") return t;
    return t.cell || "";
  };

  // 构建节点映射，用 childrenIds 替代 children，避免图中存在环时 JSON.stringify 报循环引用
  const nodeMap = new Map<string, ElectricalNode & { childrenIds?: string[] }>();
  nodes.forEach((node: any) => {
    const nodeName = node.data?.nodeName || node.label || node.attrs?.label?.textWrap?.text || node.attrs?.label?.text || `节点-${node.id}`;
    nodeMap.set(node.id, {
      id: node.id,
      name: nodeName,
      type: node.data?.nodeType || "device",
      deviceId: node.data?.deviceId,
      metadata: node.data?.metadata || {},
      childrenIds: [],
    });
  });

  edges.forEach((edge: any) => {
    const fromId = edge.data?.from || getTerminalCellId(edge.source) || (edge.source as any);
    const toId = edge.data?.to || getTerminalCellId(edge.target) || (edge.target as any);
    const parent = nodeMap.get(fromId);
    if (parent && nodeMap.has(toId) && !parent.childrenIds!.includes(toId)) {
      parent.childrenIds!.push(toId);
    }
  });

  return Array.from(nodeMap.values());
}

/**
 * 导出电气数据为 JSON
 *
 * @param graph - X6 Graph 实例
 * @returns JSON 字符串
 */
export function exportElectricalDataAsJSON(graph: Graph): string {
  const data = transformFromGraph(graph);
  return JSON.stringify(data, null, 2);
}

/**
 * 从 JSON 导入电气数据
 *
 * @param json - JSON 字符串
 * @returns 电气数据
 */
export function importElectricalDataFromJSON(json: string): ElectricalData {
  try {
    const data = JSON.parse(json);
    return data as ElectricalData;
  } catch (error) {
    throw new Error("Invalid electrical data format");
  }
}
