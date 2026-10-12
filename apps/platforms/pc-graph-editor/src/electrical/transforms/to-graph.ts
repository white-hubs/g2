import type { Graph } from "@antv/x6";

import type { ElectricalData, ElectricalNode } from "../types";

/**
 * 业务数据转换为 X6 图数据
 *
 * @param electricalData - 电气数据
 * @returns X6 图数据
 */
// oxlint-disable-next-line max-lines-per-function
/**
 * 根据线损率和条件计算线颜色
 *
 * @param lineLossRate - 线损率 (0-1，小数)
 * @param condition - 条件字符串，例如 '>,0.2321'、'>=,0.3212'
 * @returns 颜色值：满足条件为 #f5222d，否则为 #1890ff
 */
function getLineLossColor(lineLossRate?: number, condition?: string): string {
  var baseColor = "#1890ff";
  if (lineLossRate === undefined || lineLossRate === null) {
    return baseColor;
  }
  if (!condition || typeof condition !== "string") {
    return baseColor;
  }

  var parts = condition.split(",");
  if (parts.length < 2) {
    return baseColor;
  }

  var op = parts[0].trim();
  var threshold = parseFloat(parts[1]);
  if (Number.isNaN(threshold)) {
    return baseColor;
  }

  var value = lineLossRate;
  var matched = false;

  if (op === ">") {
    matched = value > threshold;
  } else if (op === ">=") {
    matched = value >= threshold;
  } else if (op === "<") {
    matched = value < threshold;
  } else if (op === "<=") {
    matched = value <= threshold;
  } else if (op === "==" || op === "=") {
    matched = value === threshold;
  } else if (op === "!=") {
    matched = value !== threshold;
  }

  return matched ? "#f5222d" : baseColor;
}

/**
 * 指向文本标签的边若缺少 port，manhattan 路由与端点更新会不稳定，并可能连带触发节点视图异常。
 * 文本标签 markup 固定使用 text-label-top / text-label-bottom。
 */
function patchEdgeTerminalsForTextLabels(edge: any, textLabelCellIds: Set<string>): any {
  let nextData: Record<string, unknown> = {};
  if (edge?.data !== undefined && edge?.data !== null && typeof edge.data === "object") {
    nextData = { ...(edge.data as Record<string, unknown>) };
  }
  const cloned = { ...edge, data: nextData };
  const fixSource = (src: any): any => {
    if (!src || typeof src !== "object" || src.port) {
      return src;
    }
    const rawId = src.cell;
    const cid = rawId !== undefined && rawId !== null ? String(rawId) : "";
    if (cid.length > 0 && textLabelCellIds.has(cid)) {
      return { ...src, port: "text-label-bottom" };
    }
    return src;
  };
  const fixTarget = (tgt: any): any => {
    if (!tgt || typeof tgt !== "object" || tgt.port) {
      return tgt;
    }
    const rawId = tgt.cell;
    const cid = rawId !== undefined && rawId !== null ? String(rawId) : "";
    if (cid.length > 0 && textLabelCellIds.has(cid)) {
      return { ...tgt, port: "text-label-top" };
    }
    return tgt;
  };
  cloned.source = fixSource(cloned.source);
  cloned.target = fixTarget(cloned.target);
  if (cloned.data && typeof cloned.source === "object" && cloned.source.port) {
    cloned.data.fromPort = cloned.data.fromPort || cloned.source.port;
  }
  if (cloned.data && typeof cloned.target === "object" && cloned.target.port) {
    cloned.data.toPort = cloned.data.toPort || cloned.target.port;
  }
  return cloned;
}

