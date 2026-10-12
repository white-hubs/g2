import type { Graph, Node, Edge } from "@antv/x6";

import type { NodeData, EdgeData } from "../types";

/**
 * X6 辅助函数
 */

/**
 * 节点转换为数据格式
 */
export function nodeToData(node: Node): NodeData {
  const position = node.position();
  const size = node.size();

  return {
    id: node.id,
    shape: node.shape,
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    label: node.attr("label/text") as string,
    data: node.getData(),
    ...node.toJSON(),
  };
}

/**
 * 连线转换为数据格式
 */
export function edgeToData(edge: Edge): EdgeData {
  return {
    id: edge.id,
    source: edge.getSourceCellId() || "",
    target: edge.getTargetCellId() || "",
    data: edge.getData(),
    ...edge.toJSON(),
  };
}

/**
 * 获取图的所有节点数据
 */
export function getNodesData(graph: Graph): NodeData[] {
  return graph.getNodes().map((node) => nodeToData(node));
}

/**
 * 获取图的所有连线数据
 */
export function getEdgesData(graph: Graph): EdgeData[] {
  return graph.getEdges().map((edge) => edgeToData(edge));
}

/**
 * 计算节点的边界框
 */
export function getNodesBBox(nodes: Node[]) {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const bbox = node.getBBox();
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.width);
    maxY = Math.max(maxY, bbox.y + bbox.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 对齐节点
 */
export function alignNodes(graph: Graph, nodes: Node[], type: "left" | "center" | "right" | "top" | "middle" | "bottom") {
  if (nodes.length < 2) return;

  const bboxes = nodes.map((node) => node.getBBox());

  switch (type) {
    case "left": {
      const minX = Math.min(...bboxes.map((b) => b.x));
      nodes.forEach((node) => {
        const { y } = node.position();
        node.position(minX, y);
      });
      break;
    }
    case "center": {
      const centerX = (Math.min(...bboxes.map((b) => b.x)) + Math.max(...bboxes.map((b) => b.x + b.width))) / 2;
      nodes.forEach((node) => {
        const { y } = node.position();
        const { width } = node.size();
        node.position(centerX - width / 2, y);
      });
      break;
    }
    case "right": {
      const maxX = Math.max(...bboxes.map((b) => b.x + b.width));
      nodes.forEach((node) => {
        const { y } = node.position();
        const { width } = node.size();
        node.position(maxX - width, y);
      });
      break;
    }
    case "top": {
      const minY = Math.min(...bboxes.map((b) => b.y));
      nodes.forEach((node) => {
        const { x } = node.position();
        node.position(x, minY);
      });
      break;
    }
    case "middle": {
      const centerY = (Math.min(...bboxes.map((b) => b.y)) + Math.max(...bboxes.map((b) => b.y + b.height))) / 2;
      nodes.forEach((node) => {
        const { x } = node.position();
        const { height } = node.size();
        node.position(x, centerY - height / 2);
      });
      break;
    }
    case "bottom": {
      const maxY = Math.max(...bboxes.map((b) => b.y + b.height));
      nodes.forEach((node) => {
        const { x } = node.position();
        const { height } = node.size();
        node.position(x, maxY - height);
      });
      break;
    }
  }
}

/**
 * 分布节点
 */
export function distributeNodes(graph: Graph, nodes: Node[], direction: "horizontal" | "vertical") {
  if (nodes.length < 3) return;

  const sortedNodes = [...nodes].sort((a, b) => {
    const posA = a.position();
    const posB = b.position();
    return direction === "horizontal" ? posA.x - posB.x : posA.y - posB.y;
  });

  const first = sortedNodes[0];
  const last = sortedNodes[sortedNodes.length - 1];

  if (direction === "horizontal") {
    const firstX = first.position().x;
    const lastX = last.position().x + last.size().width;
    const totalGap = lastX - firstX - sortedNodes.reduce((sum, node) => sum + node.size().width, 0);
    const gap = totalGap / (sortedNodes.length - 1);

    let currentX = firstX;
    sortedNodes.forEach((node) => {
      const { y } = node.position();
      node.position(currentX, y);
      currentX += node.size().width + gap;
    });
  } else {
    const firstY = first.position().y;
    const lastY = last.position().y + last.size().height;
    const totalGap = lastY - firstY - sortedNodes.reduce((sum, node) => sum + node.size().height, 0);
    const gap = totalGap / (sortedNodes.length - 1);

    let currentY = firstY;
    sortedNodes.forEach((node) => {
      const { x } = node.position();
      node.position(x, currentY);
      currentY += node.size().height + gap;
    });
  }
}
