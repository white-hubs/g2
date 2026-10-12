import { Edge, Graph } from "@antv/x6";

// 注册电气连接器（必须在定义边之前）
// 参考 X6 官方 DAG 示例的连接器实现
Graph.registerConnector(
  "electrical-connector",
  (sourcePoint, targetPoint) => {
    const vgap = Math.abs(targetPoint.y - sourcePoint.y);

    // 垂直出线的长度
    const verticalOffset = 4;
    // 贝塞尔曲线控制点的垂直偏移（控制曲线的弯曲程度）
    const controlOffset = Math.floor((vgap / 3) * 2);

    // 控制点位置
    const cp1 = { x: sourcePoint.x, y: sourcePoint.y + verticalOffset + controlOffset };
    const cp2 = { x: targetPoint.x, y: targetPoint.y - verticalOffset - controlOffset };

    // 使用 SVG 路径：
    // M: 移动到源点
    // L: 垂直向下一小段
    // C: 三次贝塞尔曲线到目标点上方
    // L: 垂直向下进入目标点
    const pathStr = `
      M ${sourcePoint.x} ${sourcePoint.y}
      L ${sourcePoint.x} ${sourcePoint.y + verticalOffset}
      C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${targetPoint.x} ${targetPoint.y - verticalOffset}
      L ${targetPoint.x} ${targetPoint.y}
    `;

    return pathStr;
  },
  true,
);

/**
 * 导线（电气连线）
 */
export const WireEdge = Edge.define({
  shape: "electrical-wire",
  inherit: "edge",
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
  connector: { name: "electrical-connector" },
});

/**
 * 带箭头的连线
 */
export const ArrowWireEdge = Edge.define({
  shape: "electrical-arrow-wire",
  attrs: {
    line: {
      stroke: "#1890ff",
      strokeWidth: 2,
      strokeLinejoin: "round",
      targetMarker: {
        name: "block",
        size: 8,
      },
    },
  },
  router: {
    name: "manhattan",
  },
  connector: {
    name: "rounded",
    args: {
      radius: 8,
    },
  },
});