export function transformToGraph(electricalData: ElectricalData): {
  nodes: any[];
  edges: any[];
} {
  const graph = electricalData?.graph;
  const electricalNodes = electricalData?.nodes || [];
  const deviceBindings = electricalData?.deviceBindings || {};
  const rawNodes = graph?.nodes || [];
  const rawEdges = graph?.edges || [];

  const textLabelCellIds = new Set<string>();
  for (const n of rawNodes) {
    const node = n as any;
    const isTl =
      node?.data?.elementId === "text-label" ||
      node?.data?.nodeType === "text-label" ||
      node?.data?.nodeType === "文本标签" ||
      node?.shape === "electrical-text-label";
    if (isTl && node?.id !== undefined && node?.id !== null) {
      textLabelCellIds.add(String(node.id));
    }
  }

  // 转换节点数据（保持完整结构，便于 fromJSON 正确还原）
  // oxlint-disable-next-line max-lines-per-function
  const nodes = rawNodes.map((node: any) => {
    const deviceBinding = node.data?.deviceId && deviceBindings[node.data.deviceId] ? deviceBindings[node.data.deviceId] : null;
    let name = node.data?.nodeName || node.attrs?.label?.textWrap?.text || node.attrs?.label?.text || node.label || "";
    // 文本标签节点：兼容新旧导出数据的多种标识
    let isTextLabelNode =
      node.data?.elementId === "text-label" ||
      node.data?.nodeType === "text-label" ||
      node.data?.nodeType === "文本标签" ||
      node.shape === "electrical-text-label";
    if (isTextLabelNode && (!name || typeof name !== "string")) {
      name = "文本标签";
    }
    let attrs = { ...(node.attrs || {}) };
    // 移除 attrs.text（导出时 setLabel('') 产生的空文本），避免覆盖 label 显示
    if (attrs.text && (attrs.text.text === "" || attrs.text.text === undefined)) {
      delete attrs.text;
    }
    let label = attrs.label || {};
    let textWrap = label.textWrap || {};
    let hasIcon = !!(attrs.icon || node.attrs?.icon);
    let nodeWidth = node.width || node.size?.width || 230;
    let nodeHeight = node.height || node.size?.height || 40;
    if (isTextLabelNode) {
      const textBlock = attrs.text && typeof attrs.text === "object" ? (attrs.text as Record<string, unknown>) : null;
      const inheritFont =
        textBlock && typeof textBlock.fontFamily === "string" && textBlock.fontFamily.length > 0 ? textBlock.fontFamily : undefined;
      if (attrs.text) {
        delete attrs.text;
      }
      if (attrs.rect) {
        delete attrs.rect;
      }
      attrs = {
        ...attrs,
        // 文本标签：暂时隐藏边框和背景色
        // body: {
        //   fill: "#ffffff",
        //   stroke: "#5F95FF",
        //   strokeWidth: 1,
        //   rx: 4,
        //   ry: 4,
        //   ...(attrs.body || {}),
        // },
        body: {
          ...(attrs.body || {}),
          // 暂时隐藏文本标签背景与边框
          // fill: "#ffffff",
          // stroke: "#5F95FF",
          // strokeWidth: 1,
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
          rx: 4,
          ry: 4,
        },
        labelBox: {
          ref: "body",
          refX: 8,
          refY: 4,
          refWidth: -16,
          refHeight: -8,
          fill: "transparent",
          stroke: "transparent",
          ...(attrs.labelBox || {}),
        },
        label: {
          ...label,
          ref: "labelBox",
          refX: "50%",
          refY: "50%",
          fill: label.fill ?? "#333333",
          fontSize: label.fontSize ?? 14,
          lineHeight: label.lineHeight ?? 16,
          fontFamily:
            (typeof label.fontFamily === "string" && label.fontFamily.length > 0 ? label.fontFamily : undefined) ||
            inheritFont ||
            "Arial, helvetica, sans-serif",
          text: name || label.text || "文本标签",
          textAnchor: "middle",
          textVerticalAnchor: "middle",
          textWrap: {
            ...textWrap,
            text: name || textWrap.text || "文本标签",
            width: textWrap.width ?? -2,
            height: textWrap.height ?? -2,
            ellipsis: textWrap.ellipsis ?? false,
            breakWord: textWrap.breakWord ?? true,
          },
        },
      };
      // 勿用 shape:rect + 自定义 markup：内置 rect 视图与 label/textWrap 组合易不绘制文字；改用已注册的 electrical-text-label
      let nextNode: any = {
        ...node,
        shape: "electrical-text-label",
        attrs,
        data: {
          ...(node.data || {}),
          elementId: "text-label",
          nodeType: node.data?.nodeType || "文本标签",
          nodeName: name || "文本标签",
          deviceBinding,
        },
      };
      delete nextNode.label;
      delete nextNode.markup;
      return nextNode;
    }
    // 导入前确保 attrs.label.textWrap.text 有值，fromJSON 后画布才能正确渲染
    if (typeof name === "string" && name) {
      attrs = {
        ...attrs,
        label: {
          ...label,
          textAnchor: label.textAnchor ?? "middle",
          textVerticalAnchor: label.textVerticalAnchor ?? "middle",
          fill: label.fill ?? "#333333",
          fontSize: label.fontSize ?? 14,
          lineHeight: label.lineHeight ?? 16,
          ...(hasIcon
            ? {
                text: name,
                refX: 0,
                refY: 0,
                x: label.x ?? Math.round(44 + (nodeWidth - 52) / 2),
                y: label.y ?? Math.round(nodeHeight / 2),
                style: {
                  ...(label.style || {}),
                  whiteSpace: "pre",
                },
              }
            : {
                ref: label.ref ?? "labelBox",
                refX: label.refX ?? "50%",
                refY: label.refY ?? "50%",
                textWrap: {
                  ...textWrap,
                  text: name,
                  width: textWrap.width ?? -2,
                  height: textWrap.height ?? -2,
                  ellipsis: textWrap.ellipsis ?? false,
                  breakWord: textWrap.breakWord ?? true,
                },
              }),
        },
      };
    }
    // 若节点为 rect 且无 markup 但有 label，补全 markup 确保有 label 元素（X6 rect 默认有 label，但部分导出可能缺失）
    let shape = node.shape || "rect";
    let markup = node.markup;
    if (shape === "rect" && !markup && (attrs.label || node.attrs?.label)) {
      markup = hasIcon
        ? [
            { tagName: "rect", selector: "body" },
            { tagName: "image", selector: "icon" },
            { tagName: "text", selector: "label" },
          ]
        : [
            { tagName: "rect", selector: "body" },
            { tagName: "rect", selector: "labelBox" },
            { tagName: "text", selector: "label" },
          ];
      if (!attrs.labelBox) {
        if (!hasIcon) {
          attrs.labelBox = {
            ref: "body",
            refX: 8,
            refY: 4,
            refWidth: -16,
            refHeight: -8,
            fill: "transparent",
            stroke: "transparent",
          };
          attrs.label = { ...attrs.label, ref: "labelBox" };
        }
      }
    }
    return {
      ...node,
      ...(markup ? { markup } : {}),
      attrs,
      data: {
        ...(node.data || {}),
        deviceBinding,
      },
    };
  });

  const edges = rawEdges.map((edge: any) => {
    const cloned = patchEdgeTerminalsForTextLabels(edge, textLabelCellIds);

    // 仅在边的数据中存在 lineLossRate 时，根据条件计算颜色并展示线损率
    const edgeData = (cloned.data || {}) as {
      from?: string;
      to?: string;
      lineLossRate?: number;
      condition?: string;
    };
    const rawRate = edgeData.lineLossRate;
    const hasLineLossRate = rawRate !== undefined && rawRate !== null;

    // 没有线损率时，线颜色固定为 #1890ff，不展示线损标签
    if (!hasLineLossRate) {
      const fixedColor = "#1890ff";
      const fixedAttrs = {
        ...(cloned.attrs || {}),
        line: {
          ...(((cloned.attrs || {}) as any).line || {}),
          stroke: fixedColor,
        },
      };
      return {
        ...cloned,
        attrs: fixedAttrs,
      };
    }

    const lineLossRate = rawRate as number;
    const lineColor = getLineLossColor(lineLossRate, edgeData.condition);
    const hasLabels = Array.isArray(cloned.labels) && cloned.labels.length > 0;
    const nextAttrs = {
      ...(cloned.attrs || {}),
      line: {
        ...(((cloned.attrs || {}) as any).line || {}),
        stroke: lineColor,
      },
    };

    const nextEdge: any = {
      ...cloned,
      attrs: nextAttrs,
      data: {
        ...edgeData,
        lineLossRate,
      },
    };

    // 如果已有自定义 labels，就只更新颜色，不强行覆盖
    if (!hasLabels) {
      nextEdge.labels = [
        {
          position: 0.5,
          attrs: {
            text: {
              text: `线损: ${(lineLossRate * 100).toFixed(1)}%`,
              fill: lineColor,
              fontSize: 11,
              fontWeight: 500,
            },
            rect: {
              fill: "#ffffff",
              stroke: lineColor,
              strokeWidth: 1,
              rx: 3,
              ry: 3,
              refWidth: "100%",
              refHeight: "100%",
              refX: "-4",
              refY: "-2",
              refWidth2: 8,
              refHeight2: 4,
            },
          },
        },
      ];
    }

    return nextEdge;
  });

  return {
    nodes,
    edges,
  };
}

/**
 * 从电气节点树生成图数据（从上到下的 DAG 布局）
 *
 * 该函数用于从业务定义的节点树结构生成画布图形
 * 布局算法：子节点组的中心点对齐父节点的中心点
 *
 * @param nodes - 电气节点树（支持多根）
 * @param options - 布局选项
 * @returns X6 图数据
 */
/** 将 childrenIds 解析为 children，避免循环引用 */
function resolveChildrenIds(nodes: ElectricalNode[], nodeMap: Map<string, ElectricalNode>): ElectricalNode[] {
  let visited = new Set<string>();
  function resolve(node: ElectricalNode): ElectricalNode {
    if (node.children && node.children.length > 0) return node;
    if (!node.childrenIds || node.childrenIds.length === 0) return node;
    visited.add(node.id);
    let children: ElectricalNode[] = [];
    for (let i = 0; i < node.childrenIds!.length; i++) {
      let c = nodeMap.get(node.childrenIds![i]);
      if (c && !visited.has(c.id)) children.push(resolve(c));
    }
    visited.delete(node.id);
    return { ...node, children };
  }
  let childIds = new Set<string>();
  nodes.forEach((n) => (n.childrenIds || []).forEach((id) => childIds.add(id)));
  let roots = nodes.filter((n) => !childIds.has(n.id));
  let list = roots.length > 0 ? roots : nodes;
  return list.map((n) => resolve(n));
}

export function generateGraphFromNodeTree(
  nodes: ElectricalNode[],
  options: {
    startX?: number;
    startY?: number;
    horizontalGap?: number;
    verticalGap?: number;
    nodeWidth?: number;
    nodeHeight?: number;
  } = {},
): {
  nodes: any[];
  edges: any[];
} {
  const {
    startX = 100,
    startY = 80,
    horizontalGap = 60, // 同级节点之间的水平间距
    verticalGap = 150, // 层级之间的垂直间距
    nodeWidth = 230,
    nodeHeight = 40,
  } = options;

  let nodeMap = new Map(nodes.map((n) => [n.id, n]));
  let treeNodes = resolveChildrenIds(nodes, nodeMap);

  const graphNodes: any[] = [];
  const graphEdges: any[] = [];

  // 存储每个节点的位置信息
  const nodePositions = new Map<string, { x: number; y: number; width: number }>();

  /**
   * 第一遍：计算每个节点子树的宽度
   */
  function calculateSubtreeWidth(node: ElectricalNode): number {
    if (!node.children || node.children.length === 0) {
      return nodeWidth;
    }

    // 子树宽度 = 所有子节点子树宽度之和 + 子节点之间的间距
    const childrenWidths = node.children.map((child) => calculateSubtreeWidth(child));
    const totalChildrenWidth = childrenWidths.reduce((sum, w) => sum + w, 0);
    const gaps = (node.children.length - 1) * horizontalGap;

    return Math.max(nodeWidth, totalChildrenWidth + gaps);
  }

  /**
   * 第二遍：根据子树宽度计算每个节点的位置
   * 子节点组的中心点对齐父节点的中心点
   */
  function calculatePositions(node: ElectricalNode, level: number, centerX: number): void {
    const nodeId = node.id;

    // 计算 y 位置：基于层级从上到下
    const y = startY + level * verticalGap;
    // 节点的 x 位置（左上角）
    const x = centerX - nodeWidth / 2;

    nodePositions.set(nodeId, { x, y, width: nodeWidth });

    // 如果有子节点，计算子节点的位置
    if (node.children && node.children.length > 0) {
      // 计算所有子节点的子树宽度
      const childrenWidths = node.children.map((child) => calculateSubtreeWidth(child));
      const totalWidth = childrenWidths.reduce((sum, w) => sum + w, 0) + (node.children.length - 1) * horizontalGap;

      // 子节点组的起始 x 位置（使子节点组中心对齐父节点中心）
      let currentX = centerX - totalWidth / 2;

      node.children.forEach((child, index) => {
        const childWidth = childrenWidths[index];
        // 子节点的中心 x 位置
        const childCenterX = currentX + childWidth / 2;

        calculatePositions(child, level + 1, childCenterX);

        currentX += childWidth + horizontalGap;
      });
    }
  }

  /**
   * 第三遍：生成图节点和边
   */
  function generateGraphData(node: ElectricalNode, parentId?: string): void {
    const nodeId = node.id;
    const pos = nodePositions.get(nodeId)!;

    // 创建图节点（添加上下连接桩）
    graphNodes.push({
      id: nodeId,
      shape: "rect",
      x: pos.x,
      y: pos.y,
      width: nodeWidth,
      height: nodeHeight,
      label: node.name,
      attrs: {
        body: {
          fill: "#ffffff",
          stroke: "#5F95FF",
          strokeWidth: 1,
          rx: 4,
          ry: 4,
        },
        label: {
          fill: "#333333",
          fontSize: 14,
          textAnchor: "middle",
          textVerticalAnchor: "middle",
        },
      },
      ports: {
        groups: {
          top: {
            position: "top",
            attrs: {
              circle: {
                r: 4,
                magnet: true,
                stroke: "#C2C8D5",
                strokeWidth: 1,
                fill: "#fff",
              },
            },
          },
          bottom: {
            position: "bottom",
            attrs: {
              circle: {
                r: 4,
                magnet: true,
                stroke: "#C2C8D5",
                strokeWidth: 1,
                fill: "#fff",
              },
            },
          },
        },
        items: [
          { id: `${nodeId}-top`, group: "top" },
          { id: `${nodeId}-bottom`, group: "bottom" },
        ],
      },
      data: {
        treeNodeId: node.id,
        nodeType: node.type,
        deviceId: node.deviceId,
        metadata: node.metadata,
        lineLoss: node.lineLoss,
      },
    });

    // 创建连线（如果有父节点）
    if (parentId) {
      var defaultColor = "#1890ff";

      graphEdges.push({
        source: { cell: parentId, port: `${parentId}-bottom` },
        target: { cell: nodeId, port: `${nodeId}-top` },
        shape: "electrical-wire",
        zIndex: 0,
        attrs: {
          line: {
            stroke: defaultColor,
            strokeWidth: 3,
            strokeLinejoin: "round",
            targetMarker: {
              name: "block",
              width: 12,
              height: 8,
            },
          },
        },
        connector: {
          name: "electrical-connector",
        },
        data: {
          from: parentId,
          to: nodeId,
          fromPort: `${parentId}-bottom`,
          toPort: `${nodeId}-top`,
        },
      });
    }

    // 递归处理子节点
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        generateGraphData(child, nodeId);
      });
    }
  }

  // 处理多个根节点
  // 先计算所有根节点的总宽度
  const rootWidths = treeNodes.map((root) => calculateSubtreeWidth(root));
  const totalRootsWidth = rootWidths.reduce((sum, w) => sum + w, 0) + (treeNodes.length - 1) * horizontalGap * 2;

  // 从起始位置开始布局
  let currentRootX = startX + totalRootsWidth / 2;

  // 重新计算：从左边开始
  currentRootX = startX;
  treeNodes.forEach((rootNode, index) => {
    const rootWidth = rootWidths[index];
    const rootCenterX = currentRootX + rootWidth / 2;

    calculatePositions(rootNode, 0, rootCenterX);
    generateGraphData(rootNode);

    currentRootX += rootWidth + horizontalGap * 2; // 根节点之间的间距更大
  });

  return {
    nodes: graphNodes,
    edges: graphEdges,
  };
}

/**
 * 加载电气数据到 Graph 实例
 *
 * @param graph - X6 Graph 实例
 * @param electricalData - 电气数据
 */
export function loadElectricalDataToGraph(graph: Graph, electricalData: ElectricalData): void {
  const { nodes, edges } = transformToGraph(electricalData);

  // 清空当前画布
  graph.clearCells();

  // 加载节点和连线
  graph.fromJSON({ nodes, edges });
}
